import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import {
  cancelRun,
  getEvent,
  getRun,
  getRunStatus,
  listRuns,
  pushEvent,
  replayRun,
  runWorkflow,
} from "@effectify/hatchet"
import { Form, useActionData, useLoaderData } from "react-router"
import {
  type HatchetJsonObject,
  parseEventPayload,
  parseReplayIntent,
  readRequestFormData,
} from "../../../lib/hatchet/parsers.js"
import { readSelectedEventId, readSelectedRunId } from "../../../lib/hatchet/params.js"
import { buildEventRedirect, buildReplayRedirect, buildRunRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.server.js"
import type {
  HatchetTaskSummaryRecord,
  HatchetWorkflowRunDetailsRecord,
  HatchetWorkflowRunRecord,
} from "../../../lib/hatchet/run-models.js"

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

export interface HatchetDemoRunListItem {
  readonly id: string
  readonly workflowName?: string
  readonly status: string
  readonly displayName: string
}

export interface HatchetDemoSelectedRun {
  readonly id: string
  readonly workflowName: string
  readonly status: string
  readonly displayName: string
  readonly details: HatchetWorkflowRunRecord
}

const toRunListItem = (
  run: HatchetTaskSummaryRecord,
): HatchetDemoRunListItem => ({
  id: run.workflowRunExternalId,
  workflowName: run.workflowName,
  status: run.status,
  displayName: run.displayName,
})

const toSelectedRun = (
  runId: string,
  run: HatchetWorkflowRunDetailsRecord,
  status: string,
): HatchetDemoSelectedRun => ({
  id: runId,
  workflowName: run.run.displayName,
  status,
  displayName: run.run.displayName,
  details: run.run,
})

export const loadRuns = (request: Request) =>
  Effect.gen(function*() {
    const selectedEventId = readSelectedEventId(request.url)
    const selectedRunId = readSelectedRunId(request.url)
    const runs = yield* listRuns<HatchetTaskSummaryRecord>()
    const event = selectedEventId
      ? yield* getEvent<HatchetJsonObject>(selectedEventId)
      : undefined
    const run = selectedRunId
      ? yield* getRun<HatchetWorkflowRunDetailsRecord>(selectedRunId)
      : undefined
    const status = selectedRunId
      ? yield* getRunStatus(selectedRunId)
      : undefined

    return yield* httpSuccess({
      runs: runs.map(toRunListItem),
      event,
      selectedRunId,
      run: run && status && selectedRunId
        ? toSelectedRun(selectedRunId, run, status)
        : undefined,
      status,
    })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadRuns(request)
}).pipe(withLoaderEffect)

export const handleRunsAction = (request: Request) =>
  Effect.gen(function*() {
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")

    if (intent === "run") {
      const workflowName = String(formData.get("workflowName") ?? "").trim()
      const inputStr = String(formData.get("input") ?? "{}")

      if (!workflowName) {
        return yield* httpFailure("Workflow name is required")
      }

      let input: HatchetJsonObject
      try {
        input = parseEventPayload(inputStr)
      } catch {
        return yield* httpFailure("Invalid JSON input")
      }

      yield* runWorkflow(workflowName, input)
      return yield* httpRedirect("/hatchet-demo/runs")
    }

    if (intent === "push") {
      const eventKey = String(formData.get("eventKey") ?? "").trim()
      const eventPayloadInput = String(formData.get("eventPayload") ?? "{}")

      if (!eventKey) {
        return yield* httpFailure("Event key is required")
      }

      let eventPayload: HatchetJsonObject
      try {
        eventPayload = parseEventPayload(eventPayloadInput)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid event payload",
        )
      }

      const event = yield* pushEvent(eventKey, eventPayload, {
        additionalMetadata: { source: "react-router-example" },
        scope: "demo",
      })

      return yield* httpRedirect(buildEventRedirect(event.eventId))
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

    if (intent === "cancel") {
      const runId = String(formData.get("runId") ?? "").trim()

      if (!runId) {
        return yield* httpFailure("Run ID is required")
      }

      yield* cancelRun(runId)
      return yield* httpRedirect(buildRunRedirect(runId))
    }

    return yield* httpFailure("Unknown intent")
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleRunsAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoRunsRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  if (!loaderData.ok) {
    return <p>Loading...</p>
  }

  const actionError = getActionError(actionData)
  const { event, run, runs, selectedRunId, status } = loaderData.data

  return (
    <>
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
              defaultValue="user-notification-workflow"
            />
            <label htmlFor="input">Input (JSON)</label>
            <textarea
              id="input"
              name="input"
              rows={3}
              defaultValue='{"userId": "user-123", "action": "welcome"}'
            />
          </fieldset>
          <input type="hidden" name="intent" value="run" />
          {actionError ? <small role="alert">{actionError}</small> : null}
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
              defaultValue="user.created"
            />
            <label htmlFor="eventPayload">Payload (JSON object)</label>
            <textarea
              id="eventPayload"
              name="eventPayload"
              rows={3}
              defaultValue='{"userId": "user-123", "source": "demo"}'
            />
          </fieldset>
          <input type="hidden" name="intent" value="push" />
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

      <section>
        <h3>Selected Run</h3>
        {run && selectedRunId ?
          (
            <div>
              <p>
                <strong>Run ID:</strong> {selectedRunId}
              </p>
              <p>
                <strong>Status:</strong> {status ?? "unknown"}
              </p>
              <pre>{JSON.stringify(run.details, null, 2)}</pre>
            </div>
          ) :
          <p>Select a recent run to inspect it here.</p>}
      </section>

      <section>
        <h3>Recent Runs</h3>
        {runs.length === 0 ? <p>No runs found. Run a workflow to see it here.</p> : (
          <ul>
            {runs.map((currentRun) => (
              <li key={currentRun.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>
                      {currentRun.workflowName ?? currentRun.displayName}
                    </strong>
                    <span>—</span>
                    <span>{currentRun.status ?? "unknown"}</span>
                    <span></span>
                    <a href={buildRunRedirect(currentRun.id)}>Inspect</a>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="replay" />
                    <input type="hidden" name="runId" value={currentRun.id} />
                    <button type="submit">Replay</button>
                  </Form>
                  {currentRun.status !== "COMPLETED" &&
                      currentRun.status !== "CANCELLED" ?
                    (
                      <Form method="post">
                        <input type="hidden" name="intent" value="cancel" />
                        <input type="hidden" name="runId" value={currentRun.id} />
                        <button
                          type="submit"
                          aria-label={`Cancel run ${currentRun.id}`}
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
    </>
  )
}
