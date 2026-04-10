/**
 * @effectify/react-router-example - Hatchet Demo Route
 *
 * Demonstrates using Hatchet workflow client from a React Router page
 */

import type { Route } from "./+types/hatchet-demo.js"
import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import { withActionEffect, withLoaderEffect } from "../lib/runtime.server.js"
import { cancelRun, getEvent, listRuns, pushEvent, runWorkflow } from "@effectify/hatchet"
import { Form, useActionData } from "react-router"
import { buildEventRedirect, parseEventPayload, readSelectedEventId } from "./hatchet-demo.server.js"

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  const eventId = readSelectedEventId(request.url)
  const runs = yield* listRuns()

  const event = eventId ? yield* getEvent(eventId) : undefined

  return yield* httpSuccess({ event, runs })
}).pipe(withLoaderEffect)

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  const formData = yield* Effect.tryPromise({
    try: () => request.formData(),
    catch: (cause) =>
      new Error(
        cause instanceof Error ? cause.message : "Failed to read form data",
      ),
  })
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

  if (intent === "cancel") {
    const runId = String(formData.get("runId") ?? "")

    if (!runId) {
      return yield* httpFailure("Run ID is required")
    }

    yield* cancelRun(runId)
    return yield* httpRedirect("/hatchet-demo")
  }

  return yield* httpFailure("Unknown intent")
}).pipe(withActionEffect)

export default function HatchetDemo({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>()

  if (loaderData.ok) {
    const event = loaderData.data?.event
    const runs = loaderData.data?.runs ?? []

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
