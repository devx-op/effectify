import type { HatchetScheduleRecord } from "@effectify/hatchet"

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
      <form method="post">
        <fieldset>
          <label htmlFor="scheduleWorkflowName">Workflow Name</label>
          <input
            id="scheduleWorkflowName"
            name="workflowName"
            type="text"
            required
            placeholder="e.g., user-notification-workflow"
            defaultValue="user-notification-workflow"
          />
          <label htmlFor="triggerAt">Trigger At (ISO)</label>
          <input
            id="triggerAt"
            name="triggerAt"
            type="text"
            required
            placeholder="2026-04-12T18:45:00.000Z"
            defaultValue="2026-04-12T18:45:00.000Z"
          />
          <label htmlFor="scheduleInput">Input (JSON object)</label>
          <textarea
            id="scheduleInput"
            name="scheduleInput"
            placeholder='{"userId": "user-123", "source": "demo"}'
            defaultValue='{"userId": "user-123", "source": "demo"}'
            rows={3}
          />
        </fieldset>
        <input type="hidden" name="intent" value="schedule" />
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
        <button type="submit">Create Schedule</button>
      </form>
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
