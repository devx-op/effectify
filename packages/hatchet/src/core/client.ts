/**
 * @effectify/hatchet - Hatchet Client
 *
 * Hatchet SDK client as a ServiceMap.Service using Effect v4
 */

import * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"
import * as Layer from "effect/Layer"
import type { HatchetClient as HatchetClientType } from "@hatchet-dev/typescript-sdk"
import { HatchetClient as HatchetClientSDK } from "@hatchet-dev/typescript-sdk"
import { HatchetConfig } from "./config.js"
import { HatchetInitError } from "./error.js"

/**
 * ServiceMap.Service for the Hatchet SDK client
 * Renamed to HatchetClientService to avoid conflict with SDK class name
 */
export class HatchetClientService extends ServiceMap.Service<
  HatchetClientService,
  HatchetClientType
>()("HatchetClient") {}

/**
 * Create a Layer that provides the HatchetClientService
 * The client is initialized from HatchetConfig
 */
export const HatchetClientLive = Layer.effect(HatchetClientService)(
  Effect.gen(function*() {
    const config = yield* HatchetConfig

    // Initialize Hatchet client with token and host
    // SDK v1.19.0 API: HatchetClient.init({ token, host_port })
    const hatchet = HatchetClientSDK.init({
      token: config.token,
      host_port: config.host,
    })

    if (!hatchet) {
      return yield* HatchetInitError.of(
        "Hatchet client initialization returned undefined",
      )
    }

    return hatchet
  }),
)

/**
 * Convenience function to get the Hatchet client from context
 * Usage: yield* getHatchetClient()
 */
export const getHatchetClient = (): Effect.Effect<
  HatchetClientType,
  never,
  HatchetClientService
> => Effect.service(HatchetClientService)
