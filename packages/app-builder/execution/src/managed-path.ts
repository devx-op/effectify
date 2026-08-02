import { Buffer } from "node:buffer"
import { isAbsolute, relative, resolve, sep } from "node:path"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

export type ManagedEntryType = "directory" | "file" | "symlink" | "other"

export interface ManagedEntry {
  readonly type: ManagedEntryType
  readonly device: number
  readonly mode: number
}

export interface ManagedPath {
  readonly absolute: string
  readonly relative: string
}

export interface RunLayout {
  readonly workspace: string
  readonly root: string
  readonly runDirectory: ManagedPath
  readonly journalDirectory: ManagedPath
  readonly snapshot: ManagedPath
}

export interface DraftLayout {
  readonly workspace: string
  readonly root: string
  readonly draftDirectory: ManagedPath
  readonly draft: ManagedPath
}

export class ManagedPathPolicyViolation extends Schema.TaggedErrorClass<ManagedPathPolicyViolation>()(
  "ManagedPathPolicyViolation",
  {
    reason: Schema.Literals([
      "InvalidIdentifier",
      "Traversal",
      "UnsafeSegment",
      "SymbolicLink",
      "NonDirectoryAncestor",
      "CrossDevice",
      "InsecurePermissions",
    ]),
  },
) {}

export type ManagedPathFailure = ManagedPathPolicyViolation

type IdentifierKind = "r1" | "d1"

const failure = (reason: ManagedPathPolicyViolation["reason"]): ManagedPathPolicyViolation =>
  new ManagedPathPolicyViolation({ reason })

const fail = (reason: ManagedPathPolicyViolation["reason"]): Result.Result<never, ManagedPathFailure> =>
  Result.fail(failure(reason))

const isSafeSegment = (segment: string): boolean =>
  segment.length > 0 &&
  segment !== "." &&
  segment !== ".." &&
  !isAbsolute(segment) &&
  !segment.includes("/") &&
  !segment.includes("\\") &&
  !segment.includes(sep)

/** Encode an identifier as one path segment; callers never concatenate untrusted IDs into paths. */
export const encodeIdentifier = (kind: IdentifierKind, identifier: string): string =>
  `${kind}-${Buffer.from(identifier, "utf8").toString("base64url")}`

/** Decode only a canonical base64url segment with its expected namespace prefix. */
export const decodeIdentifier = (kind: IdentifierKind, encoded: string): Result.Result<string, ManagedPathFailure> => {
  const prefix = `${kind}-`
  if (!encoded.startsWith(prefix)) return fail("InvalidIdentifier")
  const payload = encoded.slice(prefix.length)
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) return fail("InvalidIdentifier")
  const decoded = Buffer.from(payload, "base64url").toString("utf8")
  return decoded.length > 0 && encodeIdentifier(kind, decoded) === encoded
    ? Result.succeed(decoded)
    : fail("InvalidIdentifier")
}

/** Resolve already-validated path segments and prove the result stays below its managed root. */
export const resolveManagedPath = (
  root: string,
  segments: ReadonlyArray<string>,
): Result.Result<ManagedPath, ManagedPathFailure> => {
  for (const segment of segments) {
    if (segment === "..") return fail("Traversal")
    if (!isSafeSegment(segment)) return fail("UnsafeSegment")
  }
  const absoluteRoot = resolve(root)
  const absolute = resolve(absoluteRoot, ...segments)
  const pathRelative = relative(absoluteRoot, absolute)
  return pathRelative.length === 0 || pathRelative === ".." || pathRelative.startsWith(`..${sep}`)
    ? fail("Traversal")
    : Result.succeed(Object.freeze({ absolute, relative: pathRelative }))
}

/** Derive the fixed v1 run layout using a canonical, encoded run identity. */
export const runLayout = (workspace: string, runIdentifier: string): Result.Result<RunLayout, ManagedPathFailure> => {
  const resolvedWorkspace = resolve(workspace)
  const root = resolve(resolvedWorkspace, ".effectify", "app-builder", "v1")
  const run = encodeIdentifier("r1", runIdentifier)
  return Result.all({
    runDirectory: resolveManagedPath(root, ["runs", run]),
    journalDirectory: resolveManagedPath(root, ["runs", run, "journal"]),
    snapshot: resolveManagedPath(root, ["runs", run, "snapshot.json"]),
  }).pipe(Result.map((paths) => Object.freeze({ workspace: resolvedWorkspace, root, ...paths })))
}

/** Derive the fixed v1 draft layout using a canonical, encoded contracts-owned draft identifier. */
export const draftLayout = (workspace: string, draftId: string): Result.Result<DraftLayout, ManagedPathFailure> => {
  const resolvedWorkspace = resolve(workspace)
  const root = resolve(resolvedWorkspace, ".effectify", "app-builder", "v1")
  const draft = encodeIdentifier("d1", draftId)
  return Result.all({
    draftDirectory: resolveManagedPath(root, ["drafts", draft]),
    draft: resolveManagedPath(root, ["drafts", draft, "draft.json"]),
  }).pipe(Result.map((paths) => Object.freeze({ workspace: resolvedWorkspace, root, ...paths })))
}

const assertEntry = (
  entry: ManagedEntry,
  expectedType: "directory" | "file",
  expectedDevice: number,
): Result.Result<ManagedEntry, ManagedPathFailure> => {
  if (entry.type === "symlink") return fail("SymbolicLink")
  if (entry.type !== expectedType) return fail("NonDirectoryAncestor")
  if (entry.device !== expectedDevice) return fail("CrossDevice")
  return (entry.mode & 0o077) === 0 ? Result.succeed(entry) : fail("InsecurePermissions")
}

/** Require a directory that cannot be followed, crossed to another device, or read by peers. */
export const assertPrivateDirectory = (
  entry: ManagedEntry,
  expectedDevice: number,
): Result.Result<ManagedEntry, ManagedPathFailure> => assertEntry(entry, "directory", expectedDevice)

/** Require a regular managed file that remains owner-private on the managed device. */
export const assertPrivateFile = (
  entry: ManagedEntry,
  expectedDevice: number,
): Result.Result<ManagedEntry, ManagedPathFailure> => assertEntry(entry, "file", expectedDevice)
