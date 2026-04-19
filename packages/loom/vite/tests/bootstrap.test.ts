// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import * as LoomRuntime from "@effectify/loom-runtime"
import { Resumability } from "../../web/src/index.js"
import { bootstrap } from "../src/loom-vite.js"

const makeActivationPayload = (rootId = "loom-root") =>
  LoomRuntime.Resumability.createContract({
    buildId: "build-123",
    rootId,
    boundaries: [],
    handlers: [],
    liveRegions: [],
    state: { dehydratedAtoms: [], deferred: [] },
  })

describe("@effectify/loom-vite bootstrap", () => {
  it("activates a serialized Loom activation payload from the browser document", async () => {
    const activationPayload = await makeActivationPayload()

    document.body.innerHTML = `<div id="loom-root"></div><script type="application/json" id="loom-payload">${
      JSON.stringify(activationPayload)
    }</script>`

    const result = await bootstrap(document, {
      payloadElementId: "loom-payload",
      expectedBuildId: "build-123",
      localRegistry: Resumability.makeLocalRegistry(),
    })

    expect(result).toMatchObject({
      status: "resumed",
      payload: activationPayload,
      activation: {
        boundaries: [],
        deferred: [],
        issues: [],
      },
    })
  })

  it("reports missing root drift while preserving the decoded activation payload", async () => {
    const activationPayload = await makeActivationPayload("missing-root")

    document.body.innerHTML = `<script type="application/json" id="loom-payload">${
      JSON.stringify(activationPayload)
    }</script>`

    const result = await bootstrap(document, {
      payloadElementId: "loom-payload",
      expectedBuildId: "build-123",
      localRegistry: Resumability.makeLocalRegistry(),
    })

    expect(result).toEqual({
      status: "missing-root",
      payload: activationPayload,
      validation: {
        status: "valid",
        contract: activationPayload,
        issues: [],
      },
    })
  })

  it("leaves the document untouched when no serialized activation payload exists", async () => {
    document.body.innerHTML = '<div id="loom-root"><main>static</main></div>'
    const before = document.body.innerHTML

    const result = await bootstrap(document)

    expect(result).toEqual({
      status: "missing-payload",
    })
    expect(document.body.innerHTML).toBe(before)
  })
})
