import type { AutomaticPolicy, LifecycleFailure, RunLifecycle, TransitionEvidence } from "../src/index.js"

export type PublicNamespaceAllowlist = readonly [
  typeof RunLifecycle,
  typeof TransitionEvidence,
  typeof AutomaticPolicy,
  typeof LifecycleFailure,
]
