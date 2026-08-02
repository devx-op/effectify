import { expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import * as Execution from "../src/index.js"

it("exports durable storage, recovery, and cleanup only as explicit namespaces from its package root", () => {
  expect(Object.keys(Execution).sort()).toEqual([
    "AutomaticPolicy",
    "Cleanup",
    "DraftStore",
    "DurableFileSystem",
    "LifecycleFailure",
    "ManagedPath",
    "PersistenceFormat",
    "Recovery",
    "RunLifecycle",
    "RunStore",
    "TransitionEvidence",
  ])
})

it("does not leak internal leaf exports through its root barrel", () => {
  expect(Execution).not.toHaveProperty("reduce")
  expect(Execution).not.toHaveProperty("LifecycleSnapshot")
  expect(Execution).not.toHaveProperty("encodeJournal")
  expect(Execution).not.toHaveProperty("recover")
  expect(Execution).not.toHaveProperty("cleanupClosed")
  expect(Execution).not.toHaveProperty("persist")
})

it("documents durable storage and recovery as non-executable package namespaces", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8")

  expect(readme).toContain("`PersistenceFormat`")
  expect(readme).toContain("`DraftStore`")
  expect(readme).toContain("`RunStore`")
  expect(readme).toContain("`Recovery`")
  expect(readme).toContain("`Cleanup`")
  expect(readme).toMatch(/does not.*execute/i)
  expect(readme).toMatch(/does not.*lock/i)
})

it("documents Git-ignored managed state and rollback preservation semantics", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8")

  expect(readme).toContain("`/.effectify/`")
  expect(readme).toMatch(/preserve.*state bytes/i)
  expect(readme).toMatch(/remove.*ignore rule/i)
})
