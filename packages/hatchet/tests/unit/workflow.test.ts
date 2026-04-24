/**
 * @effectify/hatchet - Workflow Tests
 */

import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { createMockContext, task, testTask, testTaskExit, workflow } from "@effectify/hatchet"

describe("workflow", () => {
  it("should create a workflow with options", () => {
    const wf = workflow({ name: "test-workflow" })
    expect(wf.options.name).toBe("test-workflow")
  })

  it("should create a workflow with description", () => {
    const wf = workflow({
      name: "test-workflow",
      description: "A test workflow",
    })
    expect(wf.options.name).toBe("test-workflow")
    expect(wf.options.description).toBe("A test workflow")
  })

  it("should create a workflow with version", () => {
    const wf = workflow({
      name: "test-workflow",
      version: "1.0.0",
    })
    expect(wf.options.version).toBe("1.0.0")
  })

  it("should add tasks using task() function", () => {
    const myTask = task({ name: "task-1" }, Effect.succeed({ result: "ok" }))

    const wf = workflow({ name: "test" }).task(myTask)

    expect(wf.tasks).toHaveLength(1)
    expect(wf.tasks[0]?.options.name).toBe("task-1")
  })

  it("should add tasks directly with options and effect", () => {
    const wf = workflow({ name: "test" }).task(
      { name: "task-1" },
      Effect.succeed({ result: "ok" }),
    )

    expect(wf.tasks).toHaveLength(1)
  })

  it("should chain multiple tasks", () => {
    const wf = workflow({ name: "test" })
      .task({ name: "task-1" }, Effect.succeed(1))
      .task({ name: "task-2" }, Effect.succeed(2))

    expect(wf.tasks).toHaveLength(2)
    expect(wf.tasks[0]?.options.name).toBe("task-1")
    expect(wf.tasks[1]?.options.name).toBe("task-2")
  })

  it("should support parents for DAG dependencies", () => {
    const wf = workflow({ name: "test" })
      .task({ name: "task-1" }, Effect.succeed(1))
      .task({ name: "task-2", parents: ["task-1"] }, Effect.succeed(2))

    expect(wf.tasks[1]?.options.parents).toEqual(["task-1"])
  })

  it("should support task timeout", () => {
    const wf = workflow({ name: "test" }).task(
      { name: "task-1", timeout: "30s" },
      Effect.succeed({ result: "ok" }),
    )

    expect(wf.tasks[0]?.options.timeout).toBe("30s")
  })

  it("should support task retries", () => {
    const wf = workflow({ name: "test" }).task(
      { name: "task-1", retries: 3 },
      Effect.succeed({ result: "ok" }),
    )

    expect(wf.tasks[0]?.options.retries).toBe(3)
  })
})

describe("task()", () => {
  it("should create a task definition", () => {
    const taskDef = task({ name: "my-task" }, Effect.succeed({ data: "test" }))

    expect(taskDef.options.name).toBe("my-task")
  })

  it("should preserve effect in task definition", () => {
    const taskDef = task({ name: "my-task" }, Effect.succeed({ data: "test" }))

    expect(taskDef.effect).toBeDefined()
  })
})

describe("with mock context", () => {
  it("should create mock context with default values", () => {
    const ctx = createMockContext()
    expect(ctx.taskName()).toBe("test-task")
    expect(ctx.workflowName()).toBe("test-workflow")
  })

  it("should create mock context with custom input", () => {
    const ctx = createMockContext({
      input: { userId: "123" },
    })
    expect(ctx.input).toEqual({ userId: "123" })
  })

  it("should run effect with mock context", async () => {
    const effect = Effect.succeed("hello")
    const result = await testTask(effect)
    expect(result).toBe("hello")
  })

  it("should handle failures in testTaskExit", async () => {
    const effect = Effect.fail(new Error("test error"))
    const exit = await testTaskExit(effect)

    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure") {
      expect(exit.cause).toBeDefined()
    }
  })

  it("should provide custom mock context", async () => {
    const effect = Effect.succeed("custom")
    const result = await testTask(
      effect,
      createMockContext({ input: "custom" }),
    )
    expect(result).toBe("custom")
  })
})
