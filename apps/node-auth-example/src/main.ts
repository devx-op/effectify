// Setear BETTER_AUTH_URL temprano
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3001"

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Layer from "effect/Layer"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Http from "./http.js"

// Provide config provider
const appLayer = Http.Live.pipe(
  Layer.provide(ConfigProvider.layerAdd(ConfigProvider.fromEnv())),
)

NodeRuntime.runMain(Layer.launch(appLayer))
