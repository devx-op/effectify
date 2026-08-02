import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { Identity } from "./identity.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"
import { type PassivePlan, decodePassivePlan } from "./passive-record.js"
import { type ProtocolRef, type RunRef, decodeProtocolRef, decodeRunRef } from "./reference.js"

/** A stable contracts-owned identifier for a persisted wizard draft. */
export const DraftId = Identity.pipe(Schema.brand("AppBuilder.DraftId"))
export type DraftId = typeof DraftId.Type

/**
 * Validated, passive wizard material that storage may persist without importing CLI intent,
 * prompts, defaults, or execution authority.
 */
export interface ValidatedWizardDraft {
  readonly draftId: DraftId
  readonly runRef: RunRef
  readonly protocolRef: ProtocolRef
  readonly passivePlan: PassivePlan
}

export class MalformedWizardDraft extends Schema.TaggedErrorClass<MalformedWizardDraft>()("MalformedWizardDraft", {
  source: Schema.Literals(["draft-id", "passive-plan", "protocol-ref", "run-ref", "shape"]),
}) {}

export type WizardDraftFailure = MalformedWizardDraft

const malformed = (source: MalformedWizardDraft["source"]): MalformedWizardDraft => new MalformedWizardDraft({ source })

const draftKeys = ["draftId", "runRef", "protocolRef", "passivePlan"] as const

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null

const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

/** Decode an untrusted persisted draft identifier into its contracts-owned brand. */
export const decodeDraftId = (input: unknown): Result.Result<DraftId, WizardDraftFailure> =>
  Schema.decodeUnknownResult(DraftId)(input).pipe(Result.mapError(() => malformed("draft-id")))

const decodeValidatedWizardDraftValue = (value: Json): Result.Result<ValidatedWizardDraft, WizardDraftFailure> => {
  if (!isRecord(value) || !hasExactKeys(value, draftKeys)) {
    return Result.fail(malformed("shape"))
  }

  return Result.all({
    draftId: decodeDraftId(value.draftId),
    runRef: decodeRunRef(value.runRef).pipe(Result.mapError(() => malformed("run-ref"))),
    protocolRef: decodeProtocolRef(value.protocolRef).pipe(Result.mapError(() => malformed("protocol-ref"))),
    passivePlan: decodePassivePlan(value.passivePlan).pipe(Result.mapError(() => malformed("passive-plan"))),
  }).pipe(Result.map((draft) => Object.freeze(draft)))
}

/**
 * Decode and freeze a storage-safe wizard draft. CLI intent, prompts, defaults, and all other
 * non-contract fields are rejected rather than persisted.
 */
export const decodeValidatedWizardDraft = (input: unknown): Result.Result<ValidatedWizardDraft, WizardDraftFailure> =>
  normalizeJson(input).pipe(
    Result.mapError(() => malformed("shape")),
    Result.flatMap(decodeValidatedWizardDraftValue),
  )
