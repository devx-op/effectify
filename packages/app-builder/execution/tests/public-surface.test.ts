import { expect, it } from "@effect/vitest"
import * as Execution from "../src/index.js"

it("exports only the four lifecycle namespaces from its package root", () => {
  expect(Object.keys(Execution).sort()).toEqual([
    "AutomaticPolicy",
    "LifecycleFailure",
    "RunLifecycle",
    "TransitionEvidence",
  ])
})

it("does not leak internal leaf exports through its root barrel", () => {
  expect(Execution).not.toHaveProperty("reduce")
  expect(Execution).not.toHaveProperty("LifecycleSnapshot")
})
