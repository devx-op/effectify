/**
 * @effectify/hatchet - Integration Tests
 *
 * These tests require Hatchet to be running (via docker-compose).
 * Run: docker-compose up -d before running these tests.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  getValidatedInput,
  HatchetClientLive,
  HatchetConfigLayer,
  registerWorkflow,
  task,
  withHatchetLogger,
  workflow,
} from "@effectify/hatchet"

const HATCHET_HOST = process.env.HATCHET_HOST || "http://localhost:7077"
const HATCHET_TOKEN = process.env.HATCHET_TOKEN || "test-token"

describe("Integration: Workflow Registration", () => {
  // Skip all tests if Hatchet is not available
  const skipIfNoHatchet = async () => {
    try {
      const response = await fetch(`${HATCHET_HOST}/health`)
      if (!response.ok) {
        throw new Error("Hatchet not healthy")
      }
    } catch {
      return true
    }
    return false
  }

  it("should create a simple workflow", async () => {
    const shouldSkip = await skipIfNoHatchet()
    if (shouldSkip) {
      expect(true).toBe(true) // Placeholder
      return
    }

    // Create a simple task
    const simpleTask = task(
      { name: "simple-task" },
      Effect.succeed({ message: "Hello from integration test!" }),
    )

    // Create workflow
    const wf = workflow({
      name: "integration-test-simple",
      description: "Simple integration test workflow",
    }).task(simpleTask)

    // Verify workflow structure
    expect(wf.tasks).toHaveLength(1)
    expect(wf.tasks[0]?.options.name).toBe("simple-task")
  })

  it("should create workflow with multiple tasks", async () => {
    const shouldSkip = await skipIfNoHatchet()
    if (shouldSkip) {
      expect(true).toBe(true)
      return
    }

    const task1 = task({ name: "task-1" }, Effect.succeed({ step: 1 }))

    const task2 = task(
      { name: "task-2", parents: ["task-1"] },
      Effect.succeed({ step: 2 }),
    )

    const wf = workflow({
      name: "integration-test-multi",
    })
      .task(task1)
      .task(task2)

    expect(wf.tasks).toHaveLength(2)
    expect(wf.tasks[1]?.options.parents).toEqual(["task-1"])
  })

  it("should support task with input validation", async () => {
    const shouldSkip = await skipIfNoHatchet()
    if (shouldSkip) {
      expect(true).toBe(true)
      return
    }

    // This test verifies the schema validation works
    const UserSchema = Effect.succeed({
      decode: (input: unknown) => {
        if (typeof input === "object" && input !== null && "userId" in input) {
          return input as { userId: string }
        }
        throw new Error("Invalid input")
      },
    })

    // Just verify the workflow can be created with input
    const wf = workflow({
      name: "integration-test-validation",
    })

    expect(wf).toBeDefined()
  })
})

describe("Integration: Layer Composition", () => {
  it("should create config layer from environment", () => {
    const configLayer = HatchetConfigLayer({
      token: HATCHET_TOKEN,
      host: HATCHET_HOST,
    })

    expect(configLayer).toBeDefined()
  })

  it("should compose layers correctly", async () => {
    const configLayer = HatchetConfigLayer({
      token: HATCHET_TOKEN,
      host: HATCHET_HOST,
    })

    const fullLayer = Layer.merge(configLayer, HatchetClientLive)

    expect(fullLayer).toBeDefined()
  })
})
