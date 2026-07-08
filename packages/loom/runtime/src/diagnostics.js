const phaseOrder = ["runtime", "hydration", "resumability", "router", "adapter"]
const severityOrder = ["info", "warn", "error", "fatal"]
const diagnosticPhaseSet = new Set(phaseOrder)
const diagnosticSeveritySet = new Set(severityOrder)
const makeEmptyCounts = () => ({
  info: 0,
  warn: 0,
  error: 0,
  fatal: 0,
})
const isPlainRecord = (value) => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
export const isDiagnosticPhase = (value) => diagnosticPhaseSet.has(value)
export const isDiagnosticSeverity = (value) => diagnosticSeveritySet.has(value)
export const isDiagnosticJsonValue = (value) => {
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
const assertDiagnosticPhase = (value) => {
  if (!isDiagnosticPhase(value)) {
    throw new TypeError(`Unsupported diagnostic phase: ${value}`)
  }
  return value
}
const assertDiagnosticSeverity = (value) => {
  if (!isDiagnosticSeverity(value)) {
    throw new TypeError(`Unsupported diagnostic severity: ${value}`)
  }
  return value
}
const assertDiagnosticDetails = (value) => {
  if (value === undefined) {
    return undefined
  }
  if (!isPlainRecord(value) || !isDiagnosticJsonValue(value)) {
    throw new TypeError("Diagnostic details must be JSON-safe records.")
  }
  return value
}
const computeHighestSeverity = (counts) => {
  for (let index = severityOrder.length - 1; index >= 0; index--) {
    const severity = severityOrder[index]
    if (severity !== undefined && counts[severity] > 0) {
      return severity
    }
  }
  return undefined
}
export const makeIssue = (input) => ({
  phase: assertDiagnosticPhase(input.phase),
  severity: assertDiagnosticSeverity(input.severity),
  code: input.code,
  message: input.message,
  subject: input.subject,
  details: assertDiagnosticDetails(input.details),
})
export const makeReport = (phase, issues) => {
  const normalizedPhase = assertDiagnosticPhase(phase)
  const counts = makeEmptyCounts()
  for (const issue of issues) {
    if (issue.phase !== normalizedPhase) {
      throw new TypeError(`Diagnostic issue phase ${issue.phase} does not match report phase ${normalizedPhase}.`)
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
export const hasErrors = (report) => report.counts.error > 0 || report.counts.fatal > 0
export const summarize = (report) => ({
  phase: report.phase,
  total: report.issues.length,
  highestSeverity: report.highestSeverity,
  hasErrors: hasErrors(report),
})
export const groupByPhase = (reports) => {
  const grouped = {
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
export const phases = phaseOrder
export const severities = severityOrder
