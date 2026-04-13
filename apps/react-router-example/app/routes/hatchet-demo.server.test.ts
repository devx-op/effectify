import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedRateLimitDuration = vi.hoisted(
  () =>
    ({
      SECOND: 0,
      MINUTE: 1,
      HOUR: 2,
    }) as const,
)

const pushEventMock = vi.fn()
const getEventMock = vi.fn()
const createScheduleMock = vi.fn()
const getScheduleMock = vi.fn()
const listSchedulesMock = vi.fn()
const createCronMock = vi.fn()
const getCronMock = vi.fn()
const listCronsMock = vi.fn()
const deleteCronMock = vi.fn()
const createWebhookMock = vi.fn()
const getWebhookMock = vi.fn()
const listWebhooksMock = vi.fn()
const deleteWebhookMock = vi.fn()
const listRateLimitsMock = vi.fn()
const upsertRateLimitMock = vi.fn()
const listFiltersMock = vi.fn()
const getFilterMock = vi.fn()
const createFilterMock = vi.fn()
const deleteFilterMock = vi.fn()
const listRunsMock = vi.fn()
const cancelRunMock = vi.fn()
const runWorkflowMock = vi.fn()
const getRunMock = vi.fn()
const getRunStatusMock = vi.fn()
const getRunTaskIdMock = vi.fn()
const listTaskLogsMock = vi.fn()
const getTaskMetricsMock = vi.fn()
const getQueueMetricsMock = vi.fn()
const replayRunMock = vi.fn()
const deleteWorkflowMock = vi.fn()

const runMockedHatchetEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.runPromise(effect as Effect.Effect<A, E, never>)

vi.mock("@effectify/hatchet", () => ({
  pushEvent: (...args: Array<unknown>) => pushEventMock(...args),
  getEvent: (...args: Array<unknown>) => getEventMock(...args),
  createSchedule: (...args: Array<unknown>) => createScheduleMock(...args),
  getSchedule: (...args: Array<unknown>) => getScheduleMock(...args),
  listSchedules: (...args: Array<unknown>) => listSchedulesMock(...args),
  createCron: (...args: Array<unknown>) => createCronMock(...args),
  getCron: (...args: Array<unknown>) => getCronMock(...args),
  listCrons: (...args: Array<unknown>) => listCronsMock(...args),
  deleteCron: (...args: Array<unknown>) => deleteCronMock(...args),
  createWebhook: (...args: Array<unknown>) => createWebhookMock(...args),
  getWebhook: (...args: Array<unknown>) => getWebhookMock(...args),
  listWebhooks: (...args: Array<unknown>) => listWebhooksMock(...args),
  deleteWebhook: (...args: Array<unknown>) => deleteWebhookMock(...args),
  listRateLimits: (...args: Array<unknown>) => listRateLimitsMock(...args),
  RateLimitDuration: mockedRateLimitDuration,
  upsertRateLimit: (...args: Array<unknown>) => upsertRateLimitMock(...args),
  listFilters: (...args: Array<unknown>) => listFiltersMock(...args),
  getFilter: (...args: Array<unknown>) => getFilterMock(...args),
  createFilter: (...args: Array<unknown>) => createFilterMock(...args),
  deleteFilter: (...args: Array<unknown>) => deleteFilterMock(...args),
  listRuns: (...args: Array<unknown>) => listRunsMock(...args),
  replayRun: (...args: Array<unknown>) => replayRunMock(...args),
  cancelRun: (...args: Array<unknown>) => cancelRunMock(...args),
  deleteWorkflow: (...args: Array<unknown>) => deleteWorkflowMock(...args),
  runWorkflow: (...args: Array<unknown>) => runWorkflowMock(...args),
  getRun: (...args: Array<unknown>) => getRunMock(...args),
  getRunStatus: (...args: Array<unknown>) => getRunStatusMock(...args),
  getRunTaskId: (...args: Array<unknown>) => getRunTaskIdMock(...args),
  listTaskLogs: (...args: Array<unknown>) => listTaskLogsMock(...args),
  getTaskMetrics: (...args: Array<unknown>) => getTaskMetricsMock(...args),
  getQueueMetrics: (...args: Array<unknown>) => getQueueMetricsMock(...args),
}))

vi.mock("../lib/runtime.server.js", async () => {
  const { Runtime } = await import("@effectify/react-router")
  return Runtime.make(Layer.empty)
})

import { handleHatchetDemoAction, loadHatchetDemo } from "./hatchet-demo.js"
import {
  buildCronRedirect,
  buildEventRedirect,
  buildFilterRedirect,
  buildRateLimitRedirect,
  buildReplayRedirect,
  buildRunRedirect,
  buildScheduleRedirect,
  buildWebhookRedirect,
  parseDeleteWorkflowIntent,
  parseEventPayload,
  parseRateLimitDuration,
  parseReplayIntent,
  parseTriggerTime,
  parseWebhookAuth,
  parseWebhookAuthType,
  parseWebhookSourceName,
  parseWebhookStaticPayload,
  readSelectedCronId,
  readSelectedEventId,
  readSelectedFilterId,
  readSelectedRateLimitKey,
  readSelectedRunId,
  readSelectedScheduleId,
  readSelectedTaskId,
  readSelectedWebhookName,
} from "./hatchet-demo.shared.js"

describe("hatchet demo event helpers", () => {
  beforeEach(() => {
    pushEventMock.mockReset()
    getEventMock.mockReset()
    createScheduleMock.mockReset()
    getScheduleMock.mockReset()
    listSchedulesMock.mockReset()
    createCronMock.mockReset()
    getCronMock.mockReset()
    listCronsMock.mockReset()
    deleteCronMock.mockReset()
    createWebhookMock.mockReset()
    getWebhookMock.mockReset()
    listWebhooksMock.mockReset()
    deleteWebhookMock.mockReset()
    listRateLimitsMock.mockReset()
    upsertRateLimitMock.mockReset()
    listFiltersMock.mockReset()
    getFilterMock.mockReset()
    createFilterMock.mockReset()
    deleteFilterMock.mockReset()
    listRunsMock.mockReset()
    cancelRunMock.mockReset()
    runWorkflowMock.mockReset()
    getRunMock.mockReset()
    getRunStatusMock.mockReset()
    getRunTaskIdMock.mockReset()
    listTaskLogsMock.mockReset()
    getTaskMetricsMock.mockReset()
    getQueueMetricsMock.mockReset()
    replayRunMock.mockReset()
    deleteWorkflowMock.mockReset()
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listWebhooksMock.mockReturnValue(Effect.succeed([]))
    listRateLimitsMock.mockReturnValue(Effect.succeed([]))
    listFiltersMock.mockReturnValue(Effect.succeed([]))
    deleteFilterMock.mockReturnValue(Effect.succeed(undefined))
    getTaskMetricsMock.mockReturnValue(
      Effect.succeed({
        byStatus: {
          PENDING: 0,
          RUNNING: 0,
          COMPLETED: 0,
          FAILED: 0,
          CANCELLED: 0,
        },
      }),
    )
    getQueueMetricsMock.mockReturnValue(
      Effect.succeed({
        total: { queued: 0, running: 0, pending: 0 },
        workflowBreakdown: {},
        stepRun: {},
      }),
    )
    replayRunMock.mockReturnValue(Effect.succeed({ ids: ["task-1"] }))
    deleteWorkflowMock.mockReturnValue(Effect.succeed(undefined))
  })

  it("parseEventPayload returns JSON objects for push-event actions", () => {
    expect(parseEventPayload('{"userId":"user-123","source":"demo"}')).toEqual({
      userId: "user-123",
      source: "demo",
    })
  })

  it("parseEventPayload rejects non-object JSON payloads", () => {
    expect(() => parseEventPayload('["not","an","object"]')).toThrowError(
      "Event payload must be a JSON object",
    )
  })

  it("readSelectedEventId returns the requested event id from the loader URL", () => {
    expect(
      readSelectedEventId("https://example.com/hatchet-demo?eventId=event-123"),
    ).toBe("event-123")
  })

  it("readSelectedEventId ignores empty event ids and buildEventRedirect encodes valid ids", () => {
    expect(
      readSelectedEventId("https://example.com/hatchet-demo?eventId="),
    ).toBeUndefined()
    expect(buildEventRedirect("event id/123")).toBe(
      "/hatchet-demo?eventId=event%20id%2F123",
    )
  })

  it("parseTriggerTime returns ISO dates for schedule actions", () => {
    expect(parseTriggerTime("2026-04-12T18:45:00.000Z")).toEqual(
      new Date("2026-04-12T18:45:00.000Z"),
    )
  })

  it("parseTriggerTime rejects invalid values and schedule helpers encode ids", () => {
    expect(() => parseTriggerTime("not-a-date")).toThrowError(
      "Trigger time must be a valid ISO date",
    )
    expect(
      readSelectedScheduleId(
        "https://example.com/hatchet-demo?scheduleId=schedule-123",
      ),
    ).toBe("schedule-123")
    expect(buildScheduleRedirect("schedule id/123")).toBe(
      "/hatchet-demo?scheduleId=schedule%20id%2F123",
    )
  })

  it("cron helpers read selected cron ids and encode cron redirects", () => {
    expect(
      readSelectedCronId("https://example.com/hatchet-demo?cronId=cron-123"),
    ).toBe("cron-123")
    expect(buildCronRedirect("cron id/123")).toBe(
      "/hatchet-demo?cronId=cron%20id%2F123",
    )
  })

  it("run observability helpers read selected run and task ids", () => {
    expect(
      readSelectedRunId("https://example.com/hatchet-demo?runId=run-123"),
    ).toBe("run-123")
    expect(
      readSelectedTaskId("https://example.com/hatchet-demo?taskId=task-123"),
    ).toBe("task-123")
    expect(buildRunRedirect("run id/123")).toBe(
      "/hatchet-demo?runId=run%20id%2F123",
    )
  })

  it("management helpers parse replay intents and encode replay redirects", () => {
    const formData = new FormData()
    formData.set("runId", " run-123 ")

    expect(parseReplayIntent(formData)).toEqual({ runId: "run-123" })
    expect(buildReplayRedirect("run id/123")).toBe(
      "/hatchet-demo?runId=run%20id%2F123",
    )
  })

  it("management helpers parse confirmed workflow deletion requests", () => {
    const formData = new FormData()
    formData.set("workflowName", " orders.process ")
    formData.set("confirmWorkflowDelete", "DELETE")

    expect(parseDeleteWorkflowIntent(formData)).toEqual({
      workflowName: "orders.process",
    })
  })

  it("management helpers reject missing replay ids and unconfirmed workflow deletions", () => {
    const replayForm = new FormData()
    replayForm.set("runId", "   ")

    const deleteForm = new FormData()
    deleteForm.set("workflowName", "orders.process")
    deleteForm.set("confirmWorkflowDelete", "keep")

    expect(() => parseReplayIntent(replayForm)).toThrowError(
      "Run ID is required",
    )
    expect(() => parseDeleteWorkflowIntent(deleteForm)).toThrowError(
      "Type DELETE to confirm workflow deletion",
    )
  })

  it("webhook helpers read selected names, parse static payloads, and encode redirects", () => {
    expect(
      readSelectedWebhookName(
        "https://example.com/hatchet-demo?webhookName=github-prs",
      ),
    ).toBe("github-prs")
    expect(parseWebhookStaticPayload('{"issue":"opened"}')).toEqual({
      issue: "opened",
    })
    expect(buildWebhookRedirect("github/prs")).toBe(
      "/hatchet-demo?webhookName=github%2Fprs",
    )
  })

  it("parseWebhookAuthType returns supported webhook auth literals", () => {
    expect(parseWebhookAuthType(" BASIC ")).toBe("BASIC")
  })

  it("parseWebhookAuthType rejects unsupported webhook auth values", () => {
    expect(() => parseWebhookAuthType("unsupported")).toThrowError(
      "Webhook auth type must be BASIC, API_KEY, or HMAC",
    )
  })

  it("parseWebhookStaticPayload returns undefined for blank values and source names stay explicit", () => {
    expect(parseWebhookStaticPayload("   ")).toBeUndefined()
    expect(parseWebhookSourceName("GITHUB")).toBe("GITHUB")
    expect(() => parseWebhookSourceName("   ")).toThrowError(
      "Webhook source is required",
    )
    expect(() => parseWebhookSourceName("DISCORD")).toThrowError(
      "Unsupported webhook source: DISCORD",
    )
  })

  it("parseWebhookAuth supports BASIC and API_KEY form shapes", () => {
    const basicForm = new FormData()
    basicForm.set("webhookAuthType", "BASIC")
    basicForm.set("webhookUsername", "demo-user")
    basicForm.set("webhookPassword", "demo-pass")

    const apiKeyForm = new FormData()
    apiKeyForm.set("webhookAuthType", "API_KEY")
    apiKeyForm.set("webhookHeaderName", "x-demo-key")
    apiKeyForm.set("webhookApiKey", "secret-key")

    expect(parseWebhookAuth(basicForm)).toEqual({
      authType: "BASIC",
      username: "demo-user",
      password: "demo-pass",
    })
    expect(parseWebhookAuth(apiKeyForm)).toEqual({
      authType: "API_KEY",
      headerName: "x-demo-key",
      apiKey: "secret-key",
    })
  })

  it("parseWebhookAuth rejects unsupported HMAC algorithms and encodings", () => {
    const invalidAlgorithmForm = new FormData()
    invalidAlgorithmForm.set("webhookAuthType", "HMAC")
    invalidAlgorithmForm.set("webhookHmacAlgorithm", "CRC32")
    invalidAlgorithmForm.set("webhookHmacEncoding", "HEX")
    invalidAlgorithmForm.set("webhookSignatureHeaderName", "x-signature")
    invalidAlgorithmForm.set("webhookSigningSecret", "top-secret")

    const invalidEncodingForm = new FormData()
    invalidEncodingForm.set("webhookAuthType", "HMAC")
    invalidEncodingForm.set("webhookHmacAlgorithm", "SHA256")
    invalidEncodingForm.set("webhookHmacEncoding", "UTF8")
    invalidEncodingForm.set("webhookSignatureHeaderName", "x-signature")
    invalidEncodingForm.set("webhookSigningSecret", "top-secret")

    expect(() => parseWebhookAuth(invalidAlgorithmForm)).toThrowError(
      "Unsupported webhook HMAC algorithm: CRC32",
    )
    expect(() => parseWebhookAuth(invalidEncodingForm)).toThrowError(
      "Unsupported webhook HMAC encoding: UTF8",
    )
  })

  it("rate-limit helpers read selected keys, parse durations, and encode redirects", () => {
    expect(
      readSelectedRateLimitKey(
        "https://example.com/hatchet-demo?rateLimitKey=email%3Asend",
      ),
    ).toBe("email:send")
    expect(parseRateLimitDuration(" minute ")).toBe("1 minute")
    expect(parseRateLimitDuration(String(mockedRateLimitDuration.MINUTE))).toBe(
      "1 minute",
    )
    expect(parseRateLimitDuration("second")).toBe("1 second")
    expect(parseRateLimitDuration("1 HOUR")).toBe("1 hour")
    expect(buildRateLimitRedirect("email/send")).toBe(
      "/hatchet-demo?rateLimitKey=email%2Fsend",
    )
  })

  it("filter helpers read selected ids and encode filter redirects", () => {
    expect(
      readSelectedFilterId(
        "https://example.com/hatchet-demo?filterId=filter-123",
      ),
    ).toBe("filter-123")
    expect(buildFilterRedirect("filter id/123")).toBe(
      "/hatchet-demo?filterId=filter%20id%2F123",
    )
  })

  it("parseRateLimitDuration rejects unsupported values", () => {
    expect(() => parseRateLimitDuration("weekly")).toThrowError(
      "Rate limit duration must be SECOND, MINUTE, or HOUR",
    )
  })

  it("loader includes rate limits and selected rate-limit details", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listRateLimitsMock.mockReturnValue(
      Effect.succeed([
        {
          key: "email:send",
          tenantId: "tenant-1",
          limitValue: 15,
          value: 3,
          window: "1m",
          lastRefill: "2026-04-12T18:45:00.000Z",
        },
      ]),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(
        new Request(
          "https://example.com/hatchet-demo?rateLimitKey=email%3Asend",
        ),
      ),
    )

    expect(listRateLimitsMock).toHaveBeenCalledTimes(1)
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
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
        selectedRateLimitKey: "email:send",
      },
    })
  })

  it("loader includes filters and selected filter details", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listFiltersMock.mockReturnValue(
      Effect.succeed([
        {
          filterId: "filter-123",
          tenantId: "tenant-1",
          workflowId: "workflow-1",
          scope: "tenant:demo",
          expression: "input.kind == 'demo'",
          payload: { feature: "filters" },
        },
      ]),
    )
    getFilterMock.mockReturnValue(
      Effect.succeed({
        filterId: "filter-123",
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: { feature: "filters" },
        isDeclarative: true,
      }),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(
        new Request("https://example.com/hatchet-demo?filterId=filter-123"),
      ),
    )

    expect(listFiltersMock).toHaveBeenCalledTimes(1)
    expect(getFilterMock).toHaveBeenCalledWith("filter-123")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        filters: [
          {
            filterId: "filter-123",
            workflowId: "workflow-1",
          },
        ],
        filter: {
          filterId: "filter-123",
          isDeclarative: true,
        },
      },
    })
  })

  it("action creates a filter and redirects the loader to the selected filter", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listFiltersMock.mockReturnValue(
      Effect.succeed([
        {
          filterId: "filter-123",
          tenantId: "tenant-1",
          workflowId: "workflow-1",
          scope: "tenant:demo",
          expression: "input.kind == 'demo'",
          payload: { feature: "filters" },
        },
      ]),
    )
    getFilterMock.mockReturnValue(
      Effect.succeed({
        filterId: "filter-123",
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: { feature: "filters" },
      }),
    )
    createFilterMock.mockReturnValue(
      Effect.succeed({
        filterId: "filter-123",
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: { feature: "filters" },
      }),
    )

    const formData = new FormData()
    formData.set("intent", "create-filter")
    formData.set("filterWorkflowId", "workflow-1")
    formData.set("filterScope", "tenant:demo")
    formData.set("filterExpression", "input.kind == 'demo'")
    formData.set("filterPayload", '{"feature":"filters"}')

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(createFilterMock).toHaveBeenCalledWith({
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "input.kind == 'demo'",
      payload: { feature: "filters" },
    })
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo?filterId=filter-123",
    })
  })

  it("action replays a selected run and redirects back to the selected run", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))

    const formData = new FormData()
    formData.set("intent", "replay")
    formData.set("runId", "run-123")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(replayRunMock).toHaveBeenCalledWith("run-123")
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: buildReplayRedirect("run-123"),
    })
  })

  it("action deletes a workflow after confirmation and redirects back to the demo page", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))

    const formData = new FormData()
    formData.set("intent", "delete-workflow")
    formData.set("workflowName", "orders.process")
    formData.set("confirmWorkflowDelete", "DELETE")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(deleteWorkflowMock).toHaveBeenCalledWith("orders.process")
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo",
    })
  })

  it("action rejects invalid filter submissions before calling the client", async () => {
    const formData = new FormData()
    formData.set("intent", "create-filter")
    formData.set("filterWorkflowId", "")
    formData.set("filterScope", "tenant:demo")
    formData.set("filterExpression", "input.kind == 'demo'")

    const response = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(createFilterMock).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "Workflow ID is required",
    })
  })

  it("action deletes filters and redirects back to the base demo route", async () => {
    const formData = new FormData()
    formData.set("intent", "delete-filter")
    formData.set("filterId", "filter-123")

    const response = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(deleteFilterMock).toHaveBeenCalledWith("filter-123")
    expect(response).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo",
    })
  })

  it("action rejects empty filter ids before delete", async () => {
    const formData = new FormData()
    formData.set("intent", "delete-filter")
    formData.set("filterId", "   ")

    const response = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(deleteFilterMock).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "Filter ID is required",
    })
  })

  it("action handles run submissions for missing workflow, invalid JSON, and success", async () => {
    const missingWorkflow = new FormData()
    missingWorkflow.set("intent", "run")
    missingWorkflow.set("workflowName", "")
    missingWorkflow.set("input", "{}")

    const invalidJson = new FormData()
    invalidJson.set("intent", "run")
    invalidJson.set("workflowName", "workflow-1")
    invalidJson.set("input", "{")

    runWorkflowMock.mockReturnValue(Effect.succeed(undefined))
    const validRun = new FormData()
    validRun.set("intent", "run")
    validRun.set("workflowName", "workflow-1")
    validRun.set("input", '{"feature":"filters"}')

    const missingWorkflowResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: missingWorkflow,
        }),
      ),
    )
    const invalidJsonResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: invalidJson,
        }),
      ),
    )
    const validResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: validRun,
        }),
      ),
    )

    expect(missingWorkflowResponse).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "Workflow name is required",
    })
    expect(invalidJsonResponse).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "Invalid JSON input",
    })
    expect(runWorkflowMock).toHaveBeenCalledWith("workflow-1", {
      feature: "filters",
    })
    expect(validResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo",
    })
  })

  it("action validates push, schedule, and cron submissions before side effects", async () => {
    const missingEventKey = new FormData()
    missingEventKey.set("intent", "push")
    missingEventKey.set("eventKey", "")

    const invalidEventPayload = new FormData()
    invalidEventPayload.set("intent", "push")
    invalidEventPayload.set("eventKey", "user.created")
    invalidEventPayload.set("eventPayload", "[]")

    const missingScheduleWorkflow = new FormData()
    missingScheduleWorkflow.set("intent", "schedule")
    missingScheduleWorkflow.set("workflowName", "")
    missingScheduleWorkflow.set("triggerAt", "2026-04-12T18:45:00.000Z")

    const invalidTriggerTime = new FormData()
    invalidTriggerTime.set("intent", "schedule")
    invalidTriggerTime.set("workflowName", "workflow-1")
    invalidTriggerTime.set("triggerAt", "not-a-date")

    const invalidScheduleInput = new FormData()
    invalidScheduleInput.set("intent", "schedule")
    invalidScheduleInput.set("workflowName", "workflow-1")
    invalidScheduleInput.set("triggerAt", "2026-04-12T18:45:00.000Z")
    invalidScheduleInput.set("scheduleInput", "[]")

    const missingCronWorkflow = new FormData()
    missingCronWorkflow.set("intent", "create-cron")
    missingCronWorkflow.set("cronWorkflowName", "")

    const missingCronName = new FormData()
    missingCronName.set("intent", "create-cron")
    missingCronName.set("cronWorkflowName", "workflow-1")
    missingCronName.set("cronName", "")

    const missingCronExpression = new FormData()
    missingCronExpression.set("intent", "create-cron")
    missingCronExpression.set("cronWorkflowName", "workflow-1")
    missingCronExpression.set("cronName", "nightly")
    missingCronExpression.set("cronExpression", "")

    const invalidCronInput = new FormData()
    invalidCronInput.set("intent", "create-cron")
    invalidCronInput.set("cronWorkflowName", "workflow-1")
    invalidCronInput.set("cronName", "nightly")
    invalidCronInput.set("cronExpression", "0 0 * * *")
    invalidCronInput.set("cronInput", "[]")

    const responses = await Promise.all([
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingEventKey,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidEventPayload,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingScheduleWorkflow,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidTriggerTime,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidScheduleInput,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingCronWorkflow,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingCronName,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingCronExpression,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidCronInput,
          }),
        ),
      ),
    ])

    expect(responses).toMatchObject([
      { _tag: "HttpResponseFailure", cause: "Event key is required" },
      {
        _tag: "HttpResponseFailure",
        cause: "Event payload must be a JSON object",
      },
      { _tag: "HttpResponseFailure", cause: "Workflow name is required" },
      {
        _tag: "HttpResponseFailure",
        cause: "Trigger time must be a valid ISO date",
      },
      {
        _tag: "HttpResponseFailure",
        cause: "Event payload must be a JSON object",
      },
      { _tag: "HttpResponseFailure", cause: "Workflow name is required" },
      { _tag: "HttpResponseFailure", cause: "Cron name is required" },
      { _tag: "HttpResponseFailure", cause: "Cron expression is required" },
      {
        _tag: "HttpResponseFailure",
        cause: "Event payload must be a JSON object",
      },
    ])
  })

  it("action validates filter, cron delete, webhook, rate-limit, cancel, and unknown intents", async () => {
    const missingFilterScope = new FormData()
    missingFilterScope.set("intent", "create-filter")
    missingFilterScope.set("filterWorkflowId", "workflow-1")
    missingFilterScope.set("filterScope", "")
    missingFilterScope.set("filterExpression", "input.kind == 'demo'")

    const missingFilterExpression = new FormData()
    missingFilterExpression.set("intent", "create-filter")
    missingFilterExpression.set("filterWorkflowId", "workflow-1")
    missingFilterExpression.set("filterScope", "tenant:demo")
    missingFilterExpression.set("filterExpression", "")

    const invalidFilterPayload = new FormData()
    invalidFilterPayload.set("intent", "create-filter")
    invalidFilterPayload.set("filterWorkflowId", "workflow-1")
    invalidFilterPayload.set("filterScope", "tenant:demo")
    invalidFilterPayload.set("filterExpression", "input.kind == 'demo'")
    invalidFilterPayload.set("filterPayload", "[]")

    const missingCronId = new FormData()
    missingCronId.set("intent", "delete-cron")
    missingCronId.set("cronId", "")

    const missingWebhookName = new FormData()
    missingWebhookName.set("intent", "create-webhook")
    missingWebhookName.set("webhookName", "")

    const missingWebhookEventKey = new FormData()
    missingWebhookEventKey.set("intent", "create-webhook")
    missingWebhookEventKey.set("webhookName", "demo-webhook")
    missingWebhookEventKey.set("webhookEventKeyExpression", "")

    const missingDeleteWebhookName = new FormData()
    missingDeleteWebhookName.set("intent", "delete-webhook")
    missingDeleteWebhookName.set("webhookName", "")

    const invalidRateLimit = new FormData()
    invalidRateLimit.set("intent", "upsert-ratelimit")
    invalidRateLimit.set("rateLimitKey", "email:send")
    invalidRateLimit.set("rateLimitLimit", "0")

    const invalidRateLimitDuration = new FormData()
    invalidRateLimitDuration.set("intent", "upsert-ratelimit")
    invalidRateLimitDuration.set("rateLimitKey", "email:send")
    invalidRateLimitDuration.set("rateLimitLimit", "5")
    invalidRateLimitDuration.set("rateLimitDuration", "weekly")

    const missingCancelRunId = new FormData()
    missingCancelRunId.set("intent", "cancel")
    missingCancelRunId.set("runId", "")

    cancelRunMock.mockReturnValue(Effect.succeed(undefined))
    const validCancel = new FormData()
    validCancel.set("intent", "cancel")
    validCancel.set("runId", "run-123")

    const unknownIntent = new FormData()
    unknownIntent.set("intent", "teleport")

    const responses = await Promise.all([
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingFilterScope,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingFilterExpression,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidFilterPayload,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingCronId,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingWebhookName,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingWebhookEventKey,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingDeleteWebhookName,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidRateLimit,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: invalidRateLimitDuration,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: missingCancelRunId,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: validCancel,
          }),
        ),
      ),
      runMockedHatchetEffect(
        handleHatchetDemoAction(
          new Request("https://example.com/hatchet-demo", {
            method: "POST",
            body: unknownIntent,
          }),
        ),
      ),
    ])

    expect(responses).toMatchObject([
      { _tag: "HttpResponseFailure", cause: "Filter scope is required" },
      {
        _tag: "HttpResponseFailure",
        cause: "Filter expression is required",
      },
      {
        _tag: "HttpResponseFailure",
        cause: "Event payload must be a JSON object",
      },
      { _tag: "HttpResponseFailure", cause: "Cron ID is required" },
      { _tag: "HttpResponseFailure", cause: "Webhook name is required" },
      {
        _tag: "HttpResponseFailure",
        cause: "Webhook event key expression is required",
      },
      { _tag: "HttpResponseFailure", cause: "Webhook name is required" },
      {
        _tag: "HttpResponseFailure",
        cause: "Rate limit limit must be a positive integer",
      },
      {
        _tag: "HttpResponseFailure",
        cause: "Rate limit duration must be SECOND, MINUTE, or HOUR",
      },
      { _tag: "HttpResponseFailure", cause: "Run ID is required" },
      { _tag: "HttpResponseRedirect", to: "/hatchet-demo" },
      { _tag: "HttpResponseFailure", cause: "Unknown intent" },
    ])
    expect(cancelRunMock).toHaveBeenCalledWith("run-123")
  })

  it("action upserts a rate limit and redirects the loader to the selected key", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listRateLimitsMock.mockReturnValue(
      Effect.succeed([
        {
          key: "email:send",
          tenantId: "tenant-1",
          limitValue: 30,
          value: 7,
          window: "1m",
          lastRefill: "2026-04-12T18:45:00.000Z",
        },
      ]),
    )
    upsertRateLimitMock.mockReturnValue(Effect.succeed("email:send"))

    const formData = new FormData()
    formData.set("intent", "upsert-ratelimit")
    formData.set("rateLimitKey", "email:send")
    formData.set("rateLimitLimit", "30")
    formData.set("rateLimitDuration", "1 minute")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(upsertRateLimitMock).toHaveBeenCalledWith({
      key: "email:send",
      limit: 30,
      duration: "1 minute",
    })
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo?rateLimitKey=email%3Asend",
    })

    const redirectResponse = actionResponse as { to: string }
    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(new Request(`https://example.com${redirectResponse.to}`)),
    )

    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        selectedRateLimitKey: "email:send",
        ratelimits: [
          {
            key: "email:send",
            limitValue: 30,
            value: 7,
          },
        ],
      },
    })
  })

  it("action rejects invalid rate-limit submissions before calling the client", async () => {
    const formData = new FormData()
    formData.set("intent", "upsert-ratelimit")
    formData.set("rateLimitKey", "")
    formData.set("rateLimitLimit", "0")

    const response = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(upsertRateLimitMock).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "Rate limit key is required",
    })
  })

  it("action pushes an event and redirects the loader to the selected event", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    pushEventMock.mockReturnValue(
      Effect.succeed({
        eventId: "event id/123",
        key: "user.created",
        payload: { userId: "user-123", source: "demo" },
        scope: "demo",
      }),
    )
    getEventMock.mockReturnValue(
      Effect.succeed({
        eventId: "event id/123",
        key: "user.created",
        payload: { userId: "user-123", source: "demo" },
        scope: "demo",
      }),
    )

    const formData = new FormData()
    formData.set("intent", "push")
    formData.set("eventKey", "user.created")
    formData.set("eventPayload", '{"userId":"user-123","source":"demo"}')

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(pushEventMock).toHaveBeenCalledWith(
      "user.created",
      { userId: "user-123", source: "demo" },
      {
        additionalMetadata: {
          source: "react-router-example",
        },
        scope: "demo",
      },
    )
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo?eventId=event%20id%2F123",
    })
    const redirectResponse = actionResponse as { to: string }
    expect(redirectResponse.to).toBe("/hatchet-demo?eventId=event%20id%2F123")

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(new Request(`https://example.com${redirectResponse.to}`)),
    )

    expect(getEventMock).toHaveBeenCalledWith("event id/123")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        event: {
          eventId: "event id/123",
          key: "user.created",
          payload: { userId: "user-123", source: "demo" },
          scope: "demo",
        },
        schedule: undefined,
        schedules: [],
        cron: undefined,
        crons: [],
        runs: [],
      },
    })
  })

  it("action creates a schedule and redirects the loader to the selected schedule", async () => {
    const triggerAt = "2026-04-12T18:45:00.000Z"

    listRunsMock.mockReturnValue(Effect.succeed([]))
    listSchedulesMock.mockReturnValue(
      Effect.succeed([
        {
          scheduleId: "schedule id/123",
          workflowName: "users.notify",
          triggerAt: new Date(triggerAt),
          input: { userId: "user-123" },
        },
      ]),
    )
    createScheduleMock.mockReturnValue(
      Effect.succeed({
        scheduleId: "schedule id/123",
        workflowName: "users.notify",
        triggerAt: new Date(triggerAt),
        input: { userId: "user-123" },
      }),
    )
    getScheduleMock.mockReturnValue(
      Effect.succeed({
        scheduleId: "schedule id/123",
        workflowName: "users.notify",
        triggerAt: new Date(triggerAt),
        input: { userId: "user-123" },
      }),
    )

    const formData = new FormData()
    formData.set("intent", "schedule")
    formData.set("workflowName", "users.notify")
    formData.set("triggerAt", triggerAt)
    formData.set("scheduleInput", '{"userId":"user-123"}')

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(createScheduleMock).toHaveBeenCalledWith("users.notify", {
      triggerAt: new Date(triggerAt),
      input: { userId: "user-123" },
      additionalMetadata: {
        source: "react-router-example",
      },
    })
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo?scheduleId=schedule%20id%2F123",
    })
    const redirectResponse = actionResponse as { to: string }
    expect(redirectResponse.to).toBe(
      "/hatchet-demo?scheduleId=schedule%20id%2F123",
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(new Request(`https://example.com${redirectResponse.to}`)),
    )

    expect(getScheduleMock).toHaveBeenCalledWith("schedule id/123")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        event: undefined,
        schedule: {
          scheduleId: "schedule id/123",
          workflowName: "users.notify",
          triggerAt: new Date(triggerAt),
          input: { userId: "user-123" },
        },
        schedules: [
          {
            scheduleId: "schedule id/123",
            workflowName: "users.notify",
            triggerAt: new Date(triggerAt),
            input: { userId: "user-123" },
          },
        ],
        cron: undefined,
        crons: [],
        runs: [],
      },
    })
  })

  it("action creates a cron and redirects the loader to the selected cron", async () => {
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(
      Effect.succeed([
        {
          cronId: "cron id/123",
          workflowName: "users.notify",
          cron: "0 0 * * *",
          name: "nightly-users",
          input: { userId: "user-123" },
          enabled: true,
          method: "API",
        },
      ]),
    )
    createCronMock.mockReturnValue(
      Effect.succeed({
        cronId: "cron id/123",
        workflowName: "users.notify",
        cron: "0 0 * * *",
        name: "nightly-users",
        input: { userId: "user-123" },
        enabled: true,
        method: "API",
      }),
    )
    getCronMock.mockReturnValue(
      Effect.succeed({
        cronId: "cron id/123",
        workflowName: "users.notify",
        cron: "0 0 * * *",
        name: "nightly-users",
        input: { userId: "user-123" },
        enabled: true,
        method: "API",
      }),
    )

    const formData = new FormData()
    formData.set("intent", "create-cron")
    formData.set("cronWorkflowName", "users.notify")
    formData.set("cronName", "nightly-users")
    formData.set("cronExpression", "0 0 * * *")
    formData.set("cronInput", '{"userId":"user-123"}')

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(createCronMock).toHaveBeenCalledWith("users.notify", {
      name: "nightly-users",
      expression: "0 0 * * *",
      input: { userId: "user-123" },
      additionalMetadata: {
        source: "react-router-example",
      },
    })
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo?cronId=cron%20id%2F123",
    })
    const redirectResponse = actionResponse as { to: string }
    expect(redirectResponse.to).toBe("/hatchet-demo?cronId=cron%20id%2F123")

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(new Request(`https://example.com${redirectResponse.to}`)),
    )

    expect(getCronMock).toHaveBeenCalledWith("cron id/123")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        event: undefined,
        schedule: undefined,
        schedules: [],
        cron: {
          cronId: "cron id/123",
          workflowName: "users.notify",
          cron: "0 0 * * *",
          name: "nightly-users",
          input: { userId: "user-123" },
          enabled: true,
          method: "API",
        },
        crons: [
          {
            cronId: "cron id/123",
            workflowName: "users.notify",
            cron: "0 0 * * *",
            name: "nightly-users",
            input: { userId: "user-123" },
            enabled: true,
            method: "API",
          },
        ],
        runs: [],
      },
    })
  })

  it("action deletes a cron and redirects back to the cron list", async () => {
    deleteCronMock.mockReturnValue(Effect.void)

    const formData = new FormData()
    formData.set("intent", "delete-cron")
    formData.set("cronId", "cron-404")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo?cronId=cron-404", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(deleteCronMock).toHaveBeenCalledWith("cron-404")
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo",
    })
  })

  it("loader returns webhook list and selected webhook details", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listWebhooksMock.mockReturnValue(
      Effect.succeed([
        {
          webhookId: "webhook-123",
          tenantId: "tenant-1",
          name: "github-prs",
          sourceName: "GITHUB",
          eventKeyExpression: "body.action",
          authType: "HMAC",
        },
      ]),
    )
    getWebhookMock.mockReturnValue(
      Effect.succeed({
        webhookId: "webhook-123",
        tenantId: "tenant-1",
        name: "github-prs",
        sourceName: "GITHUB",
        eventKeyExpression: "body.action",
        scopeExpression: "body.repository.full_name",
        staticPayload: { issue: "opened" },
        authType: "HMAC",
      }),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(
        new Request("https://example.com/hatchet-demo?webhookName=github-prs"),
      ),
    )

    expect(getWebhookMock).toHaveBeenCalledWith("github-prs")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        webhook: {
          webhookId: "webhook-123",
          name: "github-prs",
          sourceName: "GITHUB",
          authType: "HMAC",
        },
        webhooks: [
          {
            webhookId: "webhook-123",
            name: "github-prs",
          },
        ],
      },
    })
  })

  it("action creates a webhook and redirects the loader to the selected webhook", async () => {
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listWebhooksMock.mockReturnValue(
      Effect.succeed([
        {
          webhookId: "webhook-123",
          tenantId: "tenant-1",
          name: "github-prs",
          sourceName: "GITHUB",
          eventKeyExpression: "body.action",
          authType: "HMAC",
        },
      ]),
    )
    createWebhookMock.mockReturnValue(
      Effect.succeed({
        webhookId: "webhook-123",
        tenantId: "tenant-1",
        name: "github-prs",
        sourceName: "GITHUB",
        eventKeyExpression: "body.action",
        scopeExpression: "body.repository.full_name",
        staticPayload: { issue: "opened" },
        authType: "HMAC",
      }),
    )
    getWebhookMock.mockReturnValue(
      Effect.succeed({
        webhookId: "webhook-123",
        tenantId: "tenant-1",
        name: "github-prs",
        sourceName: "GITHUB",
        eventKeyExpression: "body.action",
        scopeExpression: "body.repository.full_name",
        staticPayload: { issue: "opened" },
        authType: "HMAC",
      }),
    )

    const formData = new FormData()
    formData.set("intent", "create-webhook")
    formData.set("webhookName", "github-prs")
    formData.set("webhookSourceName", "GITHUB")
    formData.set("webhookEventKeyExpression", "body.action")
    formData.set("webhookScopeExpression", "body.repository.full_name")
    formData.set("webhookStaticPayload", '{"issue":"opened"}')
    formData.set("webhookAuthType", "HMAC")
    formData.set("webhookHmacAlgorithm", "SHA256")
    formData.set("webhookHmacEncoding", "HEX")
    formData.set("webhookSignatureHeaderName", "x-hub-signature-256")
    formData.set("webhookSigningSecret", "secret-123")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(createWebhookMock).toHaveBeenCalledWith({
      name: "github-prs",
      sourceName: "GITHUB",
      eventKeyExpression: "body.action",
      scopeExpression: "body.repository.full_name",
      staticPayload: { issue: "opened" },
      auth: {
        authType: "HMAC",
        algorithm: "SHA256",
        encoding: "HEX",
        signatureHeaderName: "x-hub-signature-256",
        signingSecret: "secret-123",
      },
    })
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo?webhookName=github-prs",
    })
  })

  it("action deletes a webhook and redirects back to the list", async () => {
    deleteWebhookMock.mockReturnValue(Effect.void)

    const formData = new FormData()
    formData.set("intent", "delete-webhook")
    formData.set("webhookName", "github-prs")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo?webhookName=github-prs", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(deleteWebhookMock).toHaveBeenCalledWith("github-prs")
    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseRedirect",
      to: "/hatchet-demo",
    })
  })

  it("action rejects malformed webhook auth forms", async () => {
    const formData = new FormData()
    formData.set("intent", "create-webhook")
    formData.set("webhookName", "github-prs")
    formData.set("webhookSourceName", "GITHUB")
    formData.set("webhookEventKeyExpression", "body.action")
    formData.set("webhookAuthType", "UNSUPPORTED")

    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "Webhook auth type must be BASIC, API_KEY, or HMAC",
    })
  })

  it("loader skips selected resource lookups when the URL does not request them", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(
      Effect.succeed([
        { id: "run-1", workflowName: "wf", status: "COMPLETED" },
      ]),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(new Request("https://example.com/hatchet-demo")),
    )

    expect(getEventMock).not.toHaveBeenCalled()
    expect(getScheduleMock).not.toHaveBeenCalled()
    expect(getCronMock).not.toHaveBeenCalled()
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        event: undefined,
        schedule: undefined,
        schedules: [],
        cron: undefined,
        crons: [],
        runs: [{ id: "run-1", workflowName: "wf", status: "COMPLETED" }],
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
    })
  })

  it("loader resolves run observability by fetching run details, status, task id, and logs", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(
      Effect.succeed([{ id: "run-123", workflowName: "wf" }]),
    )
    getRunMock.mockReturnValue(
      Effect.succeed({ id: "run-123", workflowName: "wf" }),
    )
    getRunStatusMock.mockReturnValue(Effect.succeed("RUNNING"))
    getRunTaskIdMock.mockReturnValue(Effect.succeed("task-123"))
    listTaskLogsMock.mockReturnValue(
      Effect.succeed({
        rows: [
          {
            message: "started",
            level: "INFO",
            timestamp: "2026-04-11T17:00:00.000Z",
            taskId: "task-123",
          },
        ],
      }),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(
        new Request("https://example.com/hatchet-demo?runId=run-123"),
      ),
    )

    expect(getRunMock).toHaveBeenCalledWith("run-123")
    expect(getRunStatusMock).toHaveBeenCalledWith("run-123")
    expect(getRunTaskIdMock).toHaveBeenCalledWith("run-123")
    expect(listTaskLogsMock).toHaveBeenCalledWith("task-123")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        observability: {
          selectedRunId: "run-123",
          selectedTaskId: "task-123",
          status: "RUNNING",
          logs: {
            rows: [
              {
                message: "started",
                taskId: "task-123",
              },
            ],
          },
        },
      },
    })
  })

  it("loader resolves selected task observability without fetching run details", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    listTaskLogsMock.mockReturnValue(Effect.succeed([{ line: "task-log" }]))
    getTaskMetricsMock.mockReturnValue(
      Effect.succeed({
        byStatus: {
          PENDING: 1,
          RUNNING: 2,
          COMPLETED: 3,
          FAILED: 4,
          CANCELLED: 5,
        },
      }),
    )
    getQueueMetricsMock.mockReturnValue(
      Effect.succeed({
        total: { queued: 6, running: 7, pending: 8 },
        workflowBreakdown: {},
        stepRun: {},
      }),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(
        new Request("https://example.com/hatchet-demo?taskId=task-123"),
      ),
    )

    expect(getRunMock).not.toHaveBeenCalled()
    expect(getRunStatusMock).not.toHaveBeenCalled()
    expect(getRunTaskIdMock).not.toHaveBeenCalled()
    expect(listTaskLogsMock).toHaveBeenCalledWith("task-123")
    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        observability: {
          selectedRunId: undefined,
          selectedTaskId: "task-123",
          logs: [{ line: "task-log" }],
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
            total: { queued: 6, running: 7, pending: 8 },
            workflowBreakdown: {},
            stepRun: {},
          },
        },
      },
    })
  })

  it("loader preserves the page when observability reads fail", async () => {
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listRunsMock.mockReturnValue(Effect.succeed([]))
    getTaskMetricsMock.mockReturnValue(
      Effect.fail(new Error("metrics unavailable")),
    )

    const loaderResponse = await runMockedHatchetEffect(
      loadHatchetDemo(
        new Request("https://example.com/hatchet-demo?taskId=task-123"),
      ),
    )

    expect(loaderResponse).toMatchObject({
      _tag: "HttpResponseSuccess",
      data: {
        runs: [],
        observability: {
          selectedTaskId: "task-123",
          error: "Observability is temporarily unavailable",
        },
      },
    })
  })

  it("action turns request.formData failures into a stable http failure response", async () => {
    const actionResponse = await runMockedHatchetEffect(
      handleHatchetDemoAction({
        formData: async () => {
          throw new Error("body already consumed")
        },
      } as unknown as Request),
    )

    expect(actionResponse).toMatchObject({
      _tag: "HttpResponseFailure",
      cause: "body already consumed",
    })
  })
})
