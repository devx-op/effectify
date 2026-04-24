import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import type { HatchetFilterRecord } from "@effectify/hatchet"
import { Form, useActionData, useLoaderData } from "react-router"
import { loadHatchetModule } from "../../../lib/hatchet/module.js"
import { parseEventPayload, readRequestFormData } from "../../../lib/hatchet/parsers.js"
import { readSelectedFilterId } from "../../../lib/hatchet/params.js"
import { buildFilterRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.route.js"

export interface HatchetDemoFiltersSectionProps {
  readonly actionError?: string
  readonly filter?: HatchetFilterRecord
  readonly filters: readonly HatchetFilterRecord[]
}

export const HatchetDemoFiltersSection = ({
  actionError,
  filter,
  filters,
}: HatchetDemoFiltersSectionProps) => (
  <>
    <section>
      <h3>Create Filter</h3>
      <Form method="post">
        <fieldset>
          <label htmlFor="filterWorkflowId">Workflow ID</label>
          <input
            id="filterWorkflowId"
            name="filterWorkflowId"
            type="text"
            required
            defaultValue="workflow-123"
          />
          <label htmlFor="filterScope">Scope</label>
          <input
            id="filterScope"
            name="filterScope"
            type="text"
            required
            defaultValue="tenant:demo"
          />
          <label htmlFor="filterExpression">Expression</label>
          <textarea
            id="filterExpression"
            name="filterExpression"
            rows={3}
            defaultValue="input.kind == 'demo'"
          />
          <label htmlFor="filterPayload">Payload (JSON object, optional)</label>
          <textarea
            id="filterPayload"
            name="filterPayload"
            rows={2}
            defaultValue='{"feature":"filters"}'
          />
        </fieldset>
        <input type="hidden" name="intent" value="create-filter" />
        {actionError ? <small role="alert">{actionError}</small> : null}
        <button type="submit">Create Filter</button>
      </Form>
    </section>

    <section>
      <h3>Selected Filter</h3>
      {filter ?
        (
          <div>
            <p>
              <strong>Filter ID:</strong> {filter.filterId}
            </p>
            <p>
              <strong>Workflow ID:</strong> {filter.workflowId}
            </p>
            <p>
              <strong>Scope:</strong> {filter.scope}
            </p>
            <p>
              <strong>Expression:</strong> {filter.expression}
            </p>
            <pre>{JSON.stringify(filter.payload, null, 2)}</pre>
          </div>
        ) :
        <p>Create a filter to inspect it here.</p>}
    </section>

    <section>
      <h3>Current Filters</h3>
      {filters.length === 0 ? <p>No filters found. Create one to see it here.</p> : (
        <ul>
          {filters.map((currentFilter) => (
            <li key={currentFilter.filterId}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{currentFilter.workflowId}</strong>
                  <span>—</span>
                  <span>{currentFilter.scope}</span>
                  <span>—</span>
                  <span>{currentFilter.expression}</span>
                </div>
                <Form method="get">
                  <input
                    type="hidden"
                    name="filterId"
                    value={currentFilter.filterId}
                  />
                  <button type="submit">View</button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete-filter" />
                  <input
                    type="hidden"
                    name="filterId"
                    value={currentFilter.filterId}
                  />
                  <button type="submit">Delete</button>
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

export const loadFilters = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const selectedFilterId = readSelectedFilterId(request.url)
    const filters = yield* hatchet.listFilters()
    const filter = selectedFilterId
      ? yield* hatchet.getFilter(selectedFilterId)
      : undefined
    return yield* httpSuccess({ filters, filter })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadFilters(request)
}).pipe(withLoaderEffect)

export const handleFiltersAction = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")

    if (intent === "create-filter") {
      const workflowId = String(formData.get("filterWorkflowId") ?? "").trim()
      const scope = String(formData.get("filterScope") ?? "").trim()
      const expression = String(formData.get("filterExpression") ?? "").trim()
      const payloadInput = String(formData.get("filterPayload") ?? "")

      if (!workflowId) return yield* httpFailure("Workflow ID is required")
      if (!scope) return yield* httpFailure("Filter scope is required")
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

      const filter = yield* hatchet.createFilter({
        workflowId,
        scope,
        expression,
        payload,
      })
      return yield* httpRedirect(buildFilterRedirect(filter.filterId))
    }

    if (intent === "delete-filter") {
      const filterId = String(formData.get("filterId") ?? "").trim()
      if (!filterId) return yield* httpFailure("Filter ID is required")
      yield* hatchet.deleteFilter(filterId)
      return yield* httpRedirect("/hatchet-demo/filters")
    }

    return yield* httpFailure("Unknown intent")
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleFiltersAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoFiltersRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if (!loaderData.ok) return <p>Loading...</p>
  return (
    <HatchetDemoFiltersSection
      actionError={getActionError(actionData)}
      filter={loaderData.data.filter}
      filters={loaderData.data.filters}
    />
  )
}
