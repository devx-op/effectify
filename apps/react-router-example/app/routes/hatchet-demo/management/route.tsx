import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import { Form, useActionData, useLoaderData } from "react-router"
import { loadHatchetModule } from "../../../lib/hatchet/module.js"
import { parseDeleteWorkflowIntent, readRequestFormData } from "../../../lib/hatchet/parsers.js"
import { readSelectedRunId } from "../../../lib/hatchet/params.js"
import { buildRunRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.route.js"
import type { HatchetTaskSummaryRecord } from "../../../lib/hatchet/run-models.js"

export interface HatchetDemoManagementRunRecord {
  readonly id: string
  readonly workflowName?: string
  readonly status?: string
}

export interface HatchetDemoManagementSectionProps {
  readonly actionError?: string
  readonly selectedRunId?: string
  readonly runs: readonly HatchetDemoManagementRunRecord[]
}

const toManagementRunRecord = (
  run: HatchetTaskSummaryRecord,
): HatchetDemoManagementRunRecord => ({
  id: run.workflowRunExternalId,
  workflowName: run.workflowName ?? run.displayName,
  status: run.status,
})

export const HatchetDemoManagementSection = ({
  actionError,
  selectedRunId,
  runs,
}: HatchetDemoManagementSectionProps) => {
  const selectedRun = selectedRunId
    ? runs.find((run) => run.id === selectedRunId)
    : undefined
  const workflowName = selectedRun?.workflowName ?? ""

  return (
    <>
      <section>
        <h3>Workflow Management</h3>
        {selectedRun ?
          (
            <p>
              Selected run <strong>{selectedRun.id}</strong> for workflow{" "}
              <strong>{selectedRun.workflowName ?? selectedRun.id}</strong>.
            </p>
          ) :
          <p>Select a run to prefill the workflow deletion form.</p>}
        <p>
          Replay moved to the{" "}
          <a
            href={selectedRunId
              ? buildRunRedirect(selectedRunId)
              : "/hatchet-demo/runs"}
          >
            Runs &amp; Events slice
          </a>{" "}
          so run actions stay together.
        </p>
      </section>

      <section>
        <h3>Delete Workflow</h3>
        <Form method="post">
          <fieldset>
            <label htmlFor="workflowName">Workflow Name</label>
            <input
              id="workflowName"
              name="workflowName"
              type="text"
              required
              defaultValue={workflowName}
              placeholder="orders.process"
            />
            <label htmlFor="confirmWorkflowDelete">
              Type DELETE to confirm workflow deletion
            </label>
            <input
              id="confirmWorkflowDelete"
              name="confirmWorkflowDelete"
              type="text"
              required
              placeholder="DELETE"
            />
          </fieldset>
          <input type="hidden" name="intent" value="delete-workflow" />
          {actionError ? <small role="alert">{actionError}</small> : null}
          <button type="submit">Delete Workflow</button>
        </Form>
        {runs.length === 0 ? <p>No workflow runs available yet.</p> : null}
      </section>

      <section>
        <h3>Recent Runs</h3>
        {runs.length === 0 ? <p>No workflow runs available yet.</p> : (
          <ul>
            {runs.map((run) => (
              <li key={run.id}>
                <a
                  href={`/hatchet-demo/management?runId=${encodeURIComponent(run.id)}`}
                >
                  {run.workflowName ?? run.id}
                </a>{" "}
                — {run.status ?? "unknown"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

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

export const loadManagement = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const selectedRunId = readSelectedRunId(request.url)
    const runs = yield* hatchet.listRuns<HatchetTaskSummaryRecord>()
    return yield* httpSuccess({
      selectedRunId,
      runs: runs.map(toManagementRunRecord),
    })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadManagement(request)
}).pipe(withLoaderEffect)

export const handleManagementAction = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")
    if (intent !== "delete-workflow") {
      return yield* httpFailure("Unknown intent")
    }

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

    yield* hatchet.deleteWorkflow(deleteIntent.workflowName)
    return yield* httpRedirect("/hatchet-demo/management")
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleManagementAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoManagementRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if (!loaderData.ok) return <p>Loading...</p>
  return (
    <HatchetDemoManagementSection
      actionError={getActionError(actionData)}
      selectedRunId={loaderData.data.selectedRunId}
      runs={loaderData.data.runs}
    />
  )
}
