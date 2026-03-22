import "dotenv/config"
import { Runtime } from "@effectify/react-router"
import { AuthService } from "@effectify/node-better-auth"
import * as Layer from "effect/Layer"
import { authOptions } from "./better-auth-options.server.js"
import { Prisma } from "./../../prisma/generated/effect/index.js"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const Authlayer = AuthService.AuthServiceContext.layer(authOptions)

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const AppLayer = Layer.mergeAll(
  Authlayer,
  Prisma.layer({
    // Prisma Client options
    adapter,
    log: ["query", "info", "warn", "error"],
  }),
)

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
