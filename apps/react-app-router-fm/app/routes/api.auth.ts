import { withActionEffect, withLoaderEffect } from '../lib/runtime.server.js'
import { betterAuthLoader, betterAuthAction } from '@effectify/react-router-better-auth'

export const loader = betterAuthLoader.pipe(withLoaderEffect)
export const action = betterAuthAction.pipe(withActionEffect)