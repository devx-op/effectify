import { JSDOM } from "jsdom"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as Schema from "effect/Schema"
import * as LoomCore from "@effectify/loom-core"
import { describe, expect, it } from "vitest"
import * as Hydration from "../src/hydration.js"
import * as Resumability from "../src/resumability.js"
import * as Runtime from "../src/runtime.js"

const effectLike = { _tag: "EffectLike" } as const

const makeSerializableTextAtom = (key: string, value: string) =>
  Atom.serializable(Atom.make(value), {
    key,
    schema: Schema.String,
  })

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

describe("@effectify/loom-runtime resumability flow", () => {
  it("creates a resumability contract from SSR output and resumes it against the local registry", async () => {
    const clickRef = Resumability.makeExecutableRef("app/counter", "onClick")
    const liveRef = Resumability.makeExecutableRef("app/counter", "renderLive")
    const atom = makeSerializableTextAtom("live:counter", "client")
    const serverRegistry = AtomRegistry.make()
    const clientRegistry = AtomRegistry.make()
    const localRegistry = Resumability.makeLocalRegistry()
    const dispatched: Array<string> = []

    serverRegistry.set(atom, "server")

    const render = Runtime.renderToHtml(
      visibleBoundary([
        LoomCore.Ast.element("button", {
          attributes: { type: "button" },
          events: [Runtime.eventBinding("click", Resumability.handler(clickRef, effectLike))],
          children: [LoomCore.Ast.text("save")],
        }),
        {
          ...LoomCore.Ast.live(
            atom,
            (value) =>
              LoomCore.Ast.element("span", {
                attributes: { "data-live": "value" },
                children: [LoomCore.Ast.text(String(value))],
              }),
          ),
          ref: liveRef,
        },
      ]),
      { registry: serverRegistry },
    )

    expect(render.resumability.status).toBe("ready")

    const contractResult = await Runtime.createResumabilityContract(render, {
      buildId: "build-123",
      rootId: "loom-root",
    })

    expect(contractResult.status).toBe("ready")

    if (contractResult.status !== "ready") {
      throw new Error("expected resumability contract")
    }

    Resumability.registerHandler(localRegistry, clickRef, effectLike)
    Resumability.registerLiveRegion(
      localRegistry,
      liveRef,
      atom,
      (value) =>
        LoomCore.Ast.element("span", {
          attributes: { "data-live": "value" },
          children: [LoomCore.Ast.text(String(value))],
        }),
    )

    const dom = new JSDOM(`<div id="loom-root">${render.html}</div>`)
    const document = dom.window.document
    const root = document.getElementById("loom-root")

    if (root === null) {
      throw new Error("expected SSR root element")
    }

    const activation = Runtime.activateHydration(
      root,
      { contract: contractResult.contract, localRegistry },
      {
        registry: clientRegistry,
        onEffect: (effect) => {
          dispatched.push(effect._tag)
        },
      },
    )

    expect(activation.issues).toEqual([])
    expect(activation.boundaries.map(({ id }) => id)).toEqual(["b0"])
    expect(activation.liveRegions.map(({ id }) => id)).toEqual(["l0"])
    expect(root.querySelector('[data-live="value"]')?.textContent).toBe("server")

    const button = root.querySelector("button")

    if (!(button instanceof dom.window.HTMLButtonElement)) {
      throw new Error("expected hydrated button")
    }

    button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }))
    clientRegistry.set(atom, "updated")

    expect(dispatched).toEqual(["EffectLike"])
    expect(root.querySelector('[data-live="value"]')?.textContent).toBe("updated")
  })

  it("marks resumability unsupported when hydratable handlers or live regions do not carry explicit refs", () => {
    const atom = makeSerializableTextAtom("live:missing-ref", "server")
    const serverRegistry = AtomRegistry.make()

    serverRegistry.set(atom, "server")

    const render = Runtime.renderToHtml(
      visibleBoundary([
        LoomCore.Ast.element("button", {
          attributes: { type: "button" },
          events: [Runtime.eventBinding("click", effectLike)],
          children: [LoomCore.Ast.text("save")],
        }),
        LoomCore.Ast.live(atom, (value) => LoomCore.Ast.text(String(value))),
      ]),
      { registry: serverRegistry },
    )

    expect(render.resumability.status).toBe("unsupported")

    if (render.resumability.status !== "unsupported") {
      throw new Error("expected unsupported resumability draft")
    }

    expect(render.resumability.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "handlers[0].ref",
          reason: "missing-handler-ref",
        }),
        expect.objectContaining({
          path: "liveRegions[0].ref",
          reason: "missing-live-region-ref",
        }),
      ]),
    )
  })
})
