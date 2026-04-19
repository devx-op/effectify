// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { bootstrap } from "../src/loom-vite.js"

const activationPayload = {
  version: 1 as const,
  rootId: "loom-root",
  manifest: { boundaries: [], deferred: [] },
  dehydratedAtoms: [],
}

describe("@effectify/loom-vite bootstrap", () => {
  it("activates a serialized Loom activation payload from the browser document", () => {
    document.body.innerHTML = `<div id="loom-root"></div><script type="application/json" id="loom-payload">${
      JSON.stringify(activationPayload)
    }</script>`

    const result = bootstrap(document, { payloadElementId: "loom-payload" })

    expect(result).toMatchObject({
      status: "activated",
      payload: activationPayload,
      activation: {
        boundaries: [],
        deferred: [],
        issues: [],
      },
    })
  })

  it("reports missing root drift while preserving the decoded activation payload", () => {
    document.body.innerHTML = `<script type="application/json" id="loom-payload">${
      JSON.stringify(activationPayload)
    }</script>`

    const result = bootstrap(document, { payloadElementId: "loom-payload" })

    expect(result).toEqual({
      status: "missing-root",
      payload: activationPayload,
    })
  })

  it("leaves the document untouched when no serialized activation payload exists", () => {
    document.body.innerHTML = '<div id="loom-root"><main>static</main></div>'
    const before = document.body.innerHTML

    const result = bootstrap(document)

    expect(result).toEqual({
      status: "missing-payload",
    })
    expect(document.body.innerHTML).toBe(before)
  })
})
