import "dotenv/config"
import { AuthService } from "@effectify/node-better-auth"
import { Runtime } from "@effectify/react-router"
import { Prisma } from "@prisma/effect/index.js"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { authOptions } from "./better-auth-options.server.js"
import { adapter } from "./prisma.js"

const PrismaLayer = Prisma.layer({ adapter })

const Authlayer = AuthService.layer(authOptions)

const AppLayer = Layer.mergeAll(Authlayer, PrismaLayer).pipe(Layer.provide(Logger.pretty))

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
