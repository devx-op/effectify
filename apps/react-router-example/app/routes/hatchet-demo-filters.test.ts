import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { HatchetDemoFiltersSection } from "./hatchet-demo-filters.js"

describe("HatchetDemoFiltersSection", () => {
  it("renders the filter form, selected filter details, and filters list", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoFiltersSection, {
        actionError: "Workflow ID is required",
        filter: {
          filterId: "filter-123",
          tenantId: "tenant-1",
          workflowId: "workflow-1",
          scope: "tenant:demo",
          expression: "input.kind == 'demo'",
          payload: { feature: "filters" },
          isDeclarative: true,
        },
        filters: [
          {
            filterId: "filter-123",
            tenantId: "tenant-1",
            workflowId: "workflow-1",
            scope: "tenant:demo",
            expression: "input.kind == 'demo'",
            payload: { feature: "filters" },
          },
        ],
      }),
    )

    expect(markup).toContain("Create Filter")
    expect(markup).toContain("Selected Filter")
    expect(markup).toContain("Current Filters")
    expect(markup).toContain("workflow-1")
    expect(markup).toContain("tenant:demo")
    expect(markup).toContain("Workflow ID is required")
    expect(markup).toContain('value="create-filter"')
    expect(markup).toContain('value="delete-filter"')
  })

  it("renders empty filter states when no filters are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoFiltersSection, { filters: [] }),
    )

    expect(markup).toContain("Create a filter to inspect it here.")
    expect(markup).toContain("No filters found. Create one to see it here.")
  })
})
