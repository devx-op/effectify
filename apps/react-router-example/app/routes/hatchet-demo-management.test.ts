import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { HatchetDemoManagementSection } from "./hatchet-demo-management.js"

describe("HatchetDemoManagementSection", () => {
  it("renders replay and delete workflow controls with the selected run context", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoManagementSection, {
        actionError: "Workflow name is required",
        selectedRunId: "run-123",
        runs: [
          {
            id: "run-123",
            workflowName: "orders.process",
            status: "FAILED",
          },
        ],
      }),
    )

    expect(markup).toContain("Workflow Management")
    expect(markup).toContain("Replay Run")
    expect(markup).toContain("Delete Workflow")
    expect(markup).toContain("orders.process")
    expect(markup).toContain("run-123")
    expect(markup).toContain("Workflow name is required")
    expect(markup).toContain('value="replay"')
    expect(markup).toContain('value="delete-workflow"')
  })

  it("renders empty states when no run is selected and no runs are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoManagementSection, {
        runs: [],
      }),
    )

    expect(markup).toContain(
      "Select a run from Recent Runs to replay it here.",
    )
    expect(markup).toContain("No workflow runs available yet.")
  })
})
