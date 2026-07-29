import { expect, it } from "@effect/vitest"
import { decodeRunRef } from "../src/reference.js"

it("maps hostile identity input to a stable non-echoing failure", () => {
  for (const input of [
    new Proxy(
      {},
      {
        get: () => {
          throw new Error("secret")
        },
      },
    ),
    {
      get id() {
        throw new Error("secret")
      },
    },
  ]) {
    const result = decodeRunRef(input)
    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedIdentity", domain: "run" } })
    expect(JSON.stringify(result)).not.toContain("secret")
  }
})

it("maps a hostile reference version getter to a stable non-echoing version failure", () => {
  const result = decodeRunRef({
    id: "run:one",
    get version() {
      throw new Error("secret")
    },
  })

  expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedVersion", source: "reference" } })
  expect(JSON.stringify(result)).not.toContain("secret")
})
