import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { HatchetDemoObservabilitySection } from "./hatchet-demo-observability.js"

describe("HatchetDemoObservabilitySection", () => {
  it("renders selected run logs and tenant metrics", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoObservabilitySection, {
        observability: {
          selectedRunId: "run-123",
          selectedTaskId: "task-123",
          run: { id: "run-123", workflowName: "orders.process" },
          status: "RUNNING",
          logs: {
            rows: [
              {
                message: "started",
                level: "INFO",
                timestamp: "2026-04-11T17:00:00.000Z",
                taskId: "task-123",
              },
            ],
          },
          taskMetrics: {
            byStatus: {
              PENDING: 1,
              RUNNING: 2,
              COMPLETED: 3,
              FAILED: 4,
              CANCELLED: 5,
            },
          },
          queueMetrics: {
            total: { queued: 2, running: 1, pending: 0 },
            workflowBreakdown: {
              orders: { queued: 2, running: 1, pending: 0 },
            },
            stepRun: { email: 1 },
          },
        },
      }),
    )

    expect(markup).toContain("Observability")
    expect(markup).toContain("run-123")
    expect(markup).toContain("task-123")
    expect(markup).toContain("started")
    expect(markup).toContain("RUNNING")
    expect(markup).toContain("orders")
    expect(markup).toContain("email")
  })

  it("renders graceful empty and error states", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoObservabilitySection, {
        observability: {
          taskMetrics: {
            byStatus: {
              PENDING: 0,
              RUNNING: 0,
              COMPLETED: 0,
              FAILED: 0,
              CANCELLED: 0,
            },
          },
          queueMetrics: {
            total: { queued: 0, running: 0, pending: 0 },
            workflowBreakdown: {},
            stepRun: {},
          },
          error: "Task logs are temporarily unavailable",
        },
      }),
    )

    expect(markup).toContain("Select a run")
    expect(markup).toContain("Task logs are temporarily unavailable")
    expect(markup).toContain("No recent logs")
  })
})
