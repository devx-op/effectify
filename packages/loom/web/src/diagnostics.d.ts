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
export declare const phases: ReadonlyArray<Phase>
/** Stable Loom diagnostic severities exposed to public consumers. */
export declare const severities: ReadonlyArray<Severity>
/** Narrow a string into a supported Loom diagnostic phase. */
export declare const isPhase: (
  value: string,
) => value is "adapter" | "hydration" | "resumability" | "router" | "runtime"
/** Narrow a string into a supported Loom diagnostic severity. */
export declare const isSeverity: (value: string) => value is "error" | "fatal" | "info" | "warn"
/** Report-level error helper for consumers that only care about warning vs error boundaries. */
export declare const hasErrors: (report: LoomRuntime.Diagnostics.DiagnosticReport) => boolean
/** Reduce a canonical diagnostic report into a small public summary. */
export declare const summarize: (
  report: LoomRuntime.Diagnostics.DiagnosticReport,
) => LoomRuntime.Diagnostics.DiagnosticSummary
/** Group reports by phase while preserving the canonical phase taxonomy. */
export declare const groupByPhase: (
  reports: ReadonlyArray<LoomRuntime.Diagnostics.DiagnosticReport>,
) => Record<LoomRuntime.Diagnostics.DiagnosticPhase, ReadonlyArray<LoomRuntime.Diagnostics.DiagnosticReport>>
/** Summarize a list of reports for adapter- and app-level telemetry surfaces. */
export declare const summaries: (reports: ReadonlyArray<Report>) => ReadonlyArray<Summary>
/** Check whether any report in a collection crosses the error threshold. */
export declare const hasAnyErrors: (reports: ReadonlyArray<Report>) => boolean
/** Count the total number of issues represented by a collection of reports. */
export declare const totalIssues: (reports: ReadonlyArray<Report>) => number
