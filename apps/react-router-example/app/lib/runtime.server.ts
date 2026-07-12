import "dotenv/config"
import { AuthService } from "@effectify/node-better-auth"
import { Runtime } from "@effectify/react-router"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import * as Layer from "effect/Layer"
import { Prisma } from "./../../prisma/generated/effect/index.js"
import { authOptions } from "./better-auth-options.server.js"

const authLayer = AuthService.AuthServiceContext.layer(authOptions)

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const prismaLayer = Prisma.layer({
  adapter,
  log: ["query", "info", "warn", "error"],
})

export const AppLayer = Layer.mergeAll(authLayer, prismaLayer)

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
