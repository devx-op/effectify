import { Hatchet } from "@effectify/hatchet"
import { ActionArgsContext } from "@effectify/react-router"
import { withBetterAuthGuardAction } from "@effectify/react-router-better-auth"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { greetingInput, greetingTask } from "../lib/hatchet/greeting-task.server.js"
import { withActionEffect } from "../lib/runtime.server.js"

const invalidRequest = () =>
  Response.json(
    { ok: false, errors: ["Request body must contain a non-empty name"] },
    { status: 400 },
  )

const decodeInput = (request: Request) =>
  Effect.tryPromise({
    try: async (): Promise<unknown> => request.json(),
    catch: invalidRequest,
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(greetingInput)),
    Effect.mapError(invalidRequest),
  )

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  if (request.method !== "POST") {
    return yield* Effect.fail(
      Response.json(
        { ok: false, errors: ["Only POST is supported"] },
        { status: 405 },
      ),
    )
  }
  const input = yield* decodeInput(request)
  const output = yield* Hatchet.run(greetingTask, input)
  return Response.json(output)
}).pipe(
  withBetterAuthGuardAction.with({ redirectOnFail: "/login" }),
  withActionEffect,
)
