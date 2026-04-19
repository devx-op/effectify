import type * as Resumability from "../resumability.js"
import type * as Runtime from "../runtime.js"
import * as Diagnostics from "../diagnostics.js"

const makeBoundarySubject = (boundaryId: string): string => `boundary:${boundaryId}`

const makeActivationSubject = (issue: Runtime.HydrationActivationIssue): string => {
  const parts = [
    issue.boundaryId.length > 0 ? `boundary:${issue.boundaryId}` : undefined,
    issue.liveRegionId !== undefined ? `live-region:${issue.liveRegionId}` : undefined,
    issue.nodeId.length > 0 ? `node:${issue.nodeId}` : undefined,
    issue.event.length > 0 ? `event:${issue.event}` : undefined,
  ].filter((part): part is string => part !== undefined)

  return parts.length > 0 ? parts.join("/") : "hydration"
}

const makeHydrationMismatchMessage = (mismatch: Runtime.HydrationMismatch): string => {
  switch (mismatch.reason) {
    case "missing-strategy":
      return `Hydration boundary ${mismatch.id} is missing its hydration strategy attribute.`
    case "missing-start-marker":
      return `Hydration boundary ${mismatch.id} is missing its SSR start marker.`
    case "missing-end-marker":
      return `Hydration boundary ${mismatch.id} is missing its SSR end marker.`
  }
}

const makeHydrationActivationMessage = (issue: Runtime.HydrationActivationIssue): string => {
  switch (issue.reason) {
    case "missing-runtime-boundary":
      return `Hydration boundary ${issue.boundaryId} is missing from the runtime activation manifest.`
    case "missing-event-target":
      return `Hydration boundary ${issue.boundaryId} could not find event target ${issue.nodeId} for ${issue.event}.`
    case "missing-handler":
      return `Hydration boundary ${issue.boundaryId} could not resolve a handler for ${issue.nodeId}:${issue.event}.`
    case "missing-effect-dispatcher":
      return `Hydration boundary ${issue.boundaryId} cannot dispatch effect handlers without an effect dispatcher.`
    case "missing-live-start-marker":
      return `Hydration live region ${issue.liveRegionId ?? "unknown"} is missing its start marker.`
    case "missing-live-end-marker":
      return `Hydration live region ${issue.liveRegionId ?? "unknown"} is missing its end marker.`
    case "unsupported-live-content":
      return `Hydration live region ${issue.liveRegionId ?? "unknown"} produced unsupported static content.`
    case "live-plan-mismatch":
      return `Hydration live region ${issue.liveRegionId ?? "unknown"} could not be matched to its runtime plan.`
  }
}

const makeHydrationActivationSeverity = (issue: Runtime.HydrationActivationIssue): Diagnostics.DiagnosticSeverity => {
  switch (issue.reason) {
    case "unsupported-live-content":
      return "warn"
    default:
      return "error"
  }
}

const makeResumabilityMessage = (issue: Resumability.RenderResumabilityIssue): string => {
  switch (issue.reason) {
    case "missing-handler-ref":
      return "Hydration event bindings require explicit resumability refs before they can be serialized."
    case "missing-live-region-ref":
      return "Live regions require explicit resumability refs before they can be serialized."
    case "non-serializable-live-atom":
      return "Live regions require serializable Atom keys before they can be resumed."
  }
}

export const fromHydrationMismatches = (
  mismatches: ReadonlyArray<Runtime.HydrationMismatch>,
): ReadonlyArray<Diagnostics.DiagnosticReport> => {
  if (mismatches.length === 0) {
    return []
  }

  return [
    Diagnostics.makeReport(
      "hydration",
      mismatches.map((mismatch) =>
        Diagnostics.makeIssue({
          phase: "hydration",
          severity: "warn",
          code: `loom.hydration.bootstrap.${mismatch.reason}`,
          message: makeHydrationMismatchMessage(mismatch),
          subject: makeBoundarySubject(mismatch.id),
          details: {
            boundaryId: mismatch.id,
            reason: mismatch.reason,
          },
        })
      ),
    ),
  ]
}

export const fromHydrationActivation = (
  result: Pick<Runtime.HydrationActivationResult, "mismatches" | "issues">,
): ReadonlyArray<Diagnostics.DiagnosticReport> => {
  const issues = [
    ...fromHydrationMismatches(result.mismatches).flatMap((report) => report.issues),
    ...result.issues.map((issue) =>
      Diagnostics.makeIssue({
        phase: "hydration",
        severity: makeHydrationActivationSeverity(issue),
        code: `loom.hydration.activation.${issue.reason}`,
        message: makeHydrationActivationMessage(issue),
        subject: makeActivationSubject(issue),
        details: {
          boundaryId: issue.boundaryId,
          liveRegionId: issue.liveRegionId ?? null,
          nodeId: issue.nodeId,
          event: issue.event,
          reason: issue.reason,
        },
      })
    ),
  ]

  return issues.length === 0 ? [] : [Diagnostics.makeReport("hydration", issues)]
}

export const fromRenderResumability = (
  result: Resumability.RenderResumabilityResult,
): ReadonlyArray<Diagnostics.DiagnosticReport> => {
  if (result.status !== "unsupported") {
    return []
  }

  return [
    Diagnostics.makeReport(
      "resumability",
      result.issues.map((issue) =>
        Diagnostics.makeIssue({
          phase: "resumability",
          severity: "error",
          code: `loom.resumability.render.${issue.reason}`,
          message: makeResumabilityMessage(issue),
          subject: issue.path,
          details: {
            path: issue.path,
            reason: issue.reason,
          },
        })
      ),
    ),
  ]
}
