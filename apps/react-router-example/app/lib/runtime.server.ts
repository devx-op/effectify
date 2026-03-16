import "dotenv/config"
import { Runtime } from "@effectify/react-router"
import { AuthService } from "@effectify/node-better-auth"
import * as Layer from "effect/Layer"
import { authOptions } from "./better-auth-options.server.js"

const Authlayer = AuthService.AuthServiceContext.layer(authOptions)

const AppLayer = Layer.mergeAll(Authlayer)

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
