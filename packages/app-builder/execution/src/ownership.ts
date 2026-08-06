const WorkspaceOwnershipTypeId: unique symbol = Symbol("@effectify/app-builder-execution/WorkspaceOwnership")

export interface WorkspaceOwnership {
  readonly [WorkspaceOwnershipTypeId]: typeof WorkspaceOwnershipTypeId
}

export interface OwnershipScope {
  readonly workspace: string
  readonly lockPath: string
}

interface OwnershipState extends OwnershipScope {
  active: boolean
}

class Capability implements WorkspaceOwnership {
  declare readonly [WorkspaceOwnershipTypeId]: typeof WorkspaceOwnershipTypeId
}

const states = new WeakMap<WorkspaceOwnership, OwnershipState>()

/** Internal issuer: package consumers can receive a capability but cannot mint a valid one. */
export const issueForScope = (scope: OwnershipScope): WorkspaceOwnership => {
  const ownership = Object.freeze(new Capability())
  states.set(ownership, { ...scope, active: true })
  return ownership
}

/** Verify a live capability is still bound to exactly one workspace lock. */
export const isActiveFor = (value: unknown, workspace: string, lockPath: string): value is WorkspaceOwnership => {
  if (!(value instanceof Capability)) return false
  const state = states.get(value)
  return state?.active === true && state.workspace === workspace && state.lockPath === lockPath
}

/** Scope finalization always revokes the capability even when retained lock evidence remains on disk. */
export const invalidate = (ownership: WorkspaceOwnership): void => {
  const state = states.get(ownership)
  if (state !== undefined) state.active = false
}
