import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { type Json, type JsonRecord } from "../src/json.js"
import { decodeReplayContract, projectReplayMaterial } from "../src/replay.js"
import { replayFixture } from "./replay-fixture.js"

const project = (input: unknown) =>
  Result.getOrThrowWith(decodeReplayContract(input).pipe(Result.flatMap(projectReplayMaterial)), (failure) => failure)

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && value !== null && typeof value === "object"

it("canonicalizes equivalent replay material with reordered object keys", () => {
  const first = project(replayFixture())
  const reordered = replayFixture()
  const input = reordered.pinnedInputs[0]
  reordered.pinnedInputs[0] = { ...input, value: { a: 1, b: 2 } }
  const second = project(reordered)

  expect(first.algorithm).toBe("effectify-cjson/1")
  if (!isRecord(first.material)) {
    throw new Error("expected replay material to be a record")
  }
  expect(first.material.format).toBe("effectify-replay/1")
  const plan = first.material.plan
  if (!isRecord(plan) || !Array.isArray(plan.steps)) {
    throw new Error("expected replay material to retain the ordered plan")
  }
  expect(plan.steps[0]).toMatchObject({ stepKey: "read" })
  expect(first.text).toBe(second.text)
})

it("changes canonical replay identity when semantic fields or ordered arrays change", () => {
  const baseline = project(replayFixture())
  const semanticChange = project(replayFixture({ validationKey: "schema-rejected" }))
  const orderChange = project(replayFixture({ reverseSteps: true }))

  expect(semanticChange.text).not.toBe(baseline.text)
  expect(orderChange.text).not.toBe(baseline.text)
})

it("rejects malformed replay contracts without echoing private input", () => {
  expect(decodeReplayContract({ ...replayFixture(), execute: true })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedReplayContract" },
  })
  expect(
    decodeReplayContract(
      new Proxy(replayFixture(), {
        ownKeys: () => {
          throw new Error("secret")
        },
      }),
    ),
  ).toMatchObject({ _tag: "Failure", failure: { _tag: "UnsupportedReplayJson" } })
})

it("rejects malformed declaration and passive collection entries before projection", () => {
  expect(decodeReplayContract({ ...replayFixture(), declarations: {} })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedReplayContract" },
  })
  expect(decodeReplayContract({ ...replayFixture(), declarations: [{ ref: { id: "tool:bad" } }] })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedReplayContract" },
  })
  expect(decodeReplayContract({ ...replayFixture(), callbacks: [{ callbackRef: "bad" }] })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedReplayContract" },
  })
  expect(decodeReplayContract({ ...replayFixture(), digestClaims: [{ id: "digest:bad" }] })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedReplayContract" },
  })
})
