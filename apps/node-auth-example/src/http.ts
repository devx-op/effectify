import { createServer } from "node:http"
import * as HttpServer from "effect/unstable/http/HttpServer"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { toEffectHandler } from "@effectify/node-better-auth"
import * as Layer from "effect/Layer"
import * as Auth from "./auth.js"
import { pipe } from "effect/Function"

export const Live = pipe(
  HttpServer.serve(toEffectHandler(Auth.auth)),
  Layer.provide(NodeHttpServer.layer(() => createServer(), { port: 3001 })),
)
