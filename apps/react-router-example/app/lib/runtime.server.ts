import "dotenv/config"
import { Runtime } from "@effectify/react-router"
import { AuthService } from "@effectify/node-better-auth"
import * as Layer from "effect/Layer"
import { HatchetClientLive, HatchetConfig } from "@effectify/hatchet"
import { authOptions } from "./better-auth-options.server.js"
import { Prisma } from "./../../prisma/generated/effect/index.js"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const Authlayer = AuthService.AuthServiceContext.layer(authOptions)

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const HatchetConfigLayer = Layer.succeed(HatchetConfig, {
  host: process.env.HATCHET_HOST ?? "localhost:7077",
  token: process.env.HATCHET_TOKEN ?? "",
  namespace: process.env.HATCHET_NAMESPACE,
})

const BaseAppLayer = Layer.mergeAll(
  Authlayer,
  Prisma.layer({
    // Prisma Client options
    adapter,
    log: ["query", "info", "warn", "error"],
  }),
)

const AppLayer = Layer.mergeAll(
  Layer.merge(BaseAppLayer, HatchetConfigLayer),
  HatchetClientLive,
) as unknown as Layer.Layer<any, any, never>

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
