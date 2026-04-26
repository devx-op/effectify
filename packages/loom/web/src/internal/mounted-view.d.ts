import type { AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
export interface MountedView {
  readonly hasReactiveBindings: boolean
  readonly dispose: () => void
}
export declare const mountView: (
  root: Element,
  node: LoomCore.Ast.Node,
  registry: AtomRegistry.AtomRegistry,
) => MountedView
