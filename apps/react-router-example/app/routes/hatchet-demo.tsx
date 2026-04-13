/**
 * @effectify/react-router-example - Hatchet Demo Route
 *
 * Demonstrates using Hatchet workflow client from a React Router page
 */

import type { Route } from "./+types/hatchet-demo.js"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import { withActionEffect, withLoaderEffect } from "../lib/runtime.server.js"
import {
  cancelRun,
  createCron,
  createFilter,
  createSchedule,
  createWebhook,
  deleteCron,
  deleteFilter,
  deleteWebhook,
  deleteWorkflow,
  getCron,
  getEvent,
  getFilter,
  getQueueMetrics,
  getRun,
  getRunStatus,
  getRunTaskId,
  getSchedule,
  getTaskMetrics,
  getWebhook,
  listCrons,
  listFilters,
  listRateLimits,
  listRuns,
  listSchedules,
  listTaskLogs,
  listWebhooks,
  pushEvent,
  replayRun,
  runWorkflow,
  upsertRateLimit,
} from "@effectify/hatchet"
import { Form, useActionData } from "react-router"
import { HatchetDemoCronsSection } from "./hatchet-demo-crons.js"
import { HatchetDemoFiltersSection } from "./hatchet-demo-filters.js"
import { HatchetDemoManagementSection } from "./hatchet-demo-management.js"
import { HatchetDemoObservabilitySection } from "./hatchet-demo-observability.js"
import { HatchetDemoRateLimitsSection } from "./hatchet-demo-ratelimits.js"
import { HatchetDemoSchedulesSection } from "./hatchet-demo-schedules.js"
import { HatchetDemoWebhooksSection } from "./hatchet-demo-webhooks.js"
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

const defaultObservability = (input?: {
  readonly selectedRunId?: string
  readonly selectedTaskId?: string
  readonly error?: string
}) => ({
  selectedRunId: input?.selectedRunId,
  selectedTaskId: input?.selectedTaskId,
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
  error: input?.error,
})

const loadObservability = (requestUrl: string) =>
  Effect.gen(function*() {
    const selectedRunId = readSelectedRunId(requestUrl)
    const selectedTaskId = readSelectedTaskId(requestUrl)

    const taskMetricsEffect = getTaskMetrics({
      since: new Date(0).toISOString(),
    })
    const queueMetricsEffect = getQueueMetrics()

    if (selectedRunId) {
      const { run, status, taskId, taskMetrics, queueMetrics } = yield* Effect.all(
        {
          run: getRun(selectedRunId),
          status: getRunStatus(selectedRunId),
          taskId: getRunTaskId(selectedRunId),
          taskMetrics: taskMetricsEffect,
          queueMetrics: queueMetricsEffect,
        },
        { concurrency: "unbounded" },
      )

      const logs = yield* listTaskLogs(taskId)

      return {
        selectedRunId,
        selectedTaskId: taskId,
        run: run as Record<string, unknown>,
        status,
        logs,
        taskMetrics,
        queueMetrics,
      }
    }

    if (selectedTaskId) {
      const { logs, taskMetrics, queueMetrics } = yield* Effect.all(
        {
          logs: listTaskLogs(selectedTaskId),
          taskMetrics: taskMetricsEffect,
          queueMetrics: queueMetricsEffect,
        },
        { concurrency: "unbounded" },
      )

      return {
        selectedRunId,
        selectedTaskId,
        logs,
        taskMetrics,
        queueMetrics,
      }
    }

    const { taskMetrics, queueMetrics } = yield* Effect.all(
      {
        taskMetrics: taskMetricsEffect,
        queueMetrics: queueMetricsEffect,
      },
      { concurrency: "unbounded" },
    )

    return {
      selectedRunId,
      selectedTaskId,
      taskMetrics,
      queueMetrics,
    }
  })

export const loadHatchetDemo = (request: Request) =>
  Effect.gen(function*() {
    const eventId = readSelectedEventId(request.url)
    const scheduleId = readSelectedScheduleId(request.url)
    const cronId = readSelectedCronId(request.url)
    const filterId = readSelectedFilterId(request.url)
    const webhookName = readSelectedWebhookName(request.url)
    const selectedRateLimitKey = readSelectedRateLimitKey(request.url)
    const { runs, schedules, crons, filters, webhooks, ratelimits } = yield* Effect.all(
      {
        runs: listRuns(),
        schedules: listSchedules(),
        crons: listCrons(),
        filters: listFilters(),
        webhooks: listWebhooks(),
        ratelimits: listRateLimits(),
      },
      { concurrency: "unbounded" },
    )

    const event = eventId ? yield* getEvent(eventId) : undefined
    const schedule = scheduleId ? yield* getSchedule(scheduleId) : undefined
    const cron = cronId ? yield* getCron(cronId) : undefined
    const filter = filterId ? yield* getFilter(filterId) : undefined
    const webhook = webhookName ? yield* getWebhook(webhookName) : undefined
    const observabilityResult = yield* Effect.exit(
      loadObservability(request.url),
    )
    const observabilityCause = observabilityResult._tag === "Failure"
      ? Cause.squash(observabilityResult.cause)
      : undefined
    const observability = observabilityResult._tag === "Success"
      ? observabilityResult.value
      : defaultObservability({
        selectedRunId: readSelectedRunId(request.url),
        selectedTaskId: readSelectedTaskId(request.url),
        error: observabilityCause instanceof Error
          ? observabilityCause.message
          : "Observability is temporarily unavailable",
      })

    return yield* httpSuccess({
      event,
      schedule,
      schedules,
      cron,
      crons,
      filter,
      filters,
      webhook,
      webhooks,
      ratelimits,
      selectedRateLimitKey,
      runs,
      observability,
    })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadHatchetDemo(request)
}).pipe(withLoaderEffect)

export const handleHatchetDemoAction = (request: Request) =>
  Effect.gen(function*() {
    const formDataExit = yield* Effect.exit(
      Effect.tryPromise({
        try: () => request.formData(),
        catch: (cause) =>
          new Error(
            cause instanceof Error ? cause.message : "Failed to read form data",
          ),
      }),
    )

    if (formDataExit._tag === "Failure") {
      const error = Cause.squash(formDataExit.cause)
      return yield* httpFailure(
        error instanceof Error ? error.message : "Failed to read form data",
      )
    }

    const formData = formDataExit.value
    const intent = String(formData.get("intent") ?? "")

    if (intent === "run") {
      const workflowName = String(formData.get("workflowName") ?? "")
      const inputStr = String(formData.get("input") ?? "{}")

      if (!workflowName) {
        return yield* httpFailure("Workflow name is required")
      }

      let input: Record<string, unknown>
      try {
        input = JSON.parse(inputStr)
      } catch {
        return yield* httpFailure("Invalid JSON input")
      }

      yield* runWorkflow(workflowName, input)
      return yield* httpRedirect("/hatchet-demo")
    }

    if (intent === "push") {
      const eventKey = String(formData.get("eventKey") ?? "").trim()
      const eventPayloadInput = String(formData.get("eventPayload") ?? "{}")

      if (!eventKey) {
        return yield* httpFailure("Event key is required")
      }

      let eventPayload: Record<string, unknown>
      try {
        eventPayload = parseEventPayload(eventPayloadInput)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid event payload",
        )
      }

      const event = yield* pushEvent(eventKey, eventPayload, {
        additionalMetadata: {
          source: "react-router-example",
        },
        scope: "demo",
      })

      return yield* httpRedirect(buildEventRedirect(event.eventId))
    }

    if (intent === "schedule") {
      const workflowName = String(formData.get("workflowName") ?? "").trim()
      const triggerAtInput = String(formData.get("triggerAt") ?? "").trim()
      const scheduleInputStr = String(formData.get("scheduleInput") ?? "{}")

      if (!workflowName) {
        return yield* httpFailure("Workflow name is required")
      }

      let triggerAt: Date
      try {
        triggerAt = parseTriggerTime(triggerAtInput)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid trigger time",
        )
      }

      let scheduleInput: Record<string, unknown>
      try {
        scheduleInput = parseEventPayload(scheduleInputStr)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid schedule input",
        )
      }

      const schedule = yield* createSchedule(workflowName, {
        triggerAt,
        input: scheduleInput,
        additionalMetadata: {
          source: "react-router-example",
        },
      })

      return yield* httpRedirect(buildScheduleRedirect(schedule.scheduleId))
    }

    if (intent === "create-cron") {
      const workflowName = String(
        formData.get("cronWorkflowName") ?? "",
      ).trim()
      const cronName = String(formData.get("cronName") ?? "").trim()
      const cronExpression = String(
        formData.get("cronExpression") ?? "",
      ).trim()
      const cronInputStr = String(formData.get("cronInput") ?? "{}")

      if (!workflowName) {
        return yield* httpFailure("Workflow name is required")
      }

      if (!cronName) {
        return yield* httpFailure("Cron name is required")
      }

      if (!cronExpression) {
        return yield* httpFailure("Cron expression is required")
      }

      let cronInput: Record<string, unknown>
      try {
        cronInput = parseEventPayload(cronInputStr)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid cron input",
        )
      }

      const cron = yield* createCron(workflowName, {
        name: cronName,
        expression: cronExpression,
        input: cronInput,
        additionalMetadata: {
          source: "react-router-example",
        },
      })

      return yield* httpRedirect(buildCronRedirect(cron.cronId))
    }

    if (intent === "create-filter") {
      const workflowId = String(formData.get("filterWorkflowId") ?? "").trim()
      const scope = String(formData.get("filterScope") ?? "").trim()
      const expression = String(formData.get("filterExpression") ?? "").trim()
      const payloadInput = String(formData.get("filterPayload") ?? "")

      if (!workflowId) {
        return yield* httpFailure("Workflow ID is required")
      }

      if (!scope) {
        return yield* httpFailure("Filter scope is required")
      }

      if (!expression) {
        return yield* httpFailure("Filter expression is required")
      }

      let payload: Record<string, unknown> | undefined

      try {
        payload = payloadInput.trim()
          ? parseEventPayload(payloadInput)
          : undefined
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid filter payload",
        )
      }

      const filter = yield* createFilter({
        workflowId,
        scope,
        expression,
        payload,
      })

      return yield* httpRedirect(buildFilterRedirect(filter.filterId))
    }

    if (intent === "delete-filter") {
      const filterId = String(formData.get("filterId") ?? "").trim()

      if (!filterId) {
        return yield* httpFailure("Filter ID is required")
      }

      yield* deleteFilter(filterId)
      return yield* httpRedirect("/hatchet-demo")
    }

    if (intent === "delete-cron") {
      const cronId = String(formData.get("cronId") ?? "").trim()

      if (!cronId) {
        return yield* httpFailure("Cron ID is required")
      }

      yield* deleteCron(cronId)
      return yield* httpRedirect("/hatchet-demo")
    }

    if (intent === "create-webhook") {
      const webhookName = String(formData.get("webhookName") ?? "").trim()
      const eventKeyExpression = String(
        formData.get("webhookEventKeyExpression") ?? "",
      ).trim()
      const scopeExpression = String(
        formData.get("webhookScopeExpression") ?? "",
      ).trim()
      const staticPayloadInput = String(
        formData.get("webhookStaticPayload") ?? "",
      )

      if (!webhookName) {
        return yield* httpFailure("Webhook name is required")
      }

      if (!eventKeyExpression) {
        return yield* httpFailure("Webhook event key expression is required")
      }

      let sourceName: ReturnType<typeof parseWebhookSourceName>
      let auth: ReturnType<typeof parseWebhookAuth>
      let staticPayload: ReturnType<typeof parseWebhookStaticPayload>

      try {
        sourceName = parseWebhookSourceName(
          String(formData.get("webhookSourceName") ?? ""),
        )
        auth = parseWebhookAuth(formData)
        staticPayload = parseWebhookStaticPayload(staticPayloadInput)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid webhook form",
        )
      }

      const webhook = yield* createWebhook({
        name: webhookName,
        sourceName,
        eventKeyExpression,
        scopeExpression: scopeExpression || undefined,
        staticPayload,
        auth,
      })

      return yield* httpRedirect(buildWebhookRedirect(webhook.name))
    }

    if (intent === "delete-webhook") {
      const webhookName = String(formData.get("webhookName") ?? "").trim()

      if (!webhookName) {
        return yield* httpFailure("Webhook name is required")
      }

      yield* deleteWebhook(webhookName)
      return yield* httpRedirect("/hatchet-demo")
    }

    if (intent === "upsert-ratelimit") {
      const rateLimitKey = String(formData.get("rateLimitKey") ?? "").trim()
      const limitInput = String(formData.get("rateLimitLimit") ?? "").trim()
      const durationInput = String(
        formData.get("rateLimitDuration") ?? "",
      ).trim()

      if (!rateLimitKey) {
        return yield* httpFailure("Rate limit key is required")
      }

      const limit = Number(limitInput)

      if (!Number.isInteger(limit) || limit < 1) {
        return yield* httpFailure(
          "Rate limit limit must be a positive integer",
        )
      }

      let duration: ReturnType<typeof parseRateLimitDuration> | undefined

      try {
        duration = durationInput
          ? parseRateLimitDuration(durationInput)
          : undefined
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error
            ? error.message
            : "Invalid rate limit duration",
        )
      }

      const key = yield* upsertRateLimit({
        key: rateLimitKey,
        limit,
        duration,
      })

      return yield* httpRedirect(buildRateLimitRedirect(key))
    }

    if (intent === "replay") {
      let replayIntent: ReturnType<typeof parseReplayIntent>

      try {
        replayIntent = parseReplayIntent(formData)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Run ID is required",
        )
      }

      yield* replayRun(replayIntent.runId)
      return yield* httpRedirect(buildReplayRedirect(replayIntent.runId))
    }

    if (intent === "delete-workflow") {
      let deleteIntent: ReturnType<typeof parseDeleteWorkflowIntent>

      try {
        deleteIntent = parseDeleteWorkflowIntent(formData)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error
            ? error.message
            : "Type DELETE to confirm workflow deletion",
        )
      }

      yield* deleteWorkflow(deleteIntent.workflowName)
      return yield* httpRedirect("/hatchet-demo")
    }

    if (intent === "cancel") {
      const runId = String(formData.get("runId") ?? "")

      if (!runId) {
        return yield* httpFailure("Run ID is required")
      }

      yield* cancelRun(runId)
      return yield* httpRedirect("/hatchet-demo")
    }

    return yield* httpFailure("Unknown intent")
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleHatchetDemoAction(request)
}).pipe(withActionEffect)

export default function HatchetDemo({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>()

  if (loaderData.ok) {
    const event = loaderData.data?.event
    const schedule = loaderData.data?.schedule
    const schedules = loaderData.data?.schedules ?? []
    const cron = loaderData.data?.cron
    const crons = loaderData.data?.crons ?? []
    const filter = loaderData.data?.filter
    const filters = loaderData.data?.filters ?? []
    const webhook = loaderData.data?.webhook
    const webhooks = loaderData.data?.webhooks ?? []
    const ratelimits = loaderData.data?.ratelimits ?? []
    const selectedRateLimitKey = loaderData.data?.selectedRateLimitKey
    const runs = loaderData.data?.runs ?? []
    const observability = loaderData.data?.observability ?? defaultObservability()
    const actionError = actionData && actionData.ok === false && actionData.errors?.length
      ? String(actionData.errors[0])
      : undefined

    return (
      <main className="container">
        <article>
          <h2>Hatchet Workflow Demo</h2>

          {/* Run Workflow Form */}
          <section>
            <h3>Run Workflow</h3>
            <Form method="post">
              <fieldset>
                <label htmlFor="workflowName">Workflow Name</label>
                <input
                  id="workflowName"
                  name="workflowName"
                  type="text"
                  required
                  placeholder="e.g., user-notification-workflow"
                  defaultValue="user-notification-workflow"
                />
                <label htmlFor="input">Input (JSON)</label>
                <textarea
                  id="input"
                  name="input"
                  placeholder='{"userId": "user-123", "action": "welcome"}'
                  defaultValue='{"userId": "user-123", "action": "welcome"}'
                  rows={3}
                />
              </fieldset>
              <input type="hidden" name="intent" value="run" />
              {actionData &&
                  actionData.ok === false &&
                  actionData.errors?.length ?
                (
                  <small
                    role="alert"
                    aria-live="assertive"
                    style={{ color: "var(--pico-color-red-500)" }}
                  >
                    {String(actionData.errors[0])}
                  </small>
                ) :
                null}
              <button type="submit">Run Workflow</button>
            </Form>
          </section>

          <section>
            <h3>Push Event</h3>
            <Form method="post">
              <fieldset>
                <label htmlFor="eventKey">Event Key</label>
                <input
                  id="eventKey"
                  name="eventKey"
                  type="text"
                  required
                  placeholder="e.g., user.created"
                  defaultValue="user.created"
                />
                <label htmlFor="eventPayload">Payload (JSON object)</label>
                <textarea
                  id="eventPayload"
                  name="eventPayload"
                  placeholder='{"userId": "user-123", "source": "demo"}'
                  defaultValue='{"userId": "user-123", "source": "demo"}'
                  rows={3}
                />
              </fieldset>
              <input type="hidden" name="intent" value="push" />
              {actionData &&
                  actionData.ok === false &&
                  actionData.errors?.length ?
                (
                  <small
                    role="alert"
                    aria-live="assertive"
                    style={{ color: "var(--pico-color-red-500)" }}
                  >
                    {String(actionData.errors[0])}
                  </small>
                ) :
                null}
              <button type="submit">Push Event</button>
            </Form>
          </section>

          <section>
            <h3>Selected Event</h3>
            {event ?
              (
                <div>
                  <p>
                    <strong>Event ID:</strong> {event.eventId}
                  </p>
                  <p>
                    <strong>Key:</strong> {event.key}
                  </p>
                  <p>
                    <strong>Scope:</strong> {event.scope ?? "demo"}
                  </p>
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </div>
              ) :
              <p>Push an event to inspect it here.</p>}
          </section>

          <HatchetDemoSchedulesSection
            actionError={actionError}
            schedule={schedule}
            schedules={schedules}
          />

          <HatchetDemoCronsSection
            actionError={actionError}
            cron={cron}
            crons={crons}
          />

          <HatchetDemoFiltersSection
            actionError={actionError}
            filter={filter}
            filters={filters}
          />

          <HatchetDemoWebhooksSection
            actionError={actionError}
            webhook={webhook}
            webhooks={webhooks}
          />

          <HatchetDemoRateLimitsSection
            actionError={actionError}
            selectedRateLimitKey={selectedRateLimitKey}
            ratelimits={ratelimits}
          />

          <HatchetDemoManagementSection
            actionError={actionError}
            selectedRunId={observability.selectedRunId}
            runs={runs.map((run: any) => ({
              id: String(run.id),
              workflowName: run.workflowName,
              status: run.status,
            }))}
          />

          {/* List Runs */}
          <section>
            <h3>Recent Runs</h3>
            {runs.length === 0 ? <p>No runs found. Run a workflow to see it here.</p> : (
              <ul>
                {runs.map((run: any) => (
                  <li key={String(run.id)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong>{run.workflowName ?? run.id}</strong>
                        <span>—</span>
                        <span>{run.status ?? "unknown"}</span>
                        <span>
                          <a href={buildRunRedirect(String(run.id))}>Inspect</a>
                        </span>
                      </div>
                      {run.status !== "COMPLETED" &&
                          run.status !== "CANCELLED" ?
                        (
                          <Form method="post">
                            <input type="hidden" name="intent" value="cancel" />
                            <input
                              type="hidden"
                              name="runId"
                              value={String(run.id)}
                            />
                            <button
                              type="submit"
                              aria-label={`Cancel run ${run.id}`}
                            >
                              Cancel
                            </button>
                          </Form>
                        ) :
                        null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <HatchetDemoObservabilitySection observability={observability} />
        </article>
      </main>
    )
  }

  return (
    <main className="container">
      <article>
        <h2>Hatchet Workflow Demo</h2>
        <p>Loading...</p>
      </article>
    </main>
  )
}
