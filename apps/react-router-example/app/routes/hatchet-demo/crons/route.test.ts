import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("react-router", () => ({
  Form: ({ children, ...props }: React.ComponentProps<"form">) => React.createElement("form", props, children),
  useActionData: () => undefined,
  useLoaderData: () => undefined,
}))

import { HatchetDemoCronsSection } from "./route.js"

describe("HatchetDemoCronsSection", () => {
  it("renders the cron form, selected cron details, and cron list", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoCronsSection, {
        actionError: "Cron expression is required",
        cron: {
          cronId: "cron-123",
          workflowName: "users.notify",
          cron: "0 0 * * *",
          name: "nightly-users",
          input: { userId: "user-123" },
          enabled: true,
          method: "API",
        },
        crons: [
          {
            cronId: "cron-123",
            workflowName: "users.notify",
            cron: "0 0 * * *",
            name: "nightly-users",
            input: { userId: "user-123" },
            enabled: true,
            method: "API",
          },
        ],
      }),
    )

    expect(markup).toContain("Create Cron")
    expect(markup).toContain("Selected Cron")
    expect(markup).toContain("Cron Workflows")
    expect(markup).toContain("cron-123")
    expect(markup).toContain("nightly-users")
    expect(markup).toContain("Cron expression is required")
    expect(markup).toContain('name="intent"')
    expect(markup).toContain('value="create-cron"')
    expect(markup).toContain('value="delete-cron"')
  })

  it("renders empty cron states when no crons are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoCronsSection, { crons: [] }),
    )

    expect(markup).toContain("Create a cron to inspect it here.")
    expect(markup).toContain("No crons found. Create one to see it here.")
  })
})
