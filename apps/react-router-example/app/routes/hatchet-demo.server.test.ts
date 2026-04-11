import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { beforeEach, describe, expect, it, vi } from "vitest"

const pushEventMock = vi.fn()
const getEventMock = vi.fn()
const createScheduleMock = vi.fn()
const getScheduleMock = vi.fn()
const listSchedulesMock = vi.fn()
const createCronMock = vi.fn()
const getCronMock = vi.fn()
const listCronsMock = vi.fn()
const deleteCronMock = vi.fn()
const listRunsMock = vi.fn()
const cancelRunMock = vi.fn()
const runWorkflowMock = vi.fn()
const getRunMock = vi.fn()
const getRunStatusMock = vi.fn()
const getRunTaskIdMock = vi.fn()
const listTaskLogsMock = vi.fn()
const getTaskMetricsMock = vi.fn()
const getQueueMetricsMock = vi.fn()

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
  listRuns: (...args: Array<unknown>) => listRunsMock(...args),
  cancelRun: (...args: Array<unknown>) => cancelRunMock(...args),
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
  buildScheduleRedirect,
  parseEventPayload,
  parseTriggerTime,
  readSelectedCronId,
  readSelectedEventId,
  readSelectedRunId,
  readSelectedScheduleId,
  readSelectedTaskId,
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
    listRunsMock.mockReset()
    cancelRunMock.mockReset()
    runWorkflowMock.mockReset()
    getRunMock.mockReset()
    getRunStatusMock.mockReset()
    getRunTaskIdMock.mockReset()
    listTaskLogsMock.mockReset()
    getTaskMetricsMock.mockReset()
    getQueueMetricsMock.mockReset()
    listCronsMock.mockReturnValue(Effect.succeed([]))
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
})
