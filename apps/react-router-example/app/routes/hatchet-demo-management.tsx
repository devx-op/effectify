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
              <strong>{selectedRun.workflowName ?? selectedRun.id}</strong>
            </p>
          ) :
          <p>Select a run from Recent Runs to replay it here.</p>}

        <form method="post">
          <input type="hidden" name="intent" value="replay" />
          <input type="hidden" name="runId" value={selectedRun?.id ?? ""} />
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
          <button type="submit" disabled={!selectedRun}>
            Replay Run
          </button>
        </form>
      </section>

      <section>
        <h3>Delete Workflow</h3>
        <form method="post">
          <fieldset>
            <label htmlFor="workflowName">Workflow Name</label>
            <input
              id="workflowName"
              name="workflowName"
              type="text"
              required
              placeholder="e.g., orders.process"
              defaultValue={workflowName}
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
          <button type="submit">Delete Workflow</button>
        </form>
        {runs.length === 0 ? <p>No workflow runs available yet.</p> : null}
      </section>
    </>
  )
}
