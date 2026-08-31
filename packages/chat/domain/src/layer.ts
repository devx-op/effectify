import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { MessagesServiceLive, NetworkMonitorLive } from "./message-service.js"

export const Live = MessagesServiceLive.pipe(
  Layer.provideMerge(NetworkMonitorLive),
  Layer.provide(Logger.layer([Logger.consolePretty()])),
)
