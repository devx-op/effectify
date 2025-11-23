import { Runtime } from '@effectify/react-router'
import * as Layer from 'effect/Layer'
import { AuthService } from './auth.server.js'

const layers = Layer.mergeAll(AuthService.Default)

export const { withLoaderEffect, withActionEffect } = Runtime.make(layers)
