import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"

import { MessagesService } from "./message-service.js"
import { NetworkMonitor } from "./network-monitor-service.js"

export const Live = Layer.mergeAll(NetworkMonitor.Default, MessagesService.Default).pipe(Layer.provide(Logger.pretty))
