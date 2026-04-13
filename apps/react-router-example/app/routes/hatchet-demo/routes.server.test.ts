import * as Effect from "effect/Effect"
import type { HttpResponseFailure, HttpResponseRedirect, HttpResponseSuccess } from "@effectify/react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { HatchetTaskSummaryRecord, HatchetWorkflowRunDetailsRecord } from "../../lib/hatchet/run-models.js"

const listRunsMock = vi.fn()
const getRunMock = vi.fn()
const getRunStatusMock = vi.fn()
const getEventMock = vi.fn()
const runWorkflowMock = vi.fn()
const pushEventMock = vi.fn()
const replayRunMock = vi.fn()
const cancelRunMock = vi.fn()
const listSchedulesMock = vi.fn()
const getScheduleMock = vi.fn()
const createScheduleMock = vi.fn()
const listCronsMock = vi.fn()
const getCronMock = vi.fn()
const createCronMock = vi.fn()
const deleteCronMock = vi.fn()
const listFiltersMock = vi.fn()
const getFilterMock = vi.fn()
const createFilterMock = vi.fn()
const deleteFilterMock = vi.fn()
const listWebhooksMock = vi.fn()
const getWebhookMock = vi.fn()
const createWebhookMock = vi.fn()
const deleteWebhookMock = vi.fn()
const listRateLimitsMock = vi.fn()
const upsertRateLimitMock = vi.fn()
const getTaskMetricsMock = vi.fn()
const getQueueMetricsMock = vi.fn()
const getRunTaskIdMock = vi.fn()
const listTaskLogsMock = vi.fn()
const deleteWorkflowMock = vi.fn()

vi.mock("@effectify/hatchet", () => ({
  listRuns: (...args: Array<unknown>) => listRunsMock(...args),
  getRun: (...args: Array<unknown>) => getRunMock(...args),
  getRunStatus: (...args: Array<unknown>) => getRunStatusMock(...args),
  getEvent: (...args: Array<unknown>) => getEventMock(...args),
  runWorkflow: (...args: Array<unknown>) => runWorkflowMock(...args),
  pushEvent: (...args: Array<unknown>) => pushEventMock(...args),
  replayRun: (...args: Array<unknown>) => replayRunMock(...args),
  cancelRun: (...args: Array<unknown>) => cancelRunMock(...args),
  listSchedules: (...args: Array<unknown>) => listSchedulesMock(...args),
  getSchedule: (...args: Array<unknown>) => getScheduleMock(...args),
  createSchedule: (...args: Array<unknown>) => createScheduleMock(...args),
  listCrons: (...args: Array<unknown>) => listCronsMock(...args),
  getCron: (...args: Array<unknown>) => getCronMock(...args),
  createCron: (...args: Array<unknown>) => createCronMock(...args),
  deleteCron: (...args: Array<unknown>) => deleteCronMock(...args),
  listFilters: (...args: Array<unknown>) => listFiltersMock(...args),
  getFilter: (...args: Array<unknown>) => getFilterMock(...args),
  createFilter: (...args: Array<unknown>) => createFilterMock(...args),
  deleteFilter: (...args: Array<unknown>) => deleteFilterMock(...args),
  listWebhooks: (...args: Array<unknown>) => listWebhooksMock(...args),
  getWebhook: (...args: Array<unknown>) => getWebhookMock(...args),
  createWebhook: (...args: Array<unknown>) => createWebhookMock(...args),
  deleteWebhook: (...args: Array<unknown>) => deleteWebhookMock(...args),
  listRateLimits: (...args: Array<unknown>) => listRateLimitsMock(...args),
  upsertRateLimit: (...args: Array<unknown>) => upsertRateLimitMock(...args),
  getTaskMetrics: (...args: Array<unknown>) => getTaskMetricsMock(...args),
  getQueueMetrics: (...args: Array<unknown>) => getQueueMetricsMock(...args),
  getRunTaskId: (...args: Array<unknown>) => getRunTaskIdMock(...args),
  listTaskLogs: (...args: Array<unknown>) => listTaskLogsMock(...args),
  deleteWorkflow: (...args: Array<unknown>) => deleteWorkflowMock(...args),
  RateLimitDuration: {
    SECOND: 0,
    MINUTE: 1,
    HOUR: 2,
  },
}))

vi.mock("../../lib/runtime.server.js", () => ({
  withLoaderEffect: <A>(effect: A) => effect,
  withActionEffect: <A>(effect: A) => effect,
}))

import { loadObservabilityWithFallback } from "../../lib/hatchet/orchestration.js"
import { handleCronsAction, loadCrons } from "./crons/route.js"
import { handleFiltersAction, loadFilters } from "./filters/route.js"
import { handleManagementAction, loadManagement } from "./management/route.js"
import { handleRateLimitsAction, loadRateLimits } from "./rate-limits/route.js"
import { handleRunsAction, loadRuns } from "./runs/route.js"
import { handleSchedulesAction, loadSchedules } from "./schedules/route.js"
import { handleWebhooksAction, loadWebhooks } from "./webhooks/route.js"

const runTestEffect = <A, E>(effect: Effect.Effect<A, E, unknown>) =>
  Effect.runPromise(effect as Effect.Effect<A, E, never>)

const expectSuccess = <T>(response: HttpResponseSuccess<T>) => response.data

const expectRedirect = (
  response: HttpResponseRedirect | HttpResponseFailure<string>,
  to: string,
) => {
  expect(response._tag).toBe("HttpResponseRedirect")
  if (response._tag !== "HttpResponseRedirect") {
    throw new Error(`Expected redirect response, got ${response._tag}`)
  }
  expect(response.to).toBe(to)
}

const makeTaskSummary = (
  overrides?: Partial<HatchetTaskSummaryRecord>,
): HatchetTaskSummaryRecord => ({
  metadata: {},
  createdAt: "2026-04-12T18:45:00.000Z",
  displayName: "orders.process",
  input: {},
  numSpawnedChildren: 0,
  output: {},
  status: "RUNNING",
  taskExternalId: "task-1",
  taskId: 1,
  taskInsertedAt: "2026-04-12T18:45:00.000Z",
  tenantId: "tenant-1",
  type: "TASK",
  workflowId: "workflow-1",
  workflowName: "orders.process",
  workflowRunExternalId: "workflow-run-1",
  ...overrides,
})

const makeWorkflowRunDetails = (
  overrides?: Partial<HatchetWorkflowRunDetailsRecord>,
): HatchetWorkflowRunDetailsRecord => ({
  run: {
    metadata: {},
    status: "RUNNING",
    tenantId: "tenant-1",
    displayName: "orders.process",
    workflowId: "workflow-1",
    input: {},
    output: {},
  },
  taskEvents: [],
  shape: {
    items: [],
    triggerExternalId: "trigger-1",
  },
  tasks: [],
  ...overrides,
})

describe("hatchet demo split route boundaries", () => {
  beforeEach(() => {
    for (
      const mockFn of [
        listRunsMock,
        getRunMock,
        getRunStatusMock,
        getEventMock,
        runWorkflowMock,
        pushEventMock,
        replayRunMock,
        cancelRunMock,
        listSchedulesMock,
        getScheduleMock,
        createScheduleMock,
        listCronsMock,
        getCronMock,
        createCronMock,
        deleteCronMock,
        listFiltersMock,
        getFilterMock,
        createFilterMock,
        deleteFilterMock,
        listWebhooksMock,
        getWebhookMock,
        createWebhookMock,
        deleteWebhookMock,
        listRateLimitsMock,
        upsertRateLimitMock,
        getTaskMetricsMock,
        getQueueMetricsMock,
        getRunTaskIdMock,
        listTaskLogsMock,
        deleteWorkflowMock,
      ]
    ) {
      mockFn.mockReset()
    }

    listRunsMock.mockReturnValue(Effect.succeed([]))
    listSchedulesMock.mockReturnValue(Effect.succeed([]))
    listCronsMock.mockReturnValue(Effect.succeed([]))
    listFiltersMock.mockReturnValue(Effect.succeed([]))
    listWebhooksMock.mockReturnValue(Effect.succeed([]))
    listRateLimitsMock.mockReturnValue(Effect.succeed([]))
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
  })

  it("runs loader only loads run data and related selections", async () => {
    listRunsMock.mockReturnValue(
      Effect.succeed([
        makeTaskSummary({
          displayName: "Order pipeline",
          workflowRunExternalId: "workflow-run-123",
        }),
      ]),
    )
    getEventMock.mockReturnValue(Effect.succeed({ eventId: "event-1" }))
    getRunMock.mockReturnValue(
      Effect.succeed(
        makeWorkflowRunDetails({
          run: {
            metadata: {},
            status: "RUNNING",
            tenantId: "tenant-1",
            displayName: "Order pipeline",
            workflowId: "workflow-1",
            input: {},
            output: {},
          },
        }),
      ),
    )
    getRunStatusMock.mockReturnValue(Effect.succeed("RUNNING"))

    const response = await runTestEffect(
      loadRuns(
        new Request(
          "https://example.com/hatchet-demo/runs?eventId=event-1&runId=run-1",
        ),
      ),
    )

    expect(expectSuccess(response).runs).toEqual([
      {
        id: "workflow-run-123",
        workflowName: "orders.process",
        status: "RUNNING",
        displayName: "Order pipeline",
      },
    ])
    expect(expectSuccess(response).run).toEqual({
      id: "run-1",
      workflowName: "Order pipeline",
      status: "RUNNING",
      displayName: "Order pipeline",
      details: {
        metadata: {},
        status: "RUNNING",
        tenantId: "tenant-1",
        displayName: "Order pipeline",
        workflowId: "workflow-1",
        input: {},
        output: {},
      },
    })
    expect(listRunsMock).toHaveBeenCalledOnce()
    expect(getEventMock).toHaveBeenCalledWith("event-1")
    expect(getRunMock).toHaveBeenCalledWith("run-1")
    expect(getRunStatusMock).toHaveBeenCalledWith("run-1")
    expect(listSchedulesMock).not.toHaveBeenCalled()
  })

  it("runs action owns run, push, replay, and cancel intents", async () => {
    runWorkflowMock.mockReturnValue(Effect.succeed({ id: "run-1" }))
    pushEventMock.mockReturnValue(Effect.succeed({ eventId: "event-1" }))
    replayRunMock.mockReturnValue(Effect.succeed({ ids: ["task-1"] }))
    cancelRunMock.mockReturnValue(Effect.succeed(undefined))

    const runForm = new FormData()
    runForm.set("intent", "run")
    runForm.set("workflowName", "orders.process")
    runForm.set("input", '{"userId":"user-1"}')
    expectRedirect(
      await runTestEffect(
        handleRunsAction(
          new Request("https://example.com/hatchet-demo/runs", {
            method: "POST",
            body: runForm,
          }),
        ),
      ),
      "/hatchet-demo/runs",
    )

    const pushForm = new FormData()
    pushForm.set("intent", "push")
    pushForm.set("eventKey", "user.created")
    pushForm.set("eventPayload", '{"userId":"user-1"}')
    expectRedirect(
      await runTestEffect(
        handleRunsAction(
          new Request("https://example.com/hatchet-demo/runs", {
            method: "POST",
            body: pushForm,
          }),
        ),
      ),
      "/hatchet-demo/runs?eventId=event-1",
    )

    const replayForm = new FormData()
    replayForm.set("intent", "replay")
    replayForm.set("runId", "run-1")
    expectRedirect(
      await runTestEffect(
        handleRunsAction(
          new Request("https://example.com/hatchet-demo/runs", {
            method: "POST",
            body: replayForm,
          }),
        ),
      ),
      "/hatchet-demo/runs?runId=run-1",
    )

    const cancelForm = new FormData()
    cancelForm.set("intent", "cancel")
    cancelForm.set("runId", "run-1")
    expectRedirect(
      await runTestEffect(
        handleRunsAction(
          new Request("https://example.com/hatchet-demo/runs?runId=run-1", {
            method: "POST",
            body: cancelForm,
          }),
        ),
      ),
      "/hatchet-demo/runs?runId=run-1",
    )
  })

  it("slice loaders stay isolated and create/delete actions stay in their child routes", async () => {
    getScheduleMock.mockReturnValue(
      Effect.succeed({
        scheduleId: "schedule-1",
        workflowName: "orders.process",
        triggerAt: new Date("2026-04-12T18:45:00.000Z"),
        input: {},
      }),
    )
    getCronMock.mockReturnValue(
      Effect.succeed({
        cronId: "cron-1",
        workflowName: "orders.process",
        cron: "0 0 * * *",
        enabled: true,
        method: "DEFAULT",
        input: {},
      }),
    )
    getFilterMock.mockReturnValue(
      Effect.succeed({
        filterId: "filter-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "true",
        payload: {},
      }),
    )
    getWebhookMock.mockReturnValue(
      Effect.succeed({
        webhookId: "webhook-1",
        name: "github-prs",
        sourceName: "GITHUB",
        authType: "API_KEY",
        eventKeyExpression: "body.action",
        scopeExpression: undefined,
        staticPayload: {},
      }),
    )
    createScheduleMock.mockReturnValue(
      Effect.succeed({ scheduleId: "schedule-1" }),
    )
    createCronMock.mockReturnValue(Effect.succeed({ cronId: "cron-1" }))
    createFilterMock.mockReturnValue(Effect.succeed({ filterId: "filter-1" }))
    createWebhookMock.mockReturnValue(Effect.succeed({ name: "github-prs" }))
    upsertRateLimitMock.mockReturnValue(Effect.succeed("email:send"))
    deleteCronMock.mockReturnValue(Effect.succeed(undefined))
    deleteFilterMock.mockReturnValue(Effect.succeed(undefined))
    deleteWebhookMock.mockReturnValue(Effect.succeed(undefined))

    await runTestEffect(
      loadSchedules(
        new Request(
          "https://example.com/hatchet-demo/schedules?scheduleId=schedule-1",
        ),
      ),
    )
    await runTestEffect(
      loadCrons(
        new Request("https://example.com/hatchet-demo/crons?cronId=cron-1"),
      ),
    )
    await runTestEffect(
      loadFilters(
        new Request(
          "https://example.com/hatchet-demo/filters?filterId=filter-1",
        ),
      ),
    )
    await runTestEffect(
      loadWebhooks(
        new Request(
          "https://example.com/hatchet-demo/webhooks?webhookName=github-prs",
        ),
      ),
    )
    await runTestEffect(
      loadRateLimits(
        new Request(
          "https://example.com/hatchet-demo/rate-limits?rateLimitKey=email%3Asend",
        ),
      ),
    )

    expect(listSchedulesMock).toHaveBeenCalledOnce()
    expect(listCronsMock).toHaveBeenCalledOnce()
    expect(listFiltersMock).toHaveBeenCalledOnce()
    expect(listWebhooksMock).toHaveBeenCalledOnce()
    expect(listRateLimitsMock).toHaveBeenCalledOnce()
    expect(listRunsMock).not.toHaveBeenCalledTimes(2)

    const scheduleForm = new FormData()
    scheduleForm.set("intent", "schedule")
    scheduleForm.set("workflowName", "orders.process")
    scheduleForm.set("triggerAt", "2026-04-12T18:45:00.000Z")
    scheduleForm.set("scheduleInput", '{"userId":"user-1"}')
    expectRedirect(
      await runTestEffect(
        handleSchedulesAction(
          new Request("https://example.com/hatchet-demo/schedules", {
            method: "POST",
            body: scheduleForm,
          }),
        ),
      ),
      "/hatchet-demo/schedules?scheduleId=schedule-1",
    )

    const cronCreateForm = new FormData()
    cronCreateForm.set("intent", "create-cron")
    cronCreateForm.set("cronWorkflowName", "orders.process")
    cronCreateForm.set("cronName", "nightly-orders")
    cronCreateForm.set("cronExpression", "0 0 * * *")
    cronCreateForm.set("cronInput", '{"userId":"user-1"}')
    expectRedirect(
      await runTestEffect(
        handleCronsAction(
          new Request("https://example.com/hatchet-demo/crons", {
            method: "POST",
            body: cronCreateForm,
          }),
        ),
      ),
      "/hatchet-demo/crons?cronId=cron-1",
    )

    const filterCreateForm = new FormData()
    filterCreateForm.set("intent", "create-filter")
    filterCreateForm.set("filterWorkflowId", "workflow-1")
    filterCreateForm.set("filterScope", "tenant:demo")
    filterCreateForm.set("filterExpression", "input.kind == 'demo'")
    filterCreateForm.set("filterPayload", '{"feature":"filters"}')
    expectRedirect(
      await runTestEffect(
        handleFiltersAction(
          new Request("https://example.com/hatchet-demo/filters", {
            method: "POST",
            body: filterCreateForm,
          }),
        ),
      ),
      "/hatchet-demo/filters?filterId=filter-1",
    )

    const webhookCreateForm = new FormData()
    webhookCreateForm.set("intent", "create-webhook")
    webhookCreateForm.set("webhookName", "github-prs")
    webhookCreateForm.set("webhookSourceName", "GITHUB")
    webhookCreateForm.set("webhookEventKeyExpression", "body.action")
    webhookCreateForm.set(
      "webhookScopeExpression",
      "body.repository.full_name",
    )
    webhookCreateForm.set("webhookStaticPayload", '{"issue":"opened"}')
    webhookCreateForm.set("webhookAuthType", "HMAC")
    webhookCreateForm.set("webhookHmacAlgorithm", "SHA256")
    webhookCreateForm.set("webhookHmacEncoding", "HEX")
    webhookCreateForm.set("webhookSignatureHeaderName", "x-hub-signature-256")
    webhookCreateForm.set("webhookSigningSecret", "secret-123")
    expectRedirect(
      await runTestEffect(
        handleWebhooksAction(
          new Request("https://example.com/hatchet-demo/webhooks", {
            method: "POST",
            body: webhookCreateForm,
          }),
        ),
      ),
      "/hatchet-demo/webhooks?webhookName=github-prs",
    )

    const cronDeleteForm = new FormData()
    cronDeleteForm.set("intent", "delete-cron")
    cronDeleteForm.set("cronId", "cron-1")
    expectRedirect(
      await runTestEffect(
        handleCronsAction(
          new Request("https://example.com/hatchet-demo/crons?cronId=cron-1", {
            method: "POST",
            body: cronDeleteForm,
          }),
        ),
      ),
      "/hatchet-demo/crons",
    )

    const filterDeleteForm = new FormData()
    filterDeleteForm.set("intent", "delete-filter")
    filterDeleteForm.set("filterId", "filter-1")
    expectRedirect(
      await runTestEffect(
        handleFiltersAction(
          new Request(
            "https://example.com/hatchet-demo/filters?filterId=filter-1",
            {
              method: "POST",
              body: filterDeleteForm,
            },
          ),
        ),
      ),
      "/hatchet-demo/filters",
    )

    const webhookDeleteForm = new FormData()
    webhookDeleteForm.set("intent", "delete-webhook")
    webhookDeleteForm.set("webhookName", "github-prs")
    expectRedirect(
      await runTestEffect(
        handleWebhooksAction(
          new Request(
            "https://example.com/hatchet-demo/webhooks?webhookName=github-prs",
            {
              method: "POST",
              body: webhookDeleteForm,
            },
          ),
        ),
      ),
      "/hatchet-demo/webhooks",
    )

    const rateLimitForm = new FormData()
    rateLimitForm.set("intent", "upsert-ratelimit")
    rateLimitForm.set("rateLimitKey", "email:send")
    rateLimitForm.set("rateLimitLimit", "15")
    rateLimitForm.set("rateLimitDuration", "MINUTE")
    expectRedirect(
      await runTestEffect(
        handleRateLimitsAction(
          new Request("https://example.com/hatchet-demo/rate-limits", {
            method: "POST",
            body: rateLimitForm,
          }),
        ),
      ),
      "/hatchet-demo/rate-limits?rateLimitKey=email%3Asend",
    )
  })

  it("management keeps delete-workflow ownership and observability falls back gracefully", async () => {
    deleteWorkflowMock.mockReturnValue(Effect.succeed(undefined))
    listRunsMock.mockReturnValue(
      Effect.succeed([
        makeTaskSummary({
          workflowRunExternalId: "workflow-run-321",
          workflowName: "orders.process",
          status: "FAILED",
        }),
      ]),
    )
    getRunMock.mockReturnValue(Effect.succeed({ id: "run-1" }))
    getRunStatusMock.mockReturnValue(Effect.succeed("RUNNING"))
    getRunTaskIdMock.mockReturnValue(Effect.succeed("task-1"))
    listTaskLogsMock.mockReturnValue(Effect.succeed({ rows: [] }))
    getTaskMetricsMock.mockReturnValue(
      Effect.fail(new Error("metrics unavailable")),
    )

    const managementResponse = await runTestEffect(
      loadManagement(
        new Request("https://example.com/hatchet-demo/management?runId=run-1"),
      ),
    )
    expect(expectSuccess(managementResponse).runs).toEqual([
      {
        id: "workflow-run-321",
        workflowName: "orders.process",
        status: "FAILED",
      },
    ])
    expect(listRunsMock).toHaveBeenCalledOnce()

    const deleteWorkflowForm = new FormData()
    deleteWorkflowForm.set("intent", "delete-workflow")
    deleteWorkflowForm.set("workflowName", "orders.process")
    deleteWorkflowForm.set("confirmWorkflowDelete", "DELETE")
    expectRedirect(
      await runTestEffect(
        handleManagementAction(
          new Request("https://example.com/hatchet-demo/management", {
            method: "POST",
            body: deleteWorkflowForm,
          }),
        ),
      ),
      "/hatchet-demo/management",
    )

    const observability = await runTestEffect(
      loadObservabilityWithFallback(
        "https://example.com/hatchet-demo/observability?runId=run-1",
      ),
    )
    expect(
      "error" in observability ? observability.error : undefined,
    ).toContain("metrics unavailable")
    expect(observability.taskMetrics.byStatus.FAILED).toBe(0)
  })
})
