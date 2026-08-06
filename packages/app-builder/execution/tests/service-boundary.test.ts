import { expect, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Schema from "effect/Schema"
import { RunLifecycle } from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:service", version }
const planRef = { id: "plan:service", version }
const protocolRef = { id: "protocol:service", version }
const contracts = { planRef, protocolRef }

const input = () => ({
  snapshot: Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Draft",
    runRef,
    contracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  }),
  request: Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "Validate",
    requestId: "request:service",
    expectedRevision: 0,
    cause: "service validation",
    facts: [],
    secrets: [],
    contracts,
  }),
  priorResults: [],
})

it.effect("lifts the pure reducer through its stateless service", () =>
  Effect.gen(function* () {
    const service = yield* RunLifecycle.Service
    const result = yield* service.transition(input())

    expect(result).toMatchObject({ _tag: "Applied", snapshot: { _tag: "Validated", revision: 1 } })
  }).pipe(Effect.provide(RunLifecycle.layer)),
)

it.effect("preserves interruption at the service boundary without a cleanup result", () =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(
      Effect.gen(function* () {
        yield* Effect.interrupt
        const service = yield* RunLifecycle.Service
        return yield* service.transition(input())
      }).pipe(Effect.provide(RunLifecycle.layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) expect(Cause.hasInterruptsOnly(exit.cause)).toBe(true)
  }),
)
