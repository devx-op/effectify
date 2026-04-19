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
      diagnostics: [],
      diagnosticSummary: [],
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
      diagnostics: [
        {
          phase: "adapter",
          counts: {
            info: 0,
            warn: 0,
            error: 1,
            fatal: 0,
          },
          highestSeverity: "error",
          issues: [
            {
              phase: "adapter",
              severity: "error",
              code: "loom.adapter.bootstrap.missing-root",
              message:
                "Loom bootstrap found a serialized payload, but the declared root element is missing from the document.",
              subject: "missing-root",
              details: {
                rootId: "missing-root",
                payloadElementId: "loom-payload",
                validationStatus: "valid",
              },
            },
          ],
        },
      ],
      diagnosticSummary: [
        {
          phase: "adapter",
          total: 1,
          highestSeverity: "error",
          hasErrors: true,
        },
      ],
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
      diagnostics: [
        {
          phase: "adapter",
          counts: {
            info: 1,
            warn: 0,
            error: 0,
            fatal: 0,
          },
          highestSeverity: "info",
          issues: [
            {
              phase: "adapter",
              severity: "info",
              code: "loom.adapter.bootstrap.missing-payload",
              message: "Loom bootstrap could not find a serialized payload in the current document.",
              subject: "__loom_payload__",
              details: {
                payloadElementId: "__loom_payload__",
              },
            },
          ],
        },
      ],
      diagnosticSummary: [
        {
          phase: "adapter",
          total: 1,
          highestSeverity: "info",
          hasErrors: false,
        },
      ],
    })
    expect(document.body.innerHTML).toBe(before)
  })
})
