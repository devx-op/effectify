import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { HatchetDemoRateLimitsSection } from "./hatchet-demo-ratelimits.js"

describe("HatchetDemoRateLimitsSection", () => {
  it("renders the rate-limit form, selected rate-limit details, and the rate-limit list", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoRateLimitsSection, {
        actionError: "Rate limit key is required",
        selectedRateLimitKey: "email:send",
        ratelimits: [
          {
            key: "email:send",
            tenantId: "tenant-1",
            limitValue: 15,
            value: 3,
            window: "1m",
            lastRefill: "2026-04-12T18:45:00.000Z",
          },
        ],
      }),
    )

    expect(markup).toContain("Upsert Rate Limit")
    expect(markup).toContain("Selected Rate Limit")
    expect(markup).toContain("Current Rate Limits")
    expect(markup).toContain("email:send")
    expect(markup).toContain("3 / 15")
    expect(markup).toContain("Rate limit key is required")
    expect(markup).toContain('value="upsert-ratelimit"')
    expect(markup).toContain('value="1 minute"')
  })

  it("renders empty rate-limit states when no rate limits are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoRateLimitsSection, { ratelimits: [] }),
    )

    expect(markup).toContain("Upsert a rate limit to inspect it here.")
    expect(markup).toContain(
      "No rate limits found. Upsert one to see it here.",
    )
  })
})
