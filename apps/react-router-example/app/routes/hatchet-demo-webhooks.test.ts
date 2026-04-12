import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { HatchetDemoWebhooksSection } from "./hatchet-demo-webhooks.js"

describe("HatchetDemoWebhooksSection", () => {
  it("renders the webhook form, selected webhook details, and webhook list", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoWebhooksSection, {
        actionError: "Webhook name is required",
        webhook: {
          webhookId: "webhook-123",
          tenantId: "tenant-1",
          name: "github-prs",
          sourceName: "GITHUB",
          eventKeyExpression: "body.action",
          scopeExpression: "body.repository.full_name",
          staticPayload: { issue: "opened" },
          authType: "HMAC",
        },
        webhooks: [
          {
            webhookId: "webhook-123",
            tenantId: "tenant-1",
            name: "github-prs",
            sourceName: "GITHUB",
            eventKeyExpression: "body.action",
            authType: "HMAC",
          },
        ],
      }),
    )

    expect(markup).toContain("Create Webhook")
    expect(markup).toContain("Selected Webhook")
    expect(markup).toContain("Incoming Webhooks")
    expect(markup).toContain("github-prs")
    expect(markup).toContain("GITHUB")
    expect(markup).toContain("Webhook name is required")
    expect(markup).toContain('value="create-webhook"')
    expect(markup).toContain('value="delete-webhook"')
  })

  it("renders empty webhook states when no webhooks are available", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HatchetDemoWebhooksSection, { webhooks: [] }),
    )

    expect(markup).toContain("Create a webhook to inspect it here.")
    expect(markup).toContain("No webhooks found. Create one to see it here.")
  })
})
