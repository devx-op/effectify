import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'

import { MessagesService } from './MessageService.js'
import { NetworkMonitor } from './NetworkMonitorService.js'

export const Live = Layer.mergeAll(NetworkMonitor.Default, MessagesService.Default).pipe(Layer.provide(Logger.pretty))
