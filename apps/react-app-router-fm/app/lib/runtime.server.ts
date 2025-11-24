import { Runtime } from '@effectify/react-router'
import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import { AuthService } from './auth.server.js'

const layers = AuthService.Default.pipe(Layer.provideMerge(Logger.pretty))

export const { withLoaderEffect, withActionEffect } = Runtime.make(layers)
