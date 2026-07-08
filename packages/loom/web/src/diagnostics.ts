import * as LoomRuntime from "@effectify/loom-runtime"

/**
 * Advanced diagnostics surface.
 *
 * This namespace is public, but it is not part of the primary first-path Loom
 * authoring story. Prefer the root `Component` / `View` / `Web` / `Slot` /
 * `mount` flow first, then reach for diagnostics when you need runtime or
 * adapter visibility.
 */

export type Phase = LoomRuntime.Diagnostics.DiagnosticPhase
export type Severity = LoomRuntime.Diagnostics.DiagnosticSeverity
export type JsonPrimitive = LoomRuntime.Diagnostics.DiagnosticJsonPrimitive
export type JsonValue = LoomRuntime.Diagnostics.DiagnosticJsonValue
export type Issue = LoomRuntime.Diagnostics.DiagnosticIssue
export type Counts = LoomRuntime.Diagnostics.DiagnosticCounts
export type Report = LoomRuntime.Diagnostics.DiagnosticReport
export type Summary = LoomRuntime.Diagnostics.DiagnosticSummary

/** Stable Loom diagnostic phases exposed to public consumers. */
export const phases: ReadonlyArray<Phase> = LoomRuntime.Diagnostics.phases

/** Stable Loom diagnostic severities exposed to public consumers. */
export const severities: ReadonlyArray<Severity> = LoomRuntime.Diagnostics.severities

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
export const summaries = (reports: ReadonlyArray<Report>): ReadonlyArray<Summary> =>
  reports.map(LoomRuntime.Diagnostics.summarize)

/** Check whether any report in a collection crosses the error threshold. */
export const hasAnyErrors = (reports: ReadonlyArray<Report>): boolean => reports.some(LoomRuntime.Diagnostics.hasErrors)

/** Count the total number of issues represented by a collection of reports. */
export const totalIssues = (reports: ReadonlyArray<Report>): number =>
  reports.reduce((total, report) => total + report.issues.length, 0)
