import "dotenv/config"
import { Hatchet } from "@effectify/hatchet"
import { AuthService } from "@effectify/node-better-auth"
import { Runtime } from "@effectify/react-router"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Prisma } from "./../../prisma/generated/effect/index.js"
import { authOptionsConfig } from "./better-auth-options.server.js"
import { greetingTask } from "./hatchet/greeting-task.server.js"

const authLayer = authOptionsConfig.pipe(Effect.map(AuthService.AuthServiceContext.layer), Layer.unwrap)

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const prismaLayer = Prisma.layer({
  adapter,
  log: ["query", "info", "warn", "error"],
})

const hatchetLayer = Hatchet.layer({ tasks: [greetingTask] })

export const AppLayer = Layer.mergeAll(authLayer, prismaLayer, hatchetLayer)

export const { withLoaderEffect, withActionEffect } = Runtime.make(AppLayer)
