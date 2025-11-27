import { AuthService } from '@effectify/node-better-auth'
import { Runtime } from '@effectify/react-router'
import * as Layer from 'effect/Layer'
import * as Logger from 'effect/Logger'
import { authOptions } from './better-auth-options.server.js'
import { LivePrismaLayer, PrismaService } from './prisma-effect.js'

const PrismaLayer = Layer.merge(LivePrismaLayer, PrismaService.Default)

// const PrismaLayer = Prisma.Default

const Authlayer = AuthService.layer(authOptions)

const AppLayer = Layer.mergeAll(Authlayer, PrismaLayer).pipe(Layer.provide(Logger.pretty))

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
