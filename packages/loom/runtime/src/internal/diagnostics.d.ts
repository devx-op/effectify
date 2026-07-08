import type * as Resumability from "../resumability.js"
import type * as Runtime from "../runtime.js"
import * as Diagnostics from "../diagnostics.js"
export declare const fromHydrationMismatches: (
  mismatches: ReadonlyArray<Runtime.HydrationMismatch>,
) => ReadonlyArray<Diagnostics.DiagnosticReport>
export declare const fromHydrationActivation: (
  result: Pick<Runtime.HydrationActivationResult, "mismatches" | "issues">,
) => ReadonlyArray<Diagnostics.DiagnosticReport>
export declare const fromRenderResumability: (
  result: Resumability.RenderResumabilityResult,
) => ReadonlyArray<Diagnostics.DiagnosticReport>
