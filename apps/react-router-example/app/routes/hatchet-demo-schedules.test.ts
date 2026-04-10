import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { HatchetDemoSchedulesSection } from "./hatchet-demo-schedules.js"

describe("HatchetDemoSchedulesSection", () => {
  it("renders the schedule form, selected schedule details, and schedule list", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoSchedulesSection, {
        actionError: "Trigger time must be a valid ISO date",
        schedule: {
          scheduleId: "schedule-123",
          workflowName: "users.notify",
          triggerAt: new Date("2026-04-12T18:45:00.000Z"),
          input: { userId: "user-123" },
        },
        schedules: [
          {
            scheduleId: "schedule-123",
            workflowName: "users.notify",
            triggerAt: new Date("2026-04-12T18:45:00.000Z"),
            input: { userId: "user-123" },
          },
        ],
      }),
    )

    expect(markup).toContain("Create Schedule")
    expect(markup).toContain("Selected Schedule")
    expect(markup).toContain("Scheduled Runs")
    expect(markup).toContain("schedule-123")
    expect(markup).toContain("users.notify")
    expect(markup).toContain("Trigger time must be a valid ISO date")
    expect(markup).toContain('name="intent"')
    expect(markup).toContain('value="schedule"')
  })

  it("renders empty schedule states when no schedules are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoSchedulesSection, { schedules: [] }),
    )

    expect(markup).toContain("Create a schedule to inspect it here.")
    expect(markup).toContain("No schedules found. Create one to see it here.")
  })
})
