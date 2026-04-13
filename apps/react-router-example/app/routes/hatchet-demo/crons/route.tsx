import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import { createCron, deleteCron, getCron, type HatchetCronRecord, listCrons } from "@effectify/hatchet"
import { Form, useActionData, useLoaderData } from "react-router"
import { parseEventPayload, readRequestFormData } from "../../../lib/hatchet/parsers.js"
import { readSelectedCronId } from "../../../lib/hatchet/params.js"
import { buildCronRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.server.js"

export interface HatchetDemoCronsSectionProps {
  readonly actionError?: string
  readonly cron?: HatchetCronRecord
  readonly crons: readonly HatchetCronRecord[]
}

export const HatchetDemoCronsSection = ({
  actionError,
  cron,
  crons,
}: HatchetDemoCronsSectionProps) => (
  <>
    <section>
      <h3>Create Cron</h3>
      <Form method="post">
        <fieldset>
          <label htmlFor="cronWorkflowName">Workflow Name</label>
          <input
            id="cronWorkflowName"
            name="cronWorkflowName"
            type="text"
            required
            defaultValue="user-notification-workflow"
          />
          <label htmlFor="cronName">Cron Name</label>
          <input
            id="cronName"
            name="cronName"
            type="text"
            required
            defaultValue="nightly-users"
          />
          <label htmlFor="cronExpression">Cron Expression</label>
          <input
            id="cronExpression"
            name="cronExpression"
            type="text"
            required
            defaultValue="0 0 * * *"
          />
          <label htmlFor="cronInput">Input (JSON object)</label>
          <textarea
            id="cronInput"
            name="cronInput"
            rows={3}
            defaultValue='{"userId": "user-123", "source": "demo"}'
          />
        </fieldset>
        <input type="hidden" name="intent" value="create-cron" />
        {actionError ? <small role="alert">{actionError}</small> : null}
        <button type="submit">Create Cron</button>
      </Form>
    </section>

    <section>
      <h3>Selected Cron</h3>
      {cron ?
        (
          <div>
            <p>
              <strong>Cron ID:</strong> {cron.cronId}
            </p>
            <p>
              <strong>Workflow:</strong> {cron.workflowName}
            </p>
            <p>
              <strong>Name:</strong> {cron.name ?? "—"}
            </p>
            <p>
              <strong>Expression:</strong> {cron.cron}
            </p>
            <p>
              <strong>Enabled:</strong> {cron.enabled ? "Yes" : "No"}
            </p>
            <p>
              <strong>Method:</strong> {cron.method}
            </p>
            <pre>{JSON.stringify(cron.input ?? {}, null, 2)}</pre>
          </div>
        ) :
        <p>Create a cron to inspect it here.</p>}
    </section>

    <section>
      <h3>Cron Workflows</h3>
      {crons.length === 0 ? <p>No crons found. Create one to see it here.</p> : (
        <ul>
          {crons.map((scheduledCron) => (
            <li key={scheduledCron.cronId}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>
                    {scheduledCron.name ?? scheduledCron.workflowName}
                  </strong>
                  <span>—</span>
                  <span>{scheduledCron.cron}</span>
                </div>
                <Form method="get">
                  <input
                    type="hidden"
                    name="cronId"
                    value={scheduledCron.cronId}
                  />
                  <button type="submit">View</button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete-cron" />
                  <input
                    type="hidden"
                    name="cronId"
                    value={scheduledCron.cronId}
                  />
                  <button
                    type="submit"
                    aria-label={`Delete cron ${scheduledCron.cronId}`}
                  >
                    Delete
                  </button>
                </Form>
              </div>
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

export const loadCrons = (request: Request) =>
  Effect.gen(function*() {
    const selectedCronId = readSelectedCronId(request.url)
    const crons = yield* listCrons()
    const cron = selectedCronId ? yield* getCron(selectedCronId) : undefined

    return yield* httpSuccess({ crons, cron })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadCrons(request)
}).pipe(withLoaderEffect)

export const handleCronsAction = (request: Request) =>
  Effect.gen(function*() {
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")

    if (intent === "create-cron") {
      const workflowName = String(
        formData.get("cronWorkflowName") ?? "",
      ).trim()
      const cronName = String(formData.get("cronName") ?? "").trim()
      const cronExpression = String(
        formData.get("cronExpression") ?? "",
      ).trim()
      const cronInputStr = String(formData.get("cronInput") ?? "{}")

      if (!workflowName) return yield* httpFailure("Workflow name is required")
      if (!cronName) return yield* httpFailure("Cron name is required")
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
        additionalMetadata: { source: "react-router-example" },
      })

      return yield* httpRedirect(buildCronRedirect(cron.cronId))
    }

    if (intent === "delete-cron") {
      const cronId = String(formData.get("cronId") ?? "").trim()
      if (!cronId) return yield* httpFailure("Cron ID is required")
      yield* deleteCron(cronId)
      return yield* httpRedirect("/hatchet-demo/crons")
    }

    return yield* httpFailure("Unknown intent")
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleCronsAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoCronsRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if (!loaderData.ok) return <p>Loading...</p>
  return (
    <HatchetDemoCronsSection
      actionError={getActionError(actionData)}
      cron={loaderData.data.cron}
      crons={loaderData.data.crons}
    />
  )
}
