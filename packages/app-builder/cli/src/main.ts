import { readFile } from "node:fs/promises"
import * as Effect from "effect/Effect"
import {
  type CliCommand,
  type CliFailure,
  type CliRequest,
  type CliTerminal,
  decodeCliRequest,
  HostError,
  InputError,
  isCliCommand,
} from "./protocol.js"
import { commandDispatcher, type CommandDispatcher } from "./commands.js"

export interface CliRuntime {
  readonly readFile: (path: string) => Effect.Effect<string, unknown>
  readonly readStdin: () => Effect.Effect<string, unknown>
  readonly writeStderr: (value: string) => Effect.Effect<void, unknown>
  readonly writeStdout: (value: string) => Effect.Effect<void, unknown>
}

interface Invocation {
  readonly command: CliCommand
  readonly events: boolean
  readonly inputPath: string | undefined
}

const isSafePathSegment = (segment: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment) && segment !== "." && segment !== ".."

const isSafeInputPath = (path: string): boolean => path.endsWith(".json") && path.split("/").every(isSafePathSegment)

const parseInvocation = (args: ReadonlyArray<string>): Effect.Effect<Invocation, InputError> => {
  const [command, ...options] = args
  if (command === undefined || !isCliCommand(command)) {
    return Effect.fail(new InputError({ reason: "command must be one of the declared protocol commands" }))
  }

  let events = false
  let inputPath: string | undefined
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]
    if (option === "--events=jsonl" && !events) {
      events = true
      continue
    }
    if (option === "--input" && inputPath === undefined) {
      const path = options[index + 1]
      if (path === undefined || !isSafeInputPath(path)) {
        return Effect.fail(new InputError({ reason: "--input must name a safe relative .json file" }))
      }
      inputPath = path
      index += 1
      continue
    }
    return Effect.fail(new InputError({ reason: "unsupported command option or positional argument" }))
  }
  return Effect.succeed({ command, events, inputPath })
}

const parseJson = (value: string): Effect.Effect<unknown, InputError> =>
  Effect.try({
    try: () => JSON.parse(value),
    catch: () => new InputError({ reason: "input must be canonical JSON" }),
  })

const exitCode = (failure: CliFailure): number => (failure._tag === "InputError" ? 2 : 7)

const terminalEnvelope = (terminal: CliTerminal | { readonly _tag: "Failure"; readonly error: CliFailure }) => ({
  version: "effectify.app-builder-cli-terminal/1",
  terminal,
})

const writeTerminal = (
  runtime: CliRuntime,
  terminal: CliTerminal | { readonly _tag: "Failure"; readonly error: CliFailure },
) =>
  runtime
    .writeStdout(`${JSON.stringify(terminalEnvelope(terminal))}\n`)
    .pipe(Effect.mapError(() => new HostError({ reason: "unable to write stdout" })))

const writeFailure = (runtime: CliRuntime, failure: CliFailure) =>
  runtime.writeStderr(`${failure._tag === "InputError" ? "input" : "host"}: ${failure.reason}\n`).pipe(
    Effect.mapError(() => new HostError({ reason: "unable to write stderr" })),
    Effect.andThen(() => writeTerminal(runtime, { _tag: "Failure", error: failure })),
  )

const decodeInvocation = (
  args: ReadonlyArray<string>,
  runtime: CliRuntime,
): Effect.Effect<{ readonly events: boolean; readonly request: CliRequest }, CliFailure> =>
  Effect.gen(function* () {
    const invocation = yield* parseInvocation(args)
    const stdin = yield* runtime
      .readStdin()
      .pipe(Effect.mapError(() => new HostError({ reason: "unable to read stdin" })))
    if (invocation.inputPath !== undefined && stdin.trim().length > 0) {
      return yield* Effect.fail(new InputError({ reason: "stdin and --input are mutually exclusive" }))
    }
    if (invocation.inputPath === undefined && stdin.trim().length === 0) {
      return yield* Effect.fail(new InputError({ reason: "provide exactly one stdin or --input source" }))
    }
    const source =
      invocation.inputPath === undefined
        ? stdin
        : yield* runtime
            .readFile(invocation.inputPath)
            .pipe(Effect.mapError(() => new HostError({ reason: "unable to read --input file" })))
    const request = yield* decodeCliRequest(yield* parseJson(source))
    if (request.command !== invocation.command) {
      return yield* Effect.fail(new InputError({ reason: "request command must match the positional command" }))
    }
    return { events: invocation.events, request }
  })

/** Runs the finite CLI protocol through an explicit runtime, keeping stdout and stderr separate. */
export const runCliWithDispatcher = (
  args: ReadonlyArray<string>,
  runtime: CliRuntime,
  dispatcher: CommandDispatcher,
): Effect.Effect<number, CliFailure> =>
  decodeInvocation(args, runtime).pipe(
    Effect.flatMap(({ events, request }) =>
      Effect.gen(function* () {
        if (events) {
          yield* runtime
            .writeStdout(
              `${JSON.stringify({ version: "effectify.app-builder-cli-event/1", _tag: "Event", command: request.command, event: "accepted" })}\n`,
            )
            .pipe(Effect.mapError(() => new HostError({ reason: "unable to write stdout" })))
        }
        const terminal = yield* dispatcher.dispatch(request)
        yield* writeTerminal(runtime, terminal)
        return 0
      }),
    ),
    Effect.catchIf(
      () => true,
      (failure) => writeFailure(runtime, failure).pipe(Effect.as(exitCode(failure))),
    ),
  )

export const runCli = (args: ReadonlyArray<string>, runtime: CliRuntime): Effect.Effect<number, CliFailure> =>
  runCliWithDispatcher(args, runtime, commandDispatcher)

const readNodeStdin = (): Promise<string> =>
  new Promise((resolve, reject) => {
    let input = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk: string) => {
      input += chunk
    })
    process.stdin.once("end", () => resolve(input))
    process.stdin.once("error", reject)
  })

/** Node entry boundary for a real stdin or explicit-file protocol invocation. */
export const runNodeCli = (args: ReadonlyArray<string> = process.argv.slice(2)): Promise<number> =>
  Effect.runPromise(
    runCli(args, {
      readFile: (path) => Effect.tryPromise({ try: () => readFile(path, "utf8"), catch: () => new Error("read file") }),
      readStdin: () => Effect.tryPromise({ try: readNodeStdin, catch: () => new Error("read stdin") }),
      writeStderr: (value) => Effect.sync(() => void process.stderr.write(value)),
      writeStdout: (value) => Effect.sync(() => void process.stdout.write(value)),
    }),
  ).then((code) => {
    process.exitCode = code
    return code
  })
