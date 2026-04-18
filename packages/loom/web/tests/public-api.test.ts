// @vitest-environment jsdom

import * as LoomRuntime from "@effectify/loom-runtime"
import { describe, expect, it } from "vitest"
import { Component, Html, Hydration } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

describe("@effectify/loom public semantics", () => {
  it("re-exports namespace modules from the package root", () => {
    expect(typeof Component.make).toBe("function")
    expect(typeof Component.effect).toBe("function")
    expect(typeof Html.text).toBe("function")
    expect(typeof Html.el).toBe("function")
    expect(typeof Html.ssr).toBe("function")
    expect(typeof Html.renderToString).toBe("function")
    expect(typeof Hydration.visible).toBe("function")
    expect(typeof Hydration.bootstrap).toBe("function")
    expect(typeof Hydration.activate).toBe("function")
  })

  it("creates component-use nodes when components become children", () => {
    const child = Component.make(Html.text("hello"))
    const capability = Component.effect(effectLike)
    const enhanced = Component.use(child, capability)

    const node = Html.el("section", Html.children(enhanced))

    expect(enhanced.capabilities).toEqual([capability])
    expect(node.children).toEqual([
      {
        _tag: "ComponentUse",
        component: enhanced,
      },
    ])
  })

  it("applies element modifiers, hydration metadata, and event bindings", () => {
    const node = Html.el(
      "button",
      Html.attr("type", "button"),
      Html.className("primary"),
      Html.className("cta"),
      Html.hydrate(Hydration.strategy.visible()),
      Html.on("click", effectLike),
      Html.children("save"),
    )

    expect(node).toEqual({
      _tag: "Element",
      tagName: "button",
      attributes: {
        type: "button",
        class: "primary cta",
        "data-loom-hydrate": "visible",
      },
      children: [{ _tag: "Text", value: "save" }],
      events: [
        {
          _tag: "EventBinding",
          event: "click",
          mode: "effect",
          handler: effectLike,
        },
      ],
      hydration: {
        strategy: "visible",
        attributes: {
          "data-loom-hydrate": "visible",
        },
      },
    })
  })

  it("models hydration as explicit helper values instead of raw strings", () => {
    const strategy = Hydration.strategy.idle()
    const node = Html.el("section", Html.hydrate(strategy), Html.children("ready"))

    expect(strategy).toEqual(Hydration.idle())
    expect(node.hydration).toEqual({
      strategy: "idle",
      attributes: {
        "data-loom-hydrate": "idle",
      },
    })
  })

  it("captures both effect and contextual event forms", () => {
    const simple = Html.on("click", effectLike)
    const contextual = Html.on("input", ({ event, runtime, target }) => {
      expect(event.type).toBe("input")
      expect(runtime.root).toBeNull()
      expect(target).toBeInstanceOf(EventTarget)
      return effectLike
    })

    const contextualHandler = contextual.binding.handler

    if (typeof contextualHandler !== "function") {
      throw new Error("expected contextual handler")
    }

    const effect = contextualHandler({
      event: new Event("input"),
      target: new EventTarget(),
      runtime: { root: null },
    })

    expect(simple.binding.mode).toBe("effect")
    expect(contextual.binding.mode).toBe("contextual")
    expect(effect).toBe(effectLike)
  })

  it("creates fragment and live placeholder nodes", () => {
    const source = { current: "ready" }
    const node = Html.live(source, (value) => Html.fragment(Html.text(value), "!"))

    expect(node._tag).toBe("Live")
    expect(node.render(source)).toEqual({
      _tag: "Fragment",
      children: [
        { _tag: "Text", value: "ready" },
        { _tag: "Text", value: "!" },
      ],
    })

    const ssr = Html.ssr(Html.el("section", Html.children(node)))

    expect(ssr.html).toBe("<section><!--loom-live:deferred:l0--></section>")
    expect(ssr.plan.deferred).toEqual([
      {
        id: "l0",
        kind: "live",
        reason: "deferred",
      },
    ])
  })

  it("collects hydration metadata in the runtime render plan", () => {
    const root = Html.el(
      "main",
      Html.children(
        Html.el("section", Html.hydrate(Hydration.strategy.visible()), Html.children("one")),
        Html.el("aside", Html.hydrate(Hydration.strategy.idle()), Html.children("two")),
      ),
    )

    expect(LoomRuntime.Runtime.plan(root).hydrationAttributes).toEqual([
      ["data-loom-hydrate", "visible"],
      ["data-loom-hydrate", "idle"],
    ])
  })

  it("serializes SSR HTML with component expansion, escaping, and hydration markers", () => {
    const leaf = Component.use(
      Component.make(Html.el("strong", Html.children("<hello>"))),
      Component.effect(effectLike),
    )

    const root = Component.make(
      Html.el(
        "section",
        Html.hydrate(Hydration.strategy.visible()),
        Html.attr("data-label", 'say "hi"'),
        Html.on("click", effectLike),
        Html.children(leaf, Html.fragment(" & ", Html.el("span", Html.children("done")))),
      ),
    )

    const result = Html.ssr(root)

    expect(result.html).toBe(
      '<!--loom-hydrate-start:b0--><section data-loom-hydrate="visible" data-label="say &quot;hi&quot;" data-loom-boundary="b0" data-loom-events="click" data-loom-node="b0.n0" data-loom-node-events="click"><strong>&lt;hello&gt;</strong> &amp; <span>done</span></section><!--loom-hydrate-end:b0-->',
    )
    expect(result.plan.boundaries).toHaveLength(1)
    expect(result.plan.boundaries[0]).toMatchObject({
      id: "b0",
      strategy: "visible",
      attributes: {
        "data-loom-hydrate": "visible",
      },
      eventBindings: [
        {
          nodeId: "b0.n0",
          event: "click",
          mode: "effect",
        },
      ],
    })
  })

  it("activates a discovered boundary and rebinds contextual listeners from SSR metadata", () => {
    const interactions: Array<readonly [eventType: string, targetTag: string, runtimeTag: string]> = []

    const result = Html.ssr(
      Html.el(
        "main",
        Html.hydrate(Hydration.strategy.visible()),
        Html.children(
          Html.el(
            "button",
            Html.attr("type", "button"),
            Html.on("click", ({ event, runtime, target }) => {
              if (!(target instanceof HTMLButtonElement) || !(runtime.root instanceof HTMLElement)) {
                throw new Error("expected hydrated button runtime context")
              }

              interactions.push([event.type, target.tagName, runtime.root.tagName])
              return effectLike
            }),
            Html.children("save"),
          ),
        ),
      ),
    )

    document.body.innerHTML = result.html

    const activation = Hydration.activate(document.body, result)
    const button = document.body.querySelector("button")

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("expected hydrated button element")
    }

    expect(activation.mismatches).toEqual([])
    expect(activation.issues).toEqual([])
    expect(activation.boundaries).toHaveLength(1)
    expect(activation.boundaries[0]).toMatchObject({
      id: "b0",
      strategy: "visible",
      eventNames: ["click"],
      eventBindings: [
        {
          nodeId: "b0.n0",
          event: "click",
          mode: "contextual",
          element: button,
        },
      ],
    })

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(interactions).toEqual([["click", "BUTTON", "MAIN"]])
  })

  it("activates simple effect handlers through an explicit hydration effect dispatcher", () => {
    const dispatched: Array<readonly [effectTag: string, eventType: string, targetTag: string, runtimeTag: string]> = []

    const result = Html.ssr(
      Html.el(
        "main",
        Html.hydrate(Hydration.strategy.visible()),
        Html.children(
          Html.el("button", Html.attr("type", "button"), Html.on("click", effectLike), Html.children("save")),
        ),
      ),
    )

    document.body.innerHTML = result.html

    const activation = Hydration.activate(document.body, result, {
      onEffect: (effect, { event, runtime, target }) => {
        if (!(target instanceof HTMLButtonElement) || !(runtime.root instanceof HTMLElement)) {
          throw new Error("expected hydrated effect dispatcher context")
        }

        dispatched.push([effect._tag, event.type, target.tagName, runtime.root.tagName])
      },
    })
    const button = document.body.querySelector("button")

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("expected hydrated button element")
    }

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(activation.issues).toEqual([])
    expect(activation.boundaries[0]?.eventBindings).toMatchObject([
      {
        nodeId: "b0.n0",
        event: "click",
        mode: "effect",
        element: button,
      },
    ])
    expect(dispatched).toEqual([["EffectLike", "click", "BUTTON", "MAIN"]])
  })

  it("activates from the minimal SSR activation source instead of the in-memory render plan", () => {
    const interactions: Array<readonly [eventType: string, targetTag: string, runtimeTag: string]> = []

    const result = Html.ssr(
      Html.el(
        "main",
        Html.hydrate(Hydration.strategy.visible()),
        Html.children(
          Html.el(
            "button",
            Html.attr("type", "button"),
            Html.on("click", ({ event, runtime, target }) => {
              if (!(target instanceof HTMLButtonElement) || !(runtime.root instanceof HTMLElement)) {
                throw new Error("expected hydrated contextual runtime context")
              }

              interactions.push([event.type, target.tagName, runtime.root.tagName])
              return effectLike
            }),
            Html.children("save"),
          ),
        ),
      ),
    )

    document.body.innerHTML = result.html

    const activation = Hydration.activate(document.body, result.activation)
    const button = document.body.querySelector("button")

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("expected hydrated button element")
    }

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect("plan" in result.activation).toBe(false)
    expect(activation.issues).toEqual([])
    expect(interactions).toEqual([["click", "BUTTON", "MAIN"]])
  })

  it("keeps live nodes explicitly deferred during hydration activation", () => {
    const source = { current: "ready" }
    const result = Html.ssr(
      Html.el(
        "section",
        Html.hydrate(Hydration.strategy.visible()),
        Html.children(Html.live(source, (value) => Html.text(value))),
      ),
    )

    document.body.innerHTML = result.html

    const activation = Hydration.activate(document.body, result)

    expect(activation.deferred).toEqual([
      {
        id: "l0",
        kind: "live",
        reason: "deferred",
      },
    ])
    expect(document.body.innerHTML).toContain("loom-live:deferred:l0")
  })

  it("discovers and normalizes hydratable boundaries from SSR output", () => {
    const tree = Html.el(
      "main",
      Html.hydrate(Hydration.strategy.visible()),
      Html.children(
        Html.el("button", Html.on("click", effectLike), Html.children("save")),
        Html.el(
          "input",
          Html.on("input", ({ event, runtime, target }) => {
            expect(event.type).toBe("input")
            expect(runtime.root).toBeNull()
            expect(target).toBeInstanceOf(EventTarget)
            return effectLike
          }),
        ),
      ),
    )

    document.body.innerHTML = Html.renderToString(tree)
    const bootstrap = Hydration.bootstrap(document.body)

    expect(bootstrap.boundaries).toHaveLength(1)
    expect(bootstrap.boundaries[0]?.id).toBe("b0")
    expect(bootstrap.boundaries[0]?.strategy).toBe("visible")
    expect(bootstrap.boundaries[0]?.eventNames).toEqual(["click", "input"])
    expect(bootstrap.boundaries[0]?.element.tagName).toBe("MAIN")
    expect(bootstrap.boundaries[0]?.startMarker?.data).toBe("loom-hydrate-start:b0")
    expect(bootstrap.boundaries[0]?.endMarker?.data).toBe("loom-hydrate-end:b0")
    expect(bootstrap.mismatches).toEqual([])
  })

  it("reports hydration mismatches instead of silently accepting broken SSR markers", () => {
    document.body.innerHTML = '<main data-loom-hydrate="visible" data-loom-boundary="b0"><button>save</button></main>'

    const bootstrap = Hydration.bootstrap(document.body)

    expect(bootstrap.boundaries).toEqual([])
    expect(bootstrap.mismatches.map(({ id, reason }) => [id, reason])).toEqual([
      ["b0", "missing-start-marker"],
      ["b0", "missing-end-marker"],
    ])
  })

  it("supports partial hydration discovery from a subtree without pulling sibling boundaries", () => {
    const tree = Html.fragment(
      Html.el("section", Html.hydrate(Hydration.strategy.visible()), Html.children("outer")),
      Html.el("aside", Html.hydrate(Hydration.strategy.idle()), Html.children("inner")),
    )

    document.body.innerHTML = Html.renderToString(tree)

    const idleBoundary = document.body.querySelector('[data-loom-boundary="b1"]')

    expect(idleBoundary).not.toBeNull()

    if (!(idleBoundary instanceof Element)) {
      throw new Error("expected idle hydration boundary element")
    }

    const bootstrap = Hydration.bootstrap(idleBoundary)

    expect(bootstrap.boundaries.map(({ id, strategy }) => [id, strategy])).toEqual([["b1", "idle"]])
    expect(bootstrap.mismatches).toEqual([])
  })

  it("keeps nested component-use hydration metadata explicit in SSR planning", () => {
    const inner = Component.use(
      Component.make(Html.el("aside", Html.hydrate(Hydration.strategy.idle()), Html.children("inner"))),
      Component.effect(effectLike),
    )

    const outer = Component.make(
      Html.el(
        "main",
        Html.hydrate(Hydration.strategy.visible()),
        Html.children(Component.use(inner, Component.effect(effectLike))),
      ),
    )

    const result = Html.ssr(outer)

    expect(result.plan.boundaries.map((boundary) => [boundary.id, boundary.strategy])).toEqual([
      ["b0", "visible"],
      ["b1", "idle"],
    ])
    expect(result.html).toContain('data-loom-boundary="b0"')
    expect(result.html).toContain('data-loom-boundary="b1"')
  })
})
