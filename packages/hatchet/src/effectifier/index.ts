/**
 * @effectify/hatchet - Effectifier Module
 *
 * Converts Effect<A, E, R> to Hatchet-compatible Promise functions
 * using ManagedRuntime for dependency injection.
 */

export { createEffectifierFromLayer, createEffectifierFromServiceMap, effectifyTask } from "./execute.js"

export type { EffectifiedTask, EffectifyOptions, HatchetEffect, HatchetTaskFn } from "./types.js"
