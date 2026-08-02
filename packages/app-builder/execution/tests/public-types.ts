import type {
  AutomaticPolicy,
  Cleanup,
  DraftStore,
  DurableFileSystem,
  LifecycleFailure,
  ManagedPath,
  Recovery,
  RunLifecycle,
  RunStore,
  TransitionEvidence,
} from "../src/index.js"

export type PublicNamespaceAllowlist = readonly [
  typeof RunLifecycle,
  typeof TransitionEvidence,
  typeof AutomaticPolicy,
  typeof LifecycleFailure,
  typeof ManagedPath,
  typeof DurableFileSystem,
  typeof DraftStore,
  typeof RunStore,
  typeof Recovery,
  typeof Cleanup,
]
