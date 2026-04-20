import type * as LoomCore from "@effectify/loom-core"
import * as Resumability from "../resumability.js"
import type * as Runtime from "../runtime.js"
export declare const makeEventBinding: <Handler>(event: string, handler: Handler) => Runtime.EventBinding<Handler>
export declare const makeRenderPlan: (root: LoomCore.Ast.Node, options?: Runtime.SsrOptions) => Runtime.RenderPlan
export declare const renderToHtml: (root: LoomCore.Ast.Node, options?: Runtime.SsrOptions) => Runtime.SsrRenderResult
export declare const createResumabilityContract: (
  render: Runtime.SsrRenderResult,
  identity: Runtime.ResumabilityIdentity,
) => Promise<Resumability.CreatedRenderContractResult>
export declare const discoverHydrationBoundaries: (root: ParentNode) => ReadonlyArray<Runtime.HydrationBoundaryHandle>
export declare const bootstrapHydration: (root: ParentNode) => Runtime.HydrationBootstrapResult
export declare const activateHydration: (
  root: ParentNode,
  source: Runtime.ActivationSource | Runtime.SsrRenderResult | Resumability.ResumabilityActivationSource,
  options?: Runtime.HydrationActivationOptions,
) => Runtime.HydrationActivationResult
