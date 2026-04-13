import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const useActionDataMock = vi.hoisted(() => vi.fn())

vi.mock("react-router", () => ({
  Form: ({ children, ...props }: React.ComponentProps<"form">) => React.createElement("form", props, children),
  useActionData: () => useActionDataMock(),
}))

import HatchetDemo from "./hatchet-demo.js"

describe("HatchetDemo route component", () => {
  it("renders the successful demo state with action errors and recent runs", () => {
    useActionDataMock.mockReturnValue({
      ok: false,
      errors: ["Action failed"],
    })

    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemo, {
        loaderData: {
          ok: true,
          data: {
            event: {
              eventId: "event-123",
              key: "user.created",
              scope: "demo",
              payload: { source: "filters" },
            },
            runs: [
              {
                id: "run-1",
                workflowName: "workflow-alpha",
                status: "RUNNING",
              },
              {
                id: "run-2",
                workflowName: "workflow-beta",
                status: "COMPLETED",
              },
            ],
            filters: [],
            schedules: [],
            crons: [],
            webhooks: [],
            ratelimits: [],
            observability: {
              selectedRunId: undefined,
              selectedTaskId: undefined,
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
            },
          },
        },
      } as never),
    )

    expect(markup).toContain("Hatchet Workflow Demo")
    expect(markup).toContain("Action failed")
    expect(markup).toContain("Selected Event")
    expect(markup).toContain("event-123")
    expect(markup).toContain("Recent Runs")
    expect(markup).toContain("Workflow Management")
    expect(markup).toContain("workflow-alpha")
    expect(markup).toContain('href="/hatchet-demo?runId=run-1"')
    expect(markup).toContain('value="replay"')
    expect(markup).toContain('value="delete-workflow"')
    expect(markup).toContain("Cancel run run-1")
    expect(markup).not.toContain("Cancel run run-2")
  })

  it("renders the loading state when loader data is not ready", () => {
    useActionDataMock.mockReturnValue(undefined)

    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemo, {
        loaderData: {
          ok: false,
        },
      } as never),
    )

    expect(markup).toContain("Loading...")
  })
})
