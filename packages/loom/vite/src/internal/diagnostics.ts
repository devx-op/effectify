import * as Loom from "@effectify/loom"
import type { LoomViteState } from "./plugin-state.js"

const makeCounts = (severity: Loom.Diagnostics.Severity): Loom.Diagnostics.Counts => ({
  info: severity === "info" ? 1 : 0,
  warn: severity === "warn" ? 1 : 0,
  error: severity === "error" ? 1 : 0,
  fatal: severity === "fatal" ? 1 : 0,
})

const makeAdapterReport = (input: {
  readonly severity: Loom.Diagnostics.Severity
  readonly code: string
  readonly message: string
  readonly subject: string
  readonly details: Record<string, Loom.Diagnostics.JsonValue>
}): Loom.Diagnostics.Report => ({
  phase: "adapter",
  counts: makeCounts(input.severity),
  highestSeverity: input.severity,
  issues: [
    {
      phase: "adapter",
      severity: input.severity,
      code: input.code,
      message: input.message,
      subject: input.subject,
      details: input.details,
    },
  ],
})

export const makeMissingPayloadDiagnostics = (payloadElementId: string): ReadonlyArray<Loom.Diagnostics.Report> => [
  makeAdapterReport({
    severity: "info",
    code: "loom.adapter.bootstrap.missing-payload",
    message: "Loom bootstrap could not find a serialized payload in the current document.",
    subject: payloadElementId,
    details: {
      payloadElementId,
    },
  }),
]

export const makeFreshStartDiagnostics = (input: {
  readonly payloadElementId: string
  readonly rootId: string | undefined
  readonly validationStatus: "valid" | "invalid" | "fresh-start"
  readonly issueCount: number
}): ReadonlyArray<Loom.Diagnostics.Report> => [
  makeAdapterReport({
    severity: "warn",
    code: "loom.adapter.bootstrap.fresh-start",
    message: "Loom bootstrap fell back to a fresh client start instead of resumability.",
    subject: input.rootId ?? input.payloadElementId,
    details: {
      payloadElementId: input.payloadElementId,
      rootId: input.rootId ?? null,
      validationStatus: input.validationStatus,
      issueCount: input.issueCount,
    },
  }),
]

export const makeMissingRootDiagnostics = (input: {
  readonly payloadElementId: string
  readonly rootId: string
  readonly validationStatus: "valid" | "fresh-start"
}): ReadonlyArray<Loom.Diagnostics.Report> => [
  makeAdapterReport({
    severity: "error",
    code: "loom.adapter.bootstrap.missing-root",
    message: "Loom bootstrap found a serialized payload, but the declared root element is missing from the document.",
    subject: input.rootId,
    details: {
      payloadElementId: input.payloadElementId,
      rootId: input.rootId,
      validationStatus: input.validationStatus,
    },
  }),
]

export const makeEnabledStateDiagnostics = (state: LoomViteState): ReadonlyArray<Loom.Diagnostics.Report> => {
  if (state.options.root === undefined) {
    return []
  }

  return [
    makeAdapterReport({
      severity: "info",
      code: "loom.adapter.vite.enabled",
      message: "Loom Vite is enabled for the configured browser entry.",
      subject: state.options.root,
      details: {
        root: state.options.root,
        clientEntry: state.options.clientEntry,
        payloadElementId: state.options.payloadElementId,
      },
    }),
  ]
}

export const summarizeDiagnostics = (
  reports: ReadonlyArray<Loom.Diagnostics.Report>,
): ReadonlyArray<Loom.Diagnostics.Summary> => reports.map(Loom.Diagnostics.summarize)

export const renderDiagnosticsLogMessage = (reports: ReadonlyArray<Loom.Diagnostics.Report>): string => {
  const [report] = reports

  if (report === undefined) {
    return JSON.stringify({ scope: "loom", report: null, summary: null })
  }

  return JSON.stringify({
    scope: "loom",
    report,
    summary: Loom.Diagnostics.summarize(report),
  })
}
