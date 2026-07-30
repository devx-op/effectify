import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import {
  decodeBaseline,
  decodeCallbackRecord,
  decodeContinuationRecord,
  decodePassivePlan,
  decodePinnedInput,
  decodeProvenance,
  decodeReplayExpectation,
  decodeValidation,
} from "../src/passive-record.js"

const version = { major: 1, minor: 0, patch: 0 }
const reference = (id: string) => ({ id, version })

const passivePlan = {
  planRef: reference("plan:release"),
  steps: [
    {
      _tag: "ToolStep",
      stepKey: "tool-read",
      toolRef: reference("tool:read"),
      pinnedInputs: [
        {
          inputKey: "path",
          schemaRef: reference("schema:path"),
          value: { path: "/workspace", options: { followSymlinks: false } },
        },
      ],
    },
    {
      _tag: "CallbackStep",
      stepKey: "callback-confirm",
      callback: { callbackRef: reference("callback:confirm"), responseSchemaRef: reference("schema:confirmation") },
    },
    {
      _tag: "ContinuationStep",
      stepKey: "continuation-next",
      continuation: { continuationRef: reference("continuation:next"), responseSchemaRef: reference("schema:next") },
    },
  ],
}

it("decodes closed passive plans as frozen records while retaining declared step and input order", () => {
  const plan = Result.getOrThrowWith(decodePassivePlan(passivePlan), (failure) => failure)

  expect(plan.steps.map((step) => step._tag)).toEqual(["ToolStep", "CallbackStep", "ContinuationStep"])
  const toolStep = plan.steps[0]
  if (toolStep._tag !== "ToolStep") throw new Error("expected the first fixture step to be a tool step")
  expect(toolStep).toMatchObject({ stepKey: "tool-read", pinnedInputs: [{ inputKey: "path" }] })
  expect(Object.isFrozen(plan)).toBe(true)
  expect(Object.isFrozen(plan.steps)).toBe(true)
  expect(Object.isFrozen(toolStep)).toBe(true)
  expect(Object.isFrozen(toolStep.pinnedInputs)).toBe(true)
  expect(Object.isFrozen(toolStep.pinnedInputs[0].value)).toBe(true)
})

it("rejects excess keys and hostile inputs without leaking getter or proxy details", () => {
  expect(decodePassivePlan({ ...passivePlan, execute: true })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedPassiveRecord" },
  })
  expect(
    decodePassivePlan({
      get planRef() {
        throw new Error("secret")
      },
      steps: [],
    }),
  ).toMatchObject({ _tag: "Failure", failure: { _tag: "UnsupportedPassiveJson" } })
  expect(
    decodePassivePlan(
      new Proxy(passivePlan, {
        ownKeys: () => {
          throw new Error("secret")
        },
      }),
    ),
  ).toMatchObject({ _tag: "Failure", failure: { _tag: "UnsupportedPassiveJson" } })
})

it("decodes every passive record variant and preserves optional external digest and trace claims", () => {
  const digestRef = {
    id: "digest:material",
    version,
    algorithm: "sha256",
    value: "external-material",
  }
  const input = Result.getOrThrowWith(
    decodePinnedInput({ inputKey: "path", schemaRef: reference("schema:path"), value: null, digestRef }),
    (failure) => failure,
  )
  const callback = Result.getOrThrowWith(
    decodeCallbackRecord({
      callbackRef: reference("callback:confirm"),
      responseSchemaRef: reference("schema:confirm"),
    }),
    (failure) => failure,
  )
  const continuation = Result.getOrThrowWith(
    decodeContinuationRecord({
      continuationRef: reference("continuation:next"),
      responseSchemaRef: reference("schema:next"),
    }),
    (failure) => failure,
  )
  const provenance = Result.getOrThrowWith(
    decodeProvenance({ runRef: reference("run:one"), traceRef: reference("trace:one") }),
    (failure) => failure,
  )
  const baseline = Result.getOrThrowWith(
    decodeBaseline({ planRef: reference("plan:release"), materialDigestRef: digestRef }),
    (failure) => failure,
  )

  expect(input.digestRef).toMatchObject({ algorithm: "sha256", value: "external-material" })
  expect(callback.callbackRef.id).toBe("callback:confirm")
  expect(continuation.continuationRef.id).toBe("continuation:next")
  expect(provenance.traceRef?.id).toBe("trace:one")
  expect(baseline.materialDigestRef?.id).toBe("digest:material")
  expect(decodeValidation({ _tag: "Accepted", validationKey: "accepted" })).toMatchObject({ _tag: "Success" })
  expect(decodeValidation({ _tag: "Rejected", validationKey: "rejected" })).toMatchObject({ _tag: "Success" })
  expect(decodeReplayExpectation({ _tag: "Equivalent", expectationKey: "same" })).toMatchObject({ _tag: "Success" })
  expect(decodeReplayExpectation({ _tag: "Different", expectationKey: "changed" })).toMatchObject({ _tag: "Success" })
})

it("rejects each malformed passive record shape before it can become a replay contract", () => {
  expect(decodePinnedInput({ inputKey: "", schemaRef: reference("schema:path"), value: null })).toMatchObject({
    _tag: "Failure",
  })
  expect(
    decodeCallbackRecord({
      callbackRef: reference("callback:confirm"),
      responseSchemaRef: reference("schema:confirm"),
      extra: true,
    }),
  ).toMatchObject({ _tag: "Failure" })
  expect(decodeContinuationRecord({ continuationRef: reference("continuation:next") })).toMatchObject({
    _tag: "Failure",
  })
  expect(
    decodePassivePlan({
      planRef: reference("plan:release"),
      steps: [{ _tag: "ToolStep", stepKey: "tool", toolRef: reference("tool:read"), pinnedInputs: {} }],
    }),
  ).toMatchObject({ _tag: "Failure" })
  expect(
    decodePassivePlan({ planRef: reference("plan:release"), steps: [{ _tag: "Unknown", stepKey: "x" }] }),
  ).toMatchObject({ _tag: "Failure" })
  expect(decodeProvenance({ runRef: reference("run:one"), extra: true })).toMatchObject({ _tag: "Failure" })
  expect(decodeBaseline({ planRef: reference("plan:release") })).toMatchObject({
    _tag: "Success",
    success: { planRef: reference("plan:release") },
  })
  expect(decodeBaseline({ planRef: reference("plan:release"), materialDigestRef: { id: "digest:bad" } })).toMatchObject(
    { _tag: "Failure" },
  )
  expect(decodeValidation({ _tag: "Unknown", validationKey: "invalid" })).toMatchObject({ _tag: "Failure" })
  expect(decodeReplayExpectation({ _tag: "Equivalent", expectationKey: 1 })).toMatchObject({ _tag: "Failure" })
})
