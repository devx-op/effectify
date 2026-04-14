import { describe, expect, it } from "vitest"
import { redirectLegacyHatchetDemoRequest } from "../../../../app/lib/hatchet/legacy.js"
import {
  parseDeleteWorkflowIntent,
  parseEventPayload,
  parseRateLimitDuration,
  parseReplayIntent,
  parseTriggerTime,
  parseWebhookAuth,
  parseWebhookStaticPayload,
} from "../../../../app/lib/hatchet/parsers.js"
import {
  readSelectedCronId,
  readSelectedEventId,
  readSelectedFilterId,
  readSelectedRateLimitKey,
  readSelectedRunId,
  readSelectedScheduleId,
  readSelectedTaskId,
  readSelectedWebhookName,
} from "../../../../app/lib/hatchet/params.js"
import {
  buildCronRedirect,
  buildEventRedirect,
  buildFilterRedirect,
  buildRateLimitRedirect,
  buildReplayRedirect,
  buildRunRedirect,
  buildScheduleRedirect,
  buildWebhookRedirect,
} from "../../../../app/lib/hatchet/redirects.js"

describe("hatchet demo shared helpers", () => {
  it("redirects legacy deep links to child routes with precedence and original query params", () => {
    expect(
      redirectLegacyHatchetDemoRequest(
        new Request(
          "https://example.com/hatchet-demo?taskId=task-1&runId=run-1&foo=bar",
        ),
      ),
    ).toBe("/hatchet-demo/observability?taskId=task-1&runId=run-1&foo=bar")

    expect(
      redirectLegacyHatchetDemoRequest(
        new Request("https://example.com/hatchet-demo?eventId=event-1"),
      ),
    ).toBe("/hatchet-demo/runs?eventId=event-1")

    expect(
      redirectLegacyHatchetDemoRequest(
        new Request("https://example.com/hatchet-demo/runs?eventId=event-1"),
      ),
    ).toBeUndefined()
  })

  it("reads selected ids from child route URLs and builds child route redirects", () => {
    expect(
      readSelectedEventId(
        "https://example.com/hatchet-demo/runs?eventId=event-1",
      ),
    ).toBe("event-1")
    expect(
      readSelectedRunId("https://example.com/hatchet-demo/runs?runId=run-1"),
    ).toBe("run-1")
    expect(
      readSelectedScheduleId(
        "https://example.com/hatchet-demo/schedules?scheduleId=schedule-1",
      ),
    ).toBe("schedule-1")
    expect(
      readSelectedCronId(
        "https://example.com/hatchet-demo/crons?cronId=cron-1",
      ),
    ).toBe("cron-1")
    expect(
      readSelectedFilterId(
        "https://example.com/hatchet-demo/filters?filterId=filter-1",
      ),
    ).toBe("filter-1")
    expect(
      readSelectedWebhookName(
        "https://example.com/hatchet-demo/webhooks?webhookName=github-prs",
      ),
    ).toBe("github-prs")
    expect(
      readSelectedRateLimitKey(
        "https://example.com/hatchet-demo/rate-limits?rateLimitKey=email%3Asend",
      ),
    ).toBe("email:send")
    expect(
      readSelectedTaskId(
        "https://example.com/hatchet-demo/observability?taskId=task-1",
      ),
    ).toBe("task-1")

    expect(buildEventRedirect("event id/1")).toBe(
      "/hatchet-demo/runs?eventId=event%20id%2F1",
    )
    expect(buildRunRedirect("run id/1")).toBe(
      "/hatchet-demo/runs?runId=run%20id%2F1",
    )
    expect(buildReplayRedirect("run id/1")).toBe(
      "/hatchet-demo/runs?runId=run%20id%2F1",
    )
    expect(buildScheduleRedirect("schedule id/1")).toBe(
      "/hatchet-demo/schedules?scheduleId=schedule%20id%2F1",
    )
    expect(buildCronRedirect("cron id/1")).toBe(
      "/hatchet-demo/crons?cronId=cron%20id%2F1",
    )
    expect(buildFilterRedirect("filter id/1")).toBe(
      "/hatchet-demo/filters?filterId=filter%20id%2F1",
    )
    expect(buildWebhookRedirect("github/prs")).toBe(
      "/hatchet-demo/webhooks?webhookName=github%2Fprs",
    )
    expect(buildRateLimitRedirect("email:send")).toBe(
      "/hatchet-demo/rate-limits?rateLimitKey=email%3Asend",
    )
  })

  it("parses intent payloads and rejects invalid values", () => {
    expect(parseEventPayload('{"feature":"demo"}')).toEqual({
      feature: "demo",
    })
    expect(() => parseEventPayload("[]")).toThrowError(
      "Event payload must be a JSON object",
    )
    expect(parseTriggerTime("2026-04-12T18:45:00.000Z")).toEqual(
      new Date("2026-04-12T18:45:00.000Z"),
    )
    expect(() => parseTriggerTime("nope")).toThrowError(
      "Trigger time must be a valid ISO date",
    )
    expect(parseRateLimitDuration("minute")).toBe("1 minute")

    const replayForm = new FormData()
    replayForm.set("runId", " run-1 ")
    expect(parseReplayIntent(replayForm)).toEqual({ runId: "run-1" })

    const deleteWorkflowForm = new FormData()
    deleteWorkflowForm.set("workflowName", " orders.process ")
    deleteWorkflowForm.set("confirmWorkflowDelete", "DELETE")
    expect(parseDeleteWorkflowIntent(deleteWorkflowForm)).toEqual({
      workflowName: "orders.process",
    })

    const webhookForm = new FormData()
    webhookForm.set("webhookAuthType", "API_KEY")
    webhookForm.set("webhookHeaderName", "x-api-key")
    webhookForm.set("webhookApiKey", "secret")
    expect(parseWebhookAuth(webhookForm)).toEqual({
      authType: "API_KEY",
      headerName: "x-api-key",
      apiKey: "secret",
    })
    expect(parseWebhookStaticPayload("   ")).toBeUndefined()
  })
})
