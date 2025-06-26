import { Layer, Logger } from 'effect'

import { MessagesService } from './MessageService.js'
import { NetworkMonitor } from './NetworkMonitorService.js'

export const LiveLayer = Layer.mergeAll(NetworkMonitor.Default, MessagesService.Default).pipe(
  Layer.provide(Logger.pretty),
)
