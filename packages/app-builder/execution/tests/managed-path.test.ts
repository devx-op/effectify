import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as ManagedPath from "../src/managed-path.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const success = <Value>(result: Result.Result<Value, unknown>): Value =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })

const expectFailure = (result: Result.Result<unknown, unknown>, reason: string) =>
  expect(result).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ManagedPathPolicyViolation", reason },
  })

it("round-trips UTF-8 identifiers through a canonical base64url path segment", () => {
  const identifier = "run:α/with spaces"
  const encoded = ManagedPath.encodeIdentifier("r1", identifier)
  const decoded = success(ManagedPath.decodeIdentifier("r1", encoded))
  const path = success(ManagedPath.resolveManagedPath("/workspace", ["runs", encoded, "journal"]))

  expect(encoded).toMatch(/^r1-[A-Za-z0-9_-]+$/)
  expect(decoded).toBe(identifier)
  expect(path.relative).toBe(`runs/${encoded}/journal`)
  expect(path.absolute).toBe(`/workspace/${path.relative}`)
})

it("rejects traversal, separators, and malformed encoded identifiers before resolving a managed path", () => {
  const encoded = ManagedPath.encodeIdentifier("r1", "run:trusted")

  expectFailure(ManagedPath.resolveManagedPath("/workspace", ["runs", "..", encoded]), "Traversal")
  expectFailure(ManagedPath.resolveManagedPath("/workspace", ["runs", "child/escape"]), "UnsafeSegment")
  expectFailure(ManagedPath.decodeIdentifier("r1", "r1-not/base64url"), "InvalidIdentifier")
  expectFailure(ManagedPath.decodeIdentifier("r1", "d1-d3Jvbmc"), "InvalidIdentifier")
})

it("fails closed for links, non-directories, device changes, and group or world readable entries", () => {
  const privateDirectory = { type: "directory", device: 7, mode: 0o700 } as const
  const privateFile = { type: "file", device: 7, mode: 0o600 } as const

  expect(success(ManagedPath.assertPrivateDirectory(privateDirectory, 7))).toEqual(privateDirectory)
  expect(success(ManagedPath.assertPrivateFile(privateFile, 7))).toEqual(privateFile)
  expectFailure(ManagedPath.assertPrivateDirectory({ ...privateDirectory, type: "symlink" }, 7), "SymbolicLink")
  expectFailure(ManagedPath.assertPrivateDirectory({ ...privateDirectory, type: "file" }, 7), "NonDirectoryAncestor")
  expectFailure(ManagedPath.assertPrivateDirectory({ ...privateDirectory, device: 8 }, 7), "CrossDevice")
  expectFailure(ManagedPath.assertPrivateDirectory({ ...privateDirectory, mode: 0o750 }, 7), "InsecurePermissions")
  expectFailure(ManagedPath.assertPrivateFile({ ...privateFile, mode: 0o640 }, 7), "InsecurePermissions")
})

it.effect("fails before creating managed state when any required durability capability is unavailable", () =>
  Effect.gen(function* () {
    const capabilities = ["privateAccessControl", "noReplacePublish", "fileSync", "directorySync"] as const
    const outcomes = yield* Effect.forEach(capabilities, (capability) =>
      Effect.gen(function* () {
        const fake = yield* makeFakeDurableFileSystem({ capabilities: { [capability]: false } })
        const outcome = yield* Effect.result(
          DurableFileSystem.prepareRunJournalDirectory(fake.fileSystem, "/workspace", "run:unsupported"),
        )
        return { capability, outcome }
      }),
    )

    expect(outcomes).toHaveLength(4)
    for (const { capability, outcome } of outcomes) {
      expect(outcome).toMatchObject({
        _tag: "Failure",
        failure: { _tag: "UnsupportedDurability", capability },
      })
    }
  }),
)
