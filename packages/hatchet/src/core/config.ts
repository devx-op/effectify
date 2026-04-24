/**
 * @effectify/hatchet - Configuration
 *
 * Hatchet configuration using Effect v4 Config and ServiceMap.Service
 */

import * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"
import * as Layer from "effect/Layer"
import * as Config from "effect/Config"
import * as Schema from "effect/Schema"

/**
 * Configuration schema for Hatchet
 * Uses Schema from the main 'effect' package
 */
const HatchetConfigSchema = Schema.Struct({
  token: Schema.String,
  host: Schema.String,
  namespace: Schema.optional(Schema.String),
})

/**
 * Type extracted from the schema
 */
export type HatchetConfigType = Schema.Schema.Type<typeof HatchetConfigSchema>

/**
 * ServiceMap.Service for Hatchet configuration
 * This allows injecting config via Effect's dependency injection
 */
export class HatchetConfig extends ServiceMap.Service<
  HatchetConfig,
  HatchetConfigType
>()("HatchetConfig") {}

/**
 * Create a Layer that provides the HatchetConfig service
 * from a config object
 */
export const HatchetConfigLayer = (
  config: HatchetConfigType,
): Layer.Layer<HatchetConfig> => Layer.succeed(HatchetConfig, config)

/**
 * Default configuration values
 */
export const defaultHatchetConfig = {
  host: "http://localhost:8080" as const,
}

/**
 * Create a Layer from environment variables
 * Uses Config.Wrap for type-safe environment config
 * and applies default values
 */
export const HatchetConfigLayerFromEnv = (
  config: Config.Wrap<HatchetConfigType>,
): Layer.Layer<HatchetConfig, Config.ConfigError> =>
  Layer.effect(HatchetConfig)(
    Effect.gen(function*() {
      const unwrapped = yield* Config.unwrap(config)
      return {
        host: unwrapped.host ?? defaultHatchetConfig.host,
        token: unwrapped.token,
        namespace: unwrapped.namespace,
      }
    }),
  )
