import type { LogList, QueueMetrics, TaskMetrics } from "@effectify/hatchet"

export interface HatchetDemoObservabilityData {
  readonly selectedRunId?: string
  readonly selectedTaskId?: string
  readonly run?: Record<string, unknown>
  readonly status?: string
  readonly logs?: LogList
  readonly taskMetrics: TaskMetrics
  readonly queueMetrics: QueueMetrics
  readonly error?: string
}

export interface HatchetDemoObservabilitySectionProps {
  readonly observability: HatchetDemoObservabilityData
}

export const HatchetDemoObservabilitySection = ({
  observability,
}: HatchetDemoObservabilitySectionProps) => {
  const logs = observability.logs?.rows ?? []

  return (
    <section>
      <h3>Observability</h3>
      {observability.error ? <p role="alert">{observability.error}</p> : null}
      <p>
        <strong>Selected run:</strong> {observability.selectedRunId ?? "Select a run"}
      </p>
      <p>
        <strong>Selected task:</strong> {observability.selectedTaskId ?? "No task selected"}
      </p>
      <p>
        <strong>Status:</strong> {observability.status ?? "No run selected"}
      </p>

      <div>
        <h4>Recent Logs</h4>
        {logs.length === 0 ? <p>No recent logs</p> : (
          <ul>
            {logs.map((log) => (
              <li key={`${log.timestamp}-${log.message}`}>
                <strong>{log.level ?? "INFO"}</strong> {log.message} (
                {log.timestamp})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4>Task Metrics</h4>
        <ul>
          {Object.entries(observability.taskMetrics.byStatus).map(
            ([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ),
          )}
        </ul>
      </div>

      <div>
        <h4>Queue Metrics</h4>
        <p>
          Total queued: {observability.queueMetrics.total.queued}, running:{" "}
          {observability.queueMetrics.total.running}, pending: {observability.queueMetrics.total.pending}
        </p>
        <ul>
          {Object.entries(observability.queueMetrics.workflowBreakdown).map(
            ([workflow, counts]) => (
              <li key={workflow}>
                {workflow}: queued {counts.queued}, running {counts.running}, pending {counts.pending}
              </li>
            ),
          )}
        </ul>
        <ul>
          {Object.entries(observability.queueMetrics.stepRun).map(
            ([queue, count]) => (
              <li key={queue}>
                {queue}: {count}
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  )
}
