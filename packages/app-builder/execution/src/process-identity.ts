import { hostname } from "node:os"
import { randomUUID } from "node:crypto"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

export interface ProcessInstance {
  readonly hostId: string
  readonly bootId: string
  readonly pid: number
  readonly processStart: string
  readonly nonce: string
}

export type OwnerStatus =
  | { readonly _tag: "Alive" }
  | { readonly _tag: "Dead" }
  | { readonly _tag: "Unknown" }
  | { readonly _tag: "ForeignHost" }

export interface ProcessIdentityService {
  readonly current: () => Effect.Effect<ProcessInstance>
  /** A Dead result proves the exact same host, boot, PID, and process-start identity is no longer alive. */
  readonly inspect: (owner: ProcessInstance) => Effect.Effect<OwnerStatus>
}

export class Service extends Context.Service<Service, ProcessIdentityService>()(
  "@effectify/app-builder-execution/ProcessIdentity",
) {}

/** The Node adapter refuses stale recovery because it cannot prove another process instance's start identity. */
export const makeLive = (): ProcessIdentityService => {
  const processStart = `node:${process.pid}:${randomUUID()}`
  const hostId = hostname()
  return {
    current: () =>
      Effect.succeed({
        hostId,
        bootId: "node-unverified-boot",
        pid: process.pid,
        processStart,
        nonce: randomUUID(),
      }),
    inspect: (owner) => Effect.succeed(owner.hostId === hostId ? { _tag: "Unknown" } : { _tag: "ForeignHost" }),
  }
}
