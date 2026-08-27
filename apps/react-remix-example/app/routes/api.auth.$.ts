import { withActionEffect, withLoaderEffect } from "../lib/runtime.server.js"
import { betterAuthAction, betterAuthLoader } from "../lib/react-router7-better-auth.server.js"

export const loader = betterAuthLoader.pipe(withLoaderEffect)
export const action = betterAuthAction.pipe(withActionEffect)
