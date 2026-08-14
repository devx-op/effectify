import { expect, it } from "vitest"
import * as Schema from "effect/Schema"
import { Todo } from "../src/index.js"

it("decodes a Todo schema", () => {
  expect(Schema.is(Todo)({ completed: false, createdAt: "2026-01-01T00:00:00.000Z", id: "todo-1", text: "write tests" })).toBe(true)
})
