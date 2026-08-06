import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Contracts from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:store-recovery", version }
const planRef = { id: "plan:store-recovery", version }
const protocolRef = { id: "protocol:store-recovery", version }
const toolRef = { id: "tool:store-recovery", version }
const schemaRef = { id: "schema:store-recovery", version }

const validDraft = () => ({
  draftId: "draft:store-recovery",
  runRef,
  protocolRef,
  passivePlan: {
    planRef,
    steps: [
      {
        _tag: "ToolStep",
        stepKey: "prepare",
        toolRef,
        pinnedInputs: [{ inputKey: "workspace", schemaRef, value: { branch: "main" } }],
      },
    ],
  },
})

const success = <Value>(result: Result.Result<Value, unknown>): Value =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })

it("validates and freezes contracts-owned passive wizard drafts", () => {
  const source = validDraft()
  const draft = success(Contracts.WizardDraft.decodeValidatedWizardDraft(source))

  source.passivePlan.steps[0]!.pinnedInputs[0]!.value = { branch: "changed-after-validation" }

  expect(draft).toMatchObject({
    draftId: "draft:store-recovery",
    runRef,
    protocolRef,
    passivePlan: { planRef, steps: [{ _tag: "ToolStep", stepKey: "prepare" }] },
  })
  const step = draft.passivePlan.steps[0]
  if (step?._tag !== "ToolStep") throw new Error("Expected the validated passive plan to retain its tool step")
  expect(step.pinnedInputs[0]?.value).toEqual({ branch: "main" })
  expect(Object.isFrozen(draft)).toBe(true)
  expect(Object.isFrozen(draft.passivePlan.steps)).toBe(true)
})

it("rejects malformed draft identifiers and CLI-owned intent/default channels", () => {
  const malformedId = Contracts.WizardDraft.decodeValidatedWizardDraft({ ...validDraft(), draftId: "" })
  const cliIntent = Contracts.WizardDraft.decodeValidatedWizardDraft({
    ...validDraft(),
    intent: "execute-now",
    defaults: { workingDirectory: "/tmp" },
  })

  expect(malformedId).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedWizardDraft", source: "draft-id" } })
  expect(cliIntent).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedWizardDraft", source: "shape" } })
})

it("decodes a valid DraftId while rejecting an empty identifier", () => {
  const accepted = Contracts.WizardDraft.decodeDraftId("draft:another-recovery")
  const rejected = Contracts.WizardDraft.decodeDraftId("")

  expect(accepted).toMatchObject({ _tag: "Success", success: "draft:another-recovery" })
  expect(rejected).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedWizardDraft", source: "draft-id" } })
})
