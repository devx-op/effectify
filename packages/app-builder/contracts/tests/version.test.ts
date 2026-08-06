import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { checkCompatibility, compareVersions, decodeVersion } from "../src/version.js"

const version = (major: number, minor: number, patch: number) =>
  Result.getOrThrowWith(decodeVersion({ major, minor, patch }), (failure) => failure)

it("orders safe versions and accepts caller support", () => {
  expect(compareVersions(version(1, 2, 0), version(1, 1, 9))).toBe(1)
  expect(compareVersions(version(1, 2, 0), version(1, 2, 0))).toBe(0)
  expect(
    Result.isSuccess(checkCompatibility({ major: 1, minor: 2, patch: 0 }, { major: 1, supportedMinors: [2] })),
  ).toBe(true)
})

it("returns malformed versions without retaining hostile input", () => {
  for (const input of [
    { major: -1, minor: 0, patch: 0 },
    { major: 1.5, minor: 0, patch: 0 },
    { major: Number.MAX_SAFE_INTEGER + 1, minor: 0, patch: 0 },
    {
      get major() {
        throw new Error("secret")
      },
    },
    new Proxy(
      {},
      {
        get: () => {
          throw new Error("secret")
        },
      },
    ),
  ]) {
    expect(decodeVersion(input)).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedVersion" } })
  }
})

it("rejects unsupported majors and minors", () => {
  for (const [candidate, reason] of [
    [{ major: 2, minor: 0, patch: 0 }, "unsupported-major"],
    [{ major: 1, minor: 3, patch: 0 }, "unsupported-minor"],
  ] as const) {
    expect(checkCompatibility(candidate, { major: 1, supportedMinors: [2] })).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "IncompatibleVersion", reason },
    })
  }
})

it("preserves malformed candidate and support sources", () => {
  expect(decodeVersion({ major: -1, minor: 0, patch: 0 })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedVersion", source: "candidate" },
  })
  expect(checkCompatibility({ major: 1, minor: 0, patch: 0 }, { major: 1, supportedMinors: [-1] })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedVersion", source: "support" },
  })
})
