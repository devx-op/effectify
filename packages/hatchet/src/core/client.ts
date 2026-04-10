/**
 * @effectify/hatchet - Hatchet Client
 *
 * Hatchet SDK client as a ServiceMap.Service using Effect v4
 */

import * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"
import * as Layer from "effect/Layer"
import { Hatchet as HatchetClientSDK } from "@hatchet-dev/typescript-sdk"
import { HatchetConfig } from "./config.js"

type HatchetClientType = InstanceType<typeof HatchetClientSDK>

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

    console.log("[Hatchet] Initializing with host:", config.host)
    console.log("[Hatchet] Token present:", !!config.token)

    // Initialize Hatchet client with token and host
    // SDK v1.21.0 API: HatchetClient.init({ token, host_port })
    // This is synchronous, so we use Effect.sync
    const hatchet = Effect.sync(() => {
      const client = HatchetClientSDK.init({
        token: config.token,
        host_port: config.host,
      })
      if (!client) {
        throw new Error("Hatchet client initialization returned undefined")
      }
      console.log("[Hatchet] Client initialized successfully!")
      return client
    })

    return yield* hatchet
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
