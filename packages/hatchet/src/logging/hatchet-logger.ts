/**
 * @effectify/hatchet - Hatchet Logger
 *
 * Custom Effect Logger that automatically syncs logs to Hatchet UI.
 * When Effect.log() is called inside a Hatchet task, logs appear in Hatchet dashboard.
 */

import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import * as ServiceMap from "effect/ServiceMap"
import { HatchetStepContext } from "../core/context.js"

/**
 * Creates a Hatchet-aware logger that:
 * - If inside a Hatchet task: forwards logs to Hatchet UI via ctx.log()
 * - Otherwise: behaves as the default console logger
 */
export const makeHatchetLogger = (): Logger.Logger<unknown, void> =>
  Logger.make(({ logLevel, message, fiber }) => {
    const msg = typeof message === "string" ? message : String(message)
    const formatted = `[${String(logLevel)}] ${msg}`

    const hatchetCtx = ServiceMap.getOption(fiber.services, HatchetStepContext)

    if (Option.isSome(hatchetCtx)) {
      try {
        hatchetCtx.value.log(formatted)
      } catch {
        console.log(formatted)
      }
      return
    }

    console.log(formatted)
  })

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
  const {
    format = (level, msg) => `[${level}] ${msg}`,
    console: shouldConsole = true,
  } = options

  return Logger.make(({ logLevel, message, fiber }) => {
    const msg = typeof message === "string" ? message : String(message)
    const formatted = format(String(logLevel), msg)

    const hatchetCtx = ServiceMap.getOption(fiber.services, HatchetStepContext)

    if (Option.isSome(hatchetCtx)) {
      try {
        hatchetCtx.value.log(formatted)
      } catch {
        if (shouldConsole) {
          console.log(formatted)
        }
      }
      return
    }

    if (shouldConsole) {
      console.log(formatted)
    }
  })
}
