import { AtomRegistry } from "effect/unstable/reactivity"
import { LoomVite } from "@effectify/loom-vite"
import { appBuildId, appPayloadElementId } from "./app-config.js"
import { applyCounterCommand, registerLiveIslandExecutables } from "./live-island-demo.js"

export const bootstrapClient = (
  document: Document,
  options?: LoomVite.LoomBootstrapOptions,
): Promise<LoomVite.LoomBootstrapResult> => {
  const registry = options?.registry ?? AtomRegistry.make()
  const localRegistry = registerLiveIslandExecutables(options?.localRegistry)

  return LoomVite.bootstrap(document, {
    ...options,
    expectedBuildId: options?.expectedBuildId ?? appBuildId,
    payloadElementId: options?.payloadElementId ?? appPayloadElementId,
    registry,
    localRegistry,
    onEffect: (effect, context) => {
      applyCounterCommand(effect, registry)
      options?.onEffect?.(effect, context)
    },
  })
}
