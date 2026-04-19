const phaseOrder = ["runtime", "hydration", "resumability", "router", "adapter"] as const

const severityOrder = ["info", "warn", "error", "fatal"] as const

export type DiagnosticPhase = (typeof phaseOrder)[number]

export type DiagnosticSeverity = (typeof severityOrder)[number]

export type DiagnosticJsonPrimitive = string | number | boolean | null

export type DiagnosticJsonValue =
  | DiagnosticJsonPrimitive
  | ReadonlyArray<DiagnosticJsonValue>
  | { readonly [key: string]: DiagnosticJsonValue }

export interface DiagnosticIssue {
  readonly phase: DiagnosticPhase
  readonly severity: DiagnosticSeverity
  readonly code: string
  readonly message: string
  readonly subject: string
  readonly details?: { readonly [key: string]: DiagnosticJsonValue }
}

export interface DiagnosticCounts {
  readonly info: number
  readonly warn: number
  readonly error: number
  readonly fatal: number
}

interface MutableDiagnosticCounts {
  info: number
  warn: number
  error: number
  fatal: number
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

const diagnosticPhaseSet = new Set<string>(phaseOrder)

const diagnosticSeveritySet = new Set<string>(severityOrder)

const makeEmptyCounts = (): MutableDiagnosticCounts => ({
  info: 0,
  warn: 0,
  error: 0,
  fatal: 0,
})

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const isDiagnosticPhase = (value: string): value is DiagnosticPhase => diagnosticPhaseSet.has(value)

export const isDiagnosticSeverity = (value: string): value is DiagnosticSeverity => diagnosticSeveritySet.has(value)

export const isDiagnosticJsonValue = (value: unknown): value is DiagnosticJsonValue => {
  switch (typeof value) {
    case "string":
    case "boolean":
      return true
    case "number":
      return Number.isFinite(value)
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      return false
    case "object": {
      if (value === null) {
        return true
      }

      if (Array.isArray(value)) {
        return value.every(isDiagnosticJsonValue)
      }

      if (!isPlainRecord(value)) {
        return false
      }

      return Object.values(value).every(isDiagnosticJsonValue)
    }
  }
}

const assertDiagnosticPhase = (value: string): DiagnosticPhase => {
  if (!isDiagnosticPhase(value)) {
    throw new TypeError(`Unsupported diagnostic phase: ${value}`)
  }

  return value
}

const assertDiagnosticSeverity = (value: string): DiagnosticSeverity => {
  if (!isDiagnosticSeverity(value)) {
    throw new TypeError(`Unsupported diagnostic severity: ${value}`)
  }

  return value
}

const assertDiagnosticDetails = (
  value: unknown,
): { readonly [key: string]: DiagnosticJsonValue } | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (!isPlainRecord(value) || !isDiagnosticJsonValue(value)) {
    throw new TypeError("Diagnostic details must be JSON-safe records.")
  }

  return value
}

const computeHighestSeverity = (counts: DiagnosticCounts): DiagnosticSeverity | undefined => {
  for (let index = severityOrder.length - 1; index >= 0; index--) {
    const severity = severityOrder[index]

    if (severity !== undefined && counts[severity] > 0) {
      return severity
    }
  }

  return undefined
}

export const makeIssue = (input: {
  readonly phase: string
  readonly severity: string
  readonly code: string
  readonly message: string
  readonly subject: string
  readonly details?: unknown
}): DiagnosticIssue => ({
  phase: assertDiagnosticPhase(input.phase),
  severity: assertDiagnosticSeverity(input.severity),
  code: input.code,
  message: input.message,
  subject: input.subject,
  details: assertDiagnosticDetails(input.details),
})

export const makeReport = (phase: string, issues: ReadonlyArray<DiagnosticIssue>): DiagnosticReport => {
  const normalizedPhase = assertDiagnosticPhase(phase)
  const counts = makeEmptyCounts()

  for (const issue of issues) {
    if (issue.phase !== normalizedPhase) {
      throw new TypeError(
        `Diagnostic issue phase ${issue.phase} does not match report phase ${normalizedPhase}.`,
      )
    }

    counts[issue.severity] += 1
  }

  return {
    phase: normalizedPhase,
    issues,
    counts,
    highestSeverity: computeHighestSeverity(counts),
  }
}

export const hasErrors = (report: DiagnosticReport): boolean => report.counts.error > 0 || report.counts.fatal > 0

export const summarize = (report: DiagnosticReport): DiagnosticSummary => ({
  phase: report.phase,
  total: report.issues.length,
  highestSeverity: report.highestSeverity,
  hasErrors: hasErrors(report),
})

export const groupByPhase = (
  reports: ReadonlyArray<DiagnosticReport>,
): Record<DiagnosticPhase, ReadonlyArray<DiagnosticReport>> => {
  const grouped: Record<DiagnosticPhase, Array<DiagnosticReport>> = {
    runtime: [],
    hydration: [],
    resumability: [],
    router: [],
    adapter: [],
  }

  for (const report of reports) {
    grouped[report.phase].push(report)
  }

  return grouped
}

export const phases: ReadonlyArray<DiagnosticPhase> = phaseOrder

export const severities: ReadonlyArray<DiagnosticSeverity> = severityOrder
