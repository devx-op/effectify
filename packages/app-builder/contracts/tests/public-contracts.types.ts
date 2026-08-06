import type * as Contracts from "../src/index.js"
import * as Schema from "effect/Schema"

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false
type Expect<Value extends true> = Value

interface Input {
  readonly path: string
}
interface Output {
  readonly result: string
}
interface Failure {
  readonly message: string
}
interface Requirements {
  readonly grant: "workspace:read"
}

declare const declaration: Contracts.Declaration.Declaration<Input, Output, Failure, Requirements>
const output = Schema.Struct({ result: Schema.String })
const failure = Schema.Struct({ message: Schema.String })

type DeclarationRequirements = Expect<
  Equal<
    Contracts.Declaration.Declaration<Input, Output, Failure, Requirements>["requirements"][number]["kind"],
    "capability" | "constraint" | "permission"
  >
>
type EnvelopeTypeChannel = Expect<
  Equal<
    Contracts.Envelope.CompleteEnvelopeType<typeof output, typeof failure>["outcome"]["_tag"],
    "Success" | "Failure" | "InputRequired"
  >
>
type EnvelopeEncodedChannel = Expect<
  Equal<
    keyof Contracts.Envelope.CompleteEnvelopeEncoded<typeof output, typeof failure>,
    "protocolVersion" | "runRef" | "traceRef" | "planDigestRef" | "outputDigestRef" | "outcome" | "diagnostics"
  >
>
type PassiveRecordsDoNotGainChannels = Expect<
  Equal<Extract<keyof Contracts.PassiveRecord.PassivePlan, "Type" | "Encoded" | "Error" | "Requirements">, never>
>
type ReplayRecordsDoNotGainChannels = Expect<
  Equal<Extract<keyof Contracts.Replay.ReplayContract, "Type" | "Encoded" | "Error" | "Requirements">, never>
>
type WizardDraftHasOnlyPassiveContractFields = Expect<
  Equal<keyof Contracts.WizardDraft.ValidatedWizardDraft, "draftId" | "runRef" | "protocolRef" | "passivePlan">
>
type WizardDraftDoesNotExposeCliIntentOrDefaults = Expect<
  Equal<Extract<keyof Contracts.WizardDraft.ValidatedWizardDraft, "intent" | "defaults" | "prompt">, never>
>

void declaration
void (null as unknown as DeclarationRequirements)
void (null as unknown as EnvelopeTypeChannel)
void (null as unknown as EnvelopeEncodedChannel)
void (null as unknown as PassiveRecordsDoNotGainChannels)
void (null as unknown as ReplayRecordsDoNotGainChannels)
void (null as unknown as WizardDraftHasOnlyPassiveContractFields)
void (null as unknown as WizardDraftDoesNotExposeCliIntentOrDefaults)
