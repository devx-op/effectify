import * as LoomRuntime from "@effectify/loom-runtime"
/** Stable Loom diagnostic phases exposed to public consumers. */
export const phases = LoomRuntime.Diagnostics.phases
/** Stable Loom diagnostic severities exposed to public consumers. */
export const severities = LoomRuntime.Diagnostics.severities
/** Narrow a string into a supported Loom diagnostic phase. */
export const isPhase = LoomRuntime.Diagnostics.isDiagnosticPhase
/** Narrow a string into a supported Loom diagnostic severity. */
export const isSeverity = LoomRuntime.Diagnostics.isDiagnosticSeverity
/** Report-level error helper for consumers that only care about warning vs error boundaries. */
export const hasErrors = LoomRuntime.Diagnostics.hasErrors
/** Reduce a canonical diagnostic report into a small public summary. */
export const summarize = LoomRuntime.Diagnostics.summarize
/** Group reports by phase while preserving the canonical phase taxonomy. */
export const groupByPhase = LoomRuntime.Diagnostics.groupByPhase
/** Summarize a list of reports for adapter- and app-level telemetry surfaces. */
export const summaries = (reports) => reports.map(LoomRuntime.Diagnostics.summarize)
/** Check whether any report in a collection crosses the error threshold. */
export const hasAnyErrors = (reports) => reports.some(LoomRuntime.Diagnostics.hasErrors)
/** Count the total number of issues represented by a collection of reports. */
export const totalIssues = (reports) => reports.reduce((total, report) => total + report.issues.length, 0)
