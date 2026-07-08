import { JSDOM } from "jsdom"
import { AtomRegistry } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import { describe, expect, it } from "vitest"
import * as Diagnostics from "../src/diagnostics.js"
import * as Hydration from "../src/hydration.js"
import * as Runtime from "../src/runtime.js"

const effectLike = { _tag: "EffectLike" } as const

const visibleBoundary = (
  children: ReadonlyArray<LoomCore.Ast.Node>,
  events: ReadonlyArray<LoomCore.Ast.EventBinding> = [],
) =>
  LoomCore.Ast.element("section", {
    attributes: {
      [Hydration.attributeName]: "visible",
    },
    hydration: LoomCore.Ast.hydrationMetadata("visible", {
      [Hydration.attributeName]: "visible",
    }),
    children,
    events,
  })

describe("@effectify/loom-runtime diagnostics domain", () => {
  it("creates canonical reports with aggregate helpers", () => {
    const hydrationReport = Diagnostics.makeReport("hydration", [
      Diagnostics.makeIssue({
        phase: "hydration",
        severity: "warn",
        code: "loom.hydration.bootstrap.missing-start-marker",
        message: "Hydration boundary b0 is missing its SSR start marker.",
        subject: "boundary:b0",
        details: {
          boundaryId: "b0",
          reason: "missing-start-marker",
        },
      }),
      Diagnostics.makeIssue({
        phase: "hydration",
        severity: "error",
        code: "loom.hydration.activation.missing-effect-dispatcher",
        message: "Hydration boundary b0 cannot dispatch effect handlers without an effect dispatcher.",
        subject: "boundary:b0/node:b0.n0/event:click",
      }),
    ])
    const runtimeReport = Diagnostics.makeReport("runtime", [
      Diagnostics.makeIssue({
        phase: "runtime",
        severity: "info",
        code: "loom.runtime.render.started",
        message: "Runtime render started.",
        subject: "render:root",
      }),
    ])

    expect(hydrationReport.counts).toEqual({
      info: 0,
      warn: 1,
      error: 1,
      fatal: 0,
    })
    expect(Diagnostics.hasErrors(hydrationReport)).toBe(true)
    expect(Diagnostics.summarize(hydrationReport)).toEqual({
      phase: "hydration",
      total: 2,
      highestSeverity: "error",
      hasErrors: true,
    })
    expect(Diagnostics.groupByPhase([hydrationReport, runtimeReport])).toEqual({
      runtime: [runtimeReport],
      hydration: [hydrationReport],
      resumability: [],
      router: [],
      adapter: [],
    })
  })

  it("rejects unsupported taxonomy values and non-serializable details", () => {
    expect(() =>
      Diagnostics.makeIssue({
        phase: "unknown",
        severity: "warn",
        code: "loom.runtime.invalid-phase",
        message: "invalid phase",
        subject: "runtime",
      })
    ).toThrowError(/Unsupported diagnostic phase/i)

    expect(() =>
      Diagnostics.makeIssue({
        phase: "runtime",
        severity: "critical",
        code: "loom.runtime.invalid-severity",
        message: "invalid severity",
        subject: "runtime",
      })
    ).toThrowError(/Unsupported diagnostic severity/i)

    expect(() =>
      Diagnostics.makeIssue({
        phase: "runtime",
        severity: "warn",
        code: "loom.runtime.invalid-details",
        message: "invalid details",
        subject: "runtime",
        details: {
          element: globalThis.document?.body ?? new JSDOM("<body></body>").window.document.body,
        },
      })
    ).toThrowError(/JSON-safe/i)
  })
})

describe("@effectify/loom-runtime diagnostics translation", () => {
  it("emits canonical hydration diagnostics from bootstrap mismatches", () => {
    const dom = new JSDOM('<div data-loom-boundary="b0"></div>')
    const result = Runtime.bootstrapHydration(dom.window.document.body)

    expect(result.mismatches).toHaveLength(3)
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        phase: "hydration",
        counts: {
          info: 0,
          warn: 3,
          error: 0,
          fatal: 0,
        },
        highestSeverity: "warn",
      }),
    ])
    expect(result.diagnostics[0]?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "loom.hydration.bootstrap.missing-strategy",
          subject: "boundary:b0",
        }),
        expect.objectContaining({
          code: "loom.hydration.bootstrap.missing-start-marker",
          subject: "boundary:b0",
        }),
        expect.objectContaining({
          code: "loom.hydration.bootstrap.missing-end-marker",
          subject: "boundary:b0",
        }),
      ]),
    )
  })

  it("emits canonical resumability diagnostics from SSR translation seams", () => {
    const registry = AtomRegistry.make()
    const render = Runtime.renderToHtml(
      visibleBoundary([
        LoomCore.Ast.element("button", {
          attributes: { type: "button" },
          events: [Runtime.eventBinding("click", effectLike)],
          children: [LoomCore.Ast.text("save")],
        }),
      ]),
      { registry },
    )

    expect(render.resumability.status).toBe("unsupported")
    expect(render.diagnostics).toEqual([
      expect.objectContaining({
        phase: "resumability",
        highestSeverity: "error",
      }),
    ])
    expect(render.diagnostics[0]?.issues).toEqual([
      expect.objectContaining({
        code: "loom.resumability.render.missing-handler-ref",
        subject: "handlers[0].ref",
      }),
    ])
  })

  it("emits canonical hydration diagnostics from activation issues", () => {
    const render = Runtime.renderToHtml(
      visibleBoundary([
        LoomCore.Ast.element("button", {
          attributes: { type: "button" },
          events: [Runtime.eventBinding("click", effectLike)],
          children: [LoomCore.Ast.text("save")],
        }),
      ]),
    )
    const dom = new JSDOM(`<div id="loom-root">${render.html}</div>`)
    const root = dom.window.document.getElementById("loom-root")

    if (root === null) {
      throw new Error("expected hydration root")
    }

    const activation = Runtime.activateHydration(root, render)

    expect(activation.issues).toEqual([
      expect.objectContaining({
        reason: "missing-effect-dispatcher",
      }),
    ])
    expect(activation.diagnostics).toEqual([
      expect.objectContaining({
        phase: "hydration",
        highestSeverity: "error",
      }),
    ])
    expect(activation.diagnostics[0]?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "loom.hydration.activation.missing-effect-dispatcher",
          subject: "boundary:b0/node:b0.n0/event:click",
        }),
      ]),
    )
  })
})
