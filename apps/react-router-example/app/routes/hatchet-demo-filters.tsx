import type { HatchetFilterRecord } from "@effectify/hatchet"

export interface HatchetDemoFiltersSectionProps {
  readonly actionError?: string
  readonly filter?: HatchetFilterRecord
  readonly filters: readonly HatchetFilterRecord[]
}

export const HatchetDemoFiltersSection = ({
  actionError,
  filter,
  filters,
}: HatchetDemoFiltersSectionProps) => {
  return (
    <>
      <section>
        <h3>Create Filter</h3>
        <form method="post">
          <fieldset>
            <label htmlFor="filterWorkflowId">Workflow ID</label>
            <input
              id="filterWorkflowId"
              name="filterWorkflowId"
              type="text"
              required
              placeholder="e.g., workflow-123"
              defaultValue="workflow-123"
            />
            <label htmlFor="filterScope">Scope</label>
            <input
              id="filterScope"
              name="filterScope"
              type="text"
              required
              placeholder="tenant:demo"
              defaultValue="tenant:demo"
            />
            <label htmlFor="filterExpression">Expression</label>
            <textarea
              id="filterExpression"
              name="filterExpression"
              rows={3}
              placeholder="input.kind == 'demo'"
              defaultValue="input.kind == 'demo'"
            />
            <label htmlFor="filterPayload">
              Payload (JSON object, optional)
            </label>
            <textarea
              id="filterPayload"
              name="filterPayload"
              rows={2}
              placeholder='{"feature":"filters"}'
              defaultValue='{"feature":"filters"}'
            />
          </fieldset>
          <input type="hidden" name="intent" value="create-filter" />
          {actionError ?
            (
              <small
                role="alert"
                aria-live="assertive"
                style={{ color: "var(--pico-color-red-500)" }}
              >
                {actionError}
              </small>
            ) :
            null}
          <button type="submit">Create Filter</button>
        </form>
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
                  <form method="get">
                    <input
                      type="hidden"
                      name="filterId"
                      value={currentFilter.filterId}
                    />
                    <button type="submit">View</button>
                  </form>
                  <form method="post">
                    <input type="hidden" name="intent" value="delete-filter" />
                    <input
                      type="hidden"
                      name="filterId"
                      value={currentFilter.filterId}
                    />
                    <button type="submit">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
