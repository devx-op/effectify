import { type HatchetCronRecord } from "@effectify/hatchet"

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
      <form method="post">
        <fieldset>
          <label htmlFor="cronWorkflowName">Workflow Name</label>
          <input
            id="cronWorkflowName"
            name="cronWorkflowName"
            type="text"
            required
            placeholder="e.g., user-notification-workflow"
            defaultValue="user-notification-workflow"
          />
          <label htmlFor="cronName">Cron Name</label>
          <input
            id="cronName"
            name="cronName"
            type="text"
            required
            placeholder="e.g., nightly-users"
            defaultValue="nightly-users"
          />
          <label htmlFor="cronExpression">Cron Expression</label>
          <input
            id="cronExpression"
            name="cronExpression"
            type="text"
            required
            placeholder="0 0 * * *"
            defaultValue="0 0 * * *"
          />
          <label htmlFor="cronInput">Input (JSON object)</label>
          <textarea
            id="cronInput"
            name="cronInput"
            placeholder='{"userId": "user-123", "source": "demo"}'
            defaultValue='{"userId": "user-123", "source": "demo"}'
            rows={3}
          />
        </fieldset>
        <input type="hidden" name="intent" value="create-cron" />
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
        <button type="submit">Create Cron</button>
      </form>
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
                <form method="get">
                  <input
                    type="hidden"
                    name="cronId"
                    value={scheduledCron.cronId}
                  />
                  <button type="submit">View</button>
                </form>
                <form method="post">
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
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
)
