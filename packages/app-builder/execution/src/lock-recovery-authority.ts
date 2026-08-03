import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export interface OwnerEvidence {
  readonly workspace: string
  readonly workspaceDigest: string
  readonly hostId: string
  readonly bootId: string
  readonly pid: number
  readonly processStart: string
  readonly nonce: string
}

export class RecoveryAuthorizationDenied extends Schema.TaggedErrorClass<RecoveryAuthorizationDenied>()(
  "RecoveryAuthorizationDenied",
  { reason: Schema.Literals(["NotAuthorized"]) },
) {}

export interface LockRecoveryAuthorityService {
  readonly authorize: (owner: OwnerEvidence) => Effect.Effect<void, RecoveryAuthorizationDenied>
}

/** Explicit authority boundary for a human-confirmed or policy-approved stale-lock takeover. */
export class Service extends Context.Service<Service, LockRecoveryAuthorityService>()(
  "@effectify/app-builder-execution/LockRecoveryAuthority",
) {}
