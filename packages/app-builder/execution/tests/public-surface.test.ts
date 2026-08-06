import { expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import * as Execution from "../src/index.js"

it("exports exclusive lock and resolved executor capabilities only as explicit namespaces from its package root", () => {
  expect(Object.keys(Execution).sort()).toEqual([
    "AutomaticPolicy",
    "Cleanup",
    "DraftStore",
    "DurableFileSystem",
    "LifecycleFailure",
    "LockRecoveryAuthority",
    "ManagedPath",
    "PersistenceFormat",
    "Recovery",
    "RunExecutor",
    "RunLifecycle",
    "RunStore",
    "TransitionEvidence",
    "WorkspaceLock",
  ])
})

it("does not leak internal leaf exports through its root barrel", () => {
  expect(Execution).not.toHaveProperty("reduce")
  expect(Execution).not.toHaveProperty("LifecycleSnapshot")
  expect(Execution).not.toHaveProperty("encodeJournal")
  expect(Execution).not.toHaveProperty("recover")
  expect(Execution).not.toHaveProperty("cleanupClosed")
  expect(Execution).not.toHaveProperty("persist")
  expect(Execution).not.toHaveProperty("ToolProcess")
  expect(Execution).not.toHaveProperty("Ownership")
})

it("documents durable storage and recovery as non-executable package namespaces", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8")

  expect(readme).toContain("`PersistenceFormat`")
  expect(readme).toContain("`DraftStore`")
  expect(readme).toContain("`RunStore`")
  expect(readme).toContain("`Recovery`")
  expect(readme).toContain("`Cleanup`")
  expect(readme).toContain("`WorkspaceLock`")
  expect(readme).toContain("`LockRecoveryAuthority`")
  expect(readme).toContain("`RunExecutor`")
  expect(readme).toMatch(/does not.*execute/i)
  expect(readme).toMatch(/does not.*lock/i)
  expect(readme).toMatch(/does not.*CLI/i)
})

it("documents Git-ignored managed state and rollback preservation semantics", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8")

  expect(readme).toContain("`/.effectify/`")
  expect(readme).toMatch(/preserve.*state bytes/i)
  expect(readme).toMatch(/remove.*ignore rule/i)
})
