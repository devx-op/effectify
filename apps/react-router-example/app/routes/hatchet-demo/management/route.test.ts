import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("react-router", () => ({
  Form: ({ children, ...props }: React.ComponentProps<"form">) => React.createElement("form", props, children),
  useActionData: () => undefined,
  useLoaderData: () => undefined,
}))

import { HatchetDemoManagementSection } from "./route.js"

describe("HatchetDemoManagementSection", () => {
  it("renders delete workflow controls with the selected run context", () => {
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
    expect(markup).toContain("Delete Workflow")
    expect(markup).toContain("orders.process")
    expect(markup).toContain("run-123")
    expect(markup).toContain("Workflow name is required")
    expect(markup).toContain('value="delete-workflow"')
    expect(markup).toContain("Runs &amp; Events slice")
  })

  it("renders empty states when no run is selected and no runs are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoManagementSection, {
        runs: [],
      }),
    )

    expect(markup).toContain(
      "Select a run to prefill the workflow deletion form.",
    )
    expect(markup).toContain("No workflow runs available yet.")
  })
})
