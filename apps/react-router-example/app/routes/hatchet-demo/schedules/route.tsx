import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import { createSchedule, getSchedule, type HatchetScheduleRecord, listSchedules } from "@effectify/hatchet"
import { Form, useActionData, useLoaderData } from "react-router"
import { parseEventPayload, parseTriggerTime, readRequestFormData } from "../../../lib/hatchet/parsers.js"
import { readSelectedScheduleId } from "../../../lib/hatchet/params.js"
import { buildScheduleRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.server.js"

export interface HatchetDemoSchedulesSectionProps {
  readonly actionError?: string
  readonly schedule?: HatchetScheduleRecord
  readonly schedules: readonly HatchetScheduleRecord[]
}

export const HatchetDemoSchedulesSection = ({
  actionError,
  schedule,
  schedules,
}: HatchetDemoSchedulesSectionProps) => (
  <>
    <section>
      <h3>Create Schedule</h3>
      <Form method="post">
        <fieldset>
          <label htmlFor="scheduleWorkflowName">Workflow Name</label>
          <input
            id="scheduleWorkflowName"
            name="workflowName"
            type="text"
            required
            defaultValue="user-notification-workflow"
          />
          <label htmlFor="triggerAt">Trigger At (ISO)</label>
          <input
            id="triggerAt"
            name="triggerAt"
            type="text"
            required
            defaultValue="2026-04-12T18:45:00.000Z"
          />
          <label htmlFor="scheduleInput">Input (JSON object)</label>
          <textarea
            id="scheduleInput"
            name="scheduleInput"
            rows={3}
            defaultValue='{"userId": "user-123", "source": "demo"}'
          />
        </fieldset>
        <input type="hidden" name="intent" value="schedule" />
        {actionError ? <small role="alert">{actionError}</small> : null}
        <button type="submit">Create Schedule</button>
      </Form>
    </section>

    <section>
      <h3>Selected Schedule</h3>
      {schedule ?
        (
          <div>
            <p>
              <strong>Schedule ID:</strong> {schedule.scheduleId}
            </p>
            <p>
              <strong>Workflow:</strong> {schedule.workflowName}
            </p>
            <p>
              <strong>Trigger At:</strong> {schedule.triggerAt.toISOString()}
            </p>
            <pre>{JSON.stringify(schedule.input ?? {}, null, 2)}</pre>
          </div>
        ) :
        <p>Create a schedule to inspect it here.</p>}
    </section>

    <section>
      <h3>Scheduled Runs</h3>
      {schedules.length === 0 ? <p>No schedules found. Create one to see it here.</p> : (
        <ul>
          {schedules.map((scheduled) => (
            <li key={scheduled.scheduleId}>
              <strong>{scheduled.workflowName}</strong>
              <span>—</span>
              <span>{scheduled.triggerAt.toISOString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
)

const getActionError = (actionData: unknown): string | undefined => {
  if (
    actionData &&
    typeof actionData === "object" &&
    "ok" in actionData &&
    actionData.ok === false &&
    "errors" in actionData &&
    Array.isArray(actionData.errors) &&
    actionData.errors.length > 0
  ) {
    return String(actionData.errors[0])
  }

  return undefined
}

export const loadSchedules = (request: Request) =>
  Effect.gen(function*() {
    const selectedScheduleId = readSelectedScheduleId(request.url)
    const schedules = yield* listSchedules()
    const schedule = selectedScheduleId
      ? yield* getSchedule(selectedScheduleId)
      : undefined

    return yield* httpSuccess({ schedules, schedule })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadSchedules(request)
}).pipe(withLoaderEffect)

export const handleSchedulesAction = (request: Request) =>
  Effect.gen(function*() {
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")

    if (intent !== "schedule") {
      return yield* httpFailure("Unknown intent")
    }

    const workflowName = String(formData.get("workflowName") ?? "").trim()
    const triggerAtInput = String(formData.get("triggerAt") ?? "").trim()
    const scheduleInputStr = String(formData.get("scheduleInput") ?? "{}")

    if (!workflowName) {
      return yield* httpFailure("Workflow name is required")
    }

    let triggerAt: Date
    let scheduleInput: Record<string, unknown>

    try {
      triggerAt = parseTriggerTime(triggerAtInput)
      scheduleInput = parseEventPayload(scheduleInputStr)
    } catch (error) {
      return yield* httpFailure(
        error instanceof Error ? error.message : "Invalid schedule input",
      )
    }

    const schedule = yield* createSchedule(workflowName, {
      triggerAt,
      input: scheduleInput,
      additionalMetadata: { source: "react-router-example" },
    })

    return yield* httpRedirect(buildScheduleRedirect(schedule.scheduleId))
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleSchedulesAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoSchedulesRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  if (!loaderData.ok) {
    return <p>Loading...</p>
  }

  return (
    <HatchetDemoSchedulesSection
      actionError={getActionError(actionData)}
      schedule={loaderData.data.schedule}
      schedules={loaderData.data.schedules}
    />
  )
}
