import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import { LoomNitro } from "../../nitro/src/index.js"
import { Html, Hydration, Resumability } from "../../web/src/index.js"
import { bootstrap } from "../src/loom-vite.js"

const effectLike = { _tag: "EffectLike" } as const

describe("@effectify/loom-vite resumability bootstrap", () => {
  it("validates the Nitro payload, resolves the local registry, and resumes browser activation", async () => {
    const clickRef = Resumability.makeExecutableRef("app/counter", "onClick")
    const localRegistry = Resumability.makeLocalRegistry()
    const dispatched: Array<string> = []

    const nitro = LoomNitro.renderer({
      render: () => ({
        title: "Ready",
        body: Html.el(
          "section",
          Html.hydrate(Hydration.visible()),
          Html.on("click", Resumability.handler(clickRef, effectLike)),
          Html.children("ready"),
        ),
      }),
    })

    const result = await nitro.render({
      method: "GET",
      url: "/demo",
      headers: {},
    })

    if (result.resumability === undefined) {
      throw new Error("expected Nitro resumability payload")
    }

    Resumability.registerHandler(localRegistry, clickRef, effectLike)

    const dom = new JSDOM(result.html)

    const bootstrapResult = await bootstrap(dom.window.document, {
      localRegistry,
      onEffect: (effect) => {
        dispatched.push(effect._tag)
      },
    })

    expect(bootstrapResult.status).toBe("resumed")
    expect(bootstrapResult.activation?.issues).toEqual([])
    expect(bootstrapResult.diagnostics).toEqual([])
    expect(bootstrapResult.diagnosticSummary).toEqual([])

    const button = dom.window.document.querySelector("section")

    if (!(button instanceof dom.window.HTMLElement)) {
      throw new Error("expected hydratable section element")
    }

    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }))

    expect(dispatched).toEqual(["EffectLike"])
  })

  it("downgrades to fresh-start explicitly when validation fails against the local registry", async () => {
    const clickRef = Resumability.makeExecutableRef("app/counter", "onClick")

    const nitro = LoomNitro.renderer({
      render: () => ({
        title: "Fresh start",
        body: Html.el(
          "section",
          Html.hydrate(Hydration.visible()),
          Html.on("click", Resumability.handler(clickRef, effectLike)),
          Html.children("ready"),
        ),
      }),
    })

    const result = await nitro.render({
      method: "GET",
      url: "/fresh-start",
      headers: {},
    })

    if (result.resumability === undefined) {
      throw new Error("expected resumability payload")
    }

    const dom = new JSDOM(result.html)

    const bootstrapResult = await bootstrap(dom.window.document, {
      expectedBuildId: "mismatched-build-id",
      localRegistry: Resumability.makeLocalRegistry(),
    })

    expect(bootstrapResult.status).toBe("fresh-start")
    expect(bootstrapResult.activation).toBeUndefined()
    expect(bootstrapResult.diagnostics).toEqual([
      {
        phase: "adapter",
        counts: {
          info: 0,
          warn: 1,
          error: 0,
          fatal: 0,
        },
        highestSeverity: "warn",
        issues: [
          {
            phase: "adapter",
            severity: "warn",
            code: "loom.adapter.bootstrap.fresh-start",
            message: "Loom bootstrap fell back to a fresh client start instead of resumability.",
            subject: "__loom_payload__",
            details: {
              payloadElementId: "__loom_payload__",
              rootId: null,
              validationStatus: "invalid",
              issueCount: 1,
            },
          },
        ],
      },
    ])
    expect(bootstrapResult.diagnosticSummary).toEqual([
      {
        phase: "adapter",
        total: 1,
        highestSeverity: "warn",
        hasErrors: false,
      },
    ])
    expect(bootstrapResult.validation).toEqual({
      status: "invalid",
      issues: [
        expect.objectContaining({
          path: "buildId",
          reason: "build-id-mismatch",
        }),
      ],
    })
  })

  it("translates hydration activation diagnostics onto the public bootstrap result", async () => {
    const clickRef = Resumability.makeExecutableRef("app/counter", "onClick")
    const localRegistry = Resumability.makeLocalRegistry()
    const nitro = LoomNitro.renderer({
      render: () => ({
        title: "Diagnostics",
        body: Html.el(
          "section",
          Html.hydrate(Hydration.visible()),
          Html.on("click", Resumability.handler(clickRef, effectLike)),
          Html.children("ready"),
        ),
      }),
    })
    const result = await nitro.render({
      method: "GET",
      url: "/diagnostics",
      headers: {},
    })

    if (result.resumability === undefined) {
      throw new Error("expected resumability payload")
    }

    Resumability.registerHandler(localRegistry, clickRef, effectLike)

    const dom = new JSDOM(result.html)

    const bootstrapResult = await bootstrap(dom.window.document, {
      localRegistry,
    })

    expect(bootstrapResult.status).toBe("resumed")
    expect(bootstrapResult.activation?.issues).toEqual([
      expect.objectContaining({
        reason: "missing-effect-dispatcher",
      }),
    ])
    expect(bootstrapResult.diagnosticSummary).toEqual([
      {
        phase: "hydration",
        total: 1,
        highestSeverity: "error",
        hasErrors: true,
      },
    ])
  })
})
