import { AuthService } from '@effectify/node-better-auth'
import { Runtime } from '@effectify/react-router'
import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import { authOptions } from './better-auth-options.server.js'

const layer = AuthService.layer(authOptions).pipe(Layer.provideMerge(Logger.pretty))

export const { withLoaderEffect, withActionEffect } = Runtime.make(layer)
