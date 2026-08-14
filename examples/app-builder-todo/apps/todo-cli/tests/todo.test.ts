import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { createTestRuntime } from "../src/index.js"

it.effect("runs deterministic Todo behavior", () => Effect.gen(function* () {
  const todo = yield* createTestRuntime({ ids: ["todo-1"], now: "2026-01-01T00:00:00.000Z" })
  expect(yield* todo.list()).toEqual([])
  expect((yield* todo.add("write tests")).id).toBe("todo-1")
}))
