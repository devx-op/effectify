import { isAbsolute, relative, resolve, sep } from "node:path"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

export interface ChildExit {
  readonly code: number | null
  readonly signal?: string
}

/** Internal-only child handle. The public executor callback never receives this type. */
export interface ChildProcess {
  readonly requestStop: Effect.Effect<void, ToolProcessFailure>
  readonly awaitExit: Effect.Effect<ChildExit, ToolProcessFailure>
  readonly forceTerminate?: Effect.Effect<void, ToolProcessFailure>
}

export class ToolProcessFailure extends Schema.TaggedErrorClass<ToolProcessFailure>()("ToolProcessFailure", {
  operation: Schema.Literals(["forceTerminate", "requestStop", "wait"]),
}) {}

export class UnsafeToolProcessInput extends Schema.TaggedErrorClass<UnsafeToolProcessInput>()(
  "UnsafeToolProcessInput",
  { reason: Schema.Literals(["EmptyArgv", "ShellExecution", "UnsafeCwd", "UnsafeEnvironment"]) },
) {}

export interface SpawnInput {
  readonly workspace: string
  readonly argv: ReadonlyArray<string>
  readonly cwd: string
  /** Explicit values only; this boundary never inherits an ambient process environment. */
  readonly environment: Readonly<Record<string, string>>
}

export type SpawnValidation =
  | { readonly _tag: "Valid" }
  | { readonly _tag: "Invalid"; readonly reason: UnsafeToolProcessInput["reason"] }

const safeCwd = (workspace: string, cwd: string): boolean => {
  if (!isAbsolute(workspace) || !isAbsolute(cwd)) return false
  const root = resolve(workspace)
  const target = resolve(cwd)
  const pathRelative = relative(root, target)
  return pathRelative.length === 0 || (pathRelative !== ".." && !pathRelative.startsWith(`..${sep}`))
}

/** Validate an argv-only spawn description without invoking a shell or inheriting ambient environment state. */
export const validateSpawn = (input: SpawnInput): SpawnValidation => {
  if (!safeCwd(input.workspace, input.cwd)) return { _tag: "Invalid", reason: "UnsafeCwd" }
  if (input.argv.length === 0 || input.argv.some((part) => part.length === 0 || part.includes("\u0000"))) {
    return { _tag: "Invalid", reason: "EmptyArgv" }
  }
  if (
    ["sh", "bash", "zsh", "cmd", "powershell", "pwsh"].includes(input.argv[0]!) &&
    input.argv.slice(1).some((part) => ["-c", "/c", "-Command"].includes(part))
  ) {
    return { _tag: "Invalid", reason: "ShellExecution" }
  }
  if (
    Object.entries(input.environment).some(
      ([key, value]) => key.length === 0 || key.includes("\u0000") || value.includes("\u0000"),
    )
  ) {
    return { _tag: "Invalid", reason: "UnsafeEnvironment" }
  }
  return { _tag: "Valid" }
}

export interface ToolProcessService {
  readonly active: () => Effect.Effect<Option.Option<ChildProcess>, ToolProcessFailure>
}

export class Service extends Context.Service<Service, ToolProcessService>()(
  "@effectify/app-builder-execution/ToolProcess",
) {}

export const none = { active: () => Effect.succeed(Option.none()) } satisfies ToolProcessService

export const layer = Layer.succeed(Service, Service.of(none))
