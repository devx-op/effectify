/**
 * @effectify/hatchet - Hatchet Logger
 *
 * Custom Effect Logger that automatically syncs logs to Hatchet UI.
 * When Effect.log() is called inside a Hatchet task, logs appear in Hatchet dashboard.
 */

import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import { HatchetStepContext } from "../core/context.js"

const defaultFormat = (level: string, message: string): string => `[${level}] ${message}`

const stringifyMessage = (message: unknown): string => typeof message === "string" ? message : String(message)

const makeConsoleFallback = (
  format: (level: string, message: string) => string,
): Logger.Logger<unknown, void> =>
  Logger.withConsoleLog(
    Logger.make(({ logLevel, message }) => format(String(logLevel), stringifyMessage(message))),
  )

const makeConfiguredHatchetLogger = (
  format: (level: string, message: string) => string,
  shouldConsole: boolean,
): Logger.Logger<unknown, void> => {
  const fallback = makeConsoleFallback(format)

  return Logger.make((options) => {
    const formatted = format(
      String(options.logLevel),
      stringifyMessage(options.message),
    )

    const hatchetCtx = Context.getOption(options.fiber.context, HatchetStepContext)

    if (Option.isSome(hatchetCtx)) {
      try {
        hatchetCtx.value.log(formatted)
      } catch {
        if (shouldConsole) {
          fallback.log(options)
        }
      }
      return
    }

    if (shouldConsole) {
      fallback.log(options)
    }
  })
}

/**
 * Creates a Hatchet-aware logger that:
 * - If inside a Hatchet task: forwards logs to Hatchet UI via ctx.log()
 * - Otherwise: behaves as the default console logger
 */
export const makeHatchetLogger = (): Logger.Logger<unknown, void> => makeConfiguredHatchetLogger(defaultFormat, true)

/**
 * Default Hatchet logger instance
 */
export const HatchetLogger: Logger.Logger<unknown, void> = makeHatchetLogger()

/**
 * Runs an Effect with the Hatchet logger enabled.
 *
 * @example
 * ```typescript
 * const result = await Effect.runPromise(
 *   withHatchetLogger(
 *     Effect.gen(function*() {
 *       yield* Effect.log("Hello from Effect!") // Appears in Hatchet UI
 *     })
 *   )
 * )
 * ```
 */
export const withHatchetLogger = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.withLogger(effect, HatchetLogger)

/**
 * Creates a custom Hatchet logger with additional options.
 */
export const createHatchetLogger = (
  options: {
    /**
     * Custom format for log messages
     */
    format?: (level: string, message: string) => string
    /**
     * Whether to also log to console (default: true)
     */
    console?: boolean
  } = {},
): Logger.Logger<unknown, void> => {
  const { format = defaultFormat, console: shouldConsole = true } = options

  return makeConfiguredHatchetLogger(format, shouldConsole)
}
