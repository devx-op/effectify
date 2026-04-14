import "dotenv/config"
import { HatchetClientLive, HatchetConfigLayer, type HatchetConfigType } from "@effectify/hatchet"
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

export const BaseAppLayer = Layer.mergeAll(
  authLayer,
  prismaLayer,
)

const hatchetConfig = {
  host: process.env.HATCHET_HOST ?? "localhost:7077",
  token: process.env.HATCHET_TOKEN ?? "",
  namespace: process.env.HATCHET_NAMESPACE,
} satisfies HatchetConfigType

const hatchetConfigLayer = HatchetConfigLayer(hatchetConfig)

const hatchetClientLayer = HatchetClientLive.pipe(Layer.provide(hatchetConfigLayer))

const hatchetServicesLayer = Layer.merge(
  hatchetConfigLayer,
  hatchetClientLayer,
)

export const AppLayer = Layer.merge(
  BaseAppLayer,
  hatchetServicesLayer,
)

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
