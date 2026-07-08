declare const phaseOrder: readonly ["runtime", "hydration", "resumability", "router", "adapter"]
declare const severityOrder: readonly ["info", "warn", "error", "fatal"]
export type DiagnosticPhase = (typeof phaseOrder)[number]
export type DiagnosticSeverity = (typeof severityOrder)[number]
export type DiagnosticJsonPrimitive = string | number | boolean | null
export type DiagnosticJsonValue = DiagnosticJsonPrimitive | ReadonlyArray<DiagnosticJsonValue> | {
  readonly [key: string]: DiagnosticJsonValue
}
export interface DiagnosticIssue {
  readonly phase: DiagnosticPhase
  readonly severity: DiagnosticSeverity
  readonly code: string
  readonly message: string
  readonly subject: string
  readonly details?: {
    readonly [key: string]: DiagnosticJsonValue
  }
}
export interface DiagnosticCounts {
  readonly info: number
  readonly warn: number
  readonly error: number
  readonly fatal: number
}
export interface DiagnosticReport {
  readonly phase: DiagnosticPhase
  readonly issues: ReadonlyArray<DiagnosticIssue>
  readonly counts: DiagnosticCounts
  readonly highestSeverity: DiagnosticSeverity | undefined
}
export interface DiagnosticSummary {
  readonly phase: DiagnosticPhase
  readonly total: number
  readonly highestSeverity: DiagnosticSeverity | undefined
  readonly hasErrors: boolean
}
export interface DiagnosticHookOptions {
  readonly onDiagnostic?: (report: DiagnosticReport) => void
}
export declare const isDiagnosticPhase: (value: string) => value is DiagnosticPhase
export declare const isDiagnosticSeverity: (value: string) => value is DiagnosticSeverity
export declare const isDiagnosticJsonValue: (value: unknown) => value is DiagnosticJsonValue
export declare const makeIssue: (input: {
  readonly phase: string
  readonly severity: string
  readonly code: string
  readonly message: string
  readonly subject: string
  readonly details?: unknown
}) => DiagnosticIssue
export declare const makeReport: (phase: string, issues: ReadonlyArray<DiagnosticIssue>) => DiagnosticReport
export declare const hasErrors: (report: DiagnosticReport) => boolean
export declare const summarize: (report: DiagnosticReport) => DiagnosticSummary
export declare const groupByPhase: (
  reports: ReadonlyArray<DiagnosticReport>,
) => Record<DiagnosticPhase, ReadonlyArray<DiagnosticReport>>
export declare const phases: ReadonlyArray<DiagnosticPhase>
export declare const severities: ReadonlyArray<DiagnosticSeverity>
