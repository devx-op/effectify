// @vitest-environment jsdom

import * as Effect from "effect/Effect"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { describe, expect, it } from "vitest"
import { DuplicateControlFlowKeyError } from "../src/internal/control-flow-error.js"
import { Component, Html, Hydration, mount, Slot, View, Web } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

describe("@effectify/loom vNext public surface", () => {
  it("re-exports the vNext namespaces and mount seam from the package root", () => {
    expect(typeof Component.make).toBe("function")
    expect(typeof Component.state).toBe("function")
    expect(typeof Component.stateFactory).toBe("function")
    expect(typeof Component.model).toBe("function")
    expect(typeof Component.actions).toBe("function")
    expect(typeof Component.actionEffect).toBe("function")
    expect(typeof Component.isActionEffect).toBe("function")
    expect(typeof Component.children).toBe("function")
    expect(typeof Component.view).toBe("function")
    expect(typeof Component.slots).toBe("function")
    expect(typeof Slot.required).toBe("function")
    expect(typeof View.vstack).toBe("function")
    expect(typeof View.hstack).toBe("function")
    expect(typeof View.input).toBe("function")
    expect(typeof View.stack).toBe("function")
    expect(typeof View.link).toBe("function")
    expect(typeof Web.as).toBe("function")
    expect(typeof Web.className).toBe("function")
    expect(typeof Web.value).toBe("function")
    expect(typeof Web.inputValue).toBe("function")
    expect(typeof mount).toBe("function")
  })

  it("supports pipeable component authoring with state, actions, view, and slots seams", () => {
    const registry = AtomRegistry.make()
    const count = Atom.make(2)
    const counter = Component.make("counter").pipe(
      Component.state({ count }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
        reset: ({ count }) => count.set(0),
      }),
      Component.slots({
        default: Slot.required(),
        sidebar: Slot.optional(),
      }),
      Component.view(({ state, actions, slots }) =>
        View.stack(
          View.text(() => `Count: ${state.count()}`),
          View.text(Object.keys(slots).join(",")),
          View.button("Increment", actions.increment),
        ).pipe(Web.className("counter"))
      ),
    )

    expect(counter.name).toBe("counter")
    expect(counter.state).toEqual({ count })
    expect(counter.slots).toEqual({
      default: { _tag: "Slot", required: true },
      sidebar: { _tag: "Slot", required: false },
    })
    expect(counter.node).toMatchObject({
      _tag: "Element",
      tagName: "div",
      attributes: {
        class: "counter",
      },
      children: [
        {
          _tag: "Element",
          tagName: "span",
          children: [{ _tag: "DynamicText" }],
        },
        {
          _tag: "Element",
          tagName: "span",
          children: [{ _tag: "Text", value: "default,sidebar" }],
        },
        {
          _tag: "Element",
          tagName: "button",
        },
      ],
    })

    const handle = mount({ counter }, { registry })

    expect(handle.state.count()).toBe(2)

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.increment()

    expect(handle.state.count()).toBe(3)
    expect(handle.html).toContain("Count: 3")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.reset()

    expect(handle.state.count()).toBe(0)
    expect(handle.html).toContain("Count: 0")

    handle.dispose()
    registry.dispose()
  })

  it("materializes Atom factories per mount and keeps read-friendly state isolated per instance", () => {
    const counter = Component.make("counter").pipe(
      Component.model({
        count: () => Atom.make(1),
        label: "ready",
      }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        View.stack(
          View.text(() => `Count: ${state.count()}`),
          View.text(() => `Label: ${state.label()}`),
        )
      ),
    )

    const first = mount({ counter })
    const second = mount({ counter })

    expect(first.state.count()).toBe(1)
    expect(second.state.count()).toBe(1)
    expect(first.state.label()).toBe("ready")
    expect(second.state.label()).toBe("ready")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    first.actions.increment()

    expect(first.state.count()).toBe(2)
    expect(second.state.count()).toBe(1)
    expect(first.html).toContain("Count: 2")
    expect(second.html).toContain("Count: 1")

    first.dispose()
    second.dispose()
  })

  it("supports explicit shared state and per-instance state factories in the public surface", () => {
    const registry = AtomRegistry.make()
    const count = Atom.make(2)
    const counter = Component.make("state-counter").pipe(
      Component.state({
        count,
        label: "ready",
      }),
      Component.stateFactory(() => ({
        local: Atom.make(1),
      })),
      Component.actions({
        incrementShared: ({ count }) => count.update((value) => value + 1),
        incrementLocal: ({ local }) => local.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        View.stack(
          View.text(() => `Shared: ${state.count()}`),
          View.text(() => `Local: ${state.local()}`),
          View.text(() => `Label: ${state.label()}`),
        )
      ),
    )

    expect(counter.state).toEqual({
      count,
      label: "ready",
    })
    expect(typeof Component.stateFactory).toBe("function")
    expect(typeof counter.stateFactory).toBe("function")

    const first = mount({ counter }, { registry })
    const second = mount({ counter }, { registry })

    expect(first.state.count()).toBe(2)
    expect(second.state.count()).toBe(2)
    expect(first.state.local()).toBe(1)
    expect(second.state.local()).toBe(1)
    expect(first.observability.mount.modelKeys).toEqual(["count", "label", "local"])

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    first.actions.incrementShared()
    // @ts-expect-error mount action typing still widens in the current additive bridge.
    first.actions.incrementLocal()

    expect(first.state.count()).toBe(3)
    expect(second.state.count()).toBe(3)
    expect(first.state.local()).toBe(2)
    expect(second.state.local()).toBe(1)
    second.sync()
    expect(first.html).toContain("Shared: 3")
    expect(first.html).toContain("Local: 2")
    expect(second.html).toContain("Shared: 3")
    expect(second.html).toContain("Local: 1")

    first.dispose()
    second.dispose()
    registry.dispose()
  })

  it("rejects factory-like entries passed through Component.state at runtime", () => {
    const invalidState: Record<string, unknown> = {
      count: () => Atom.make(0),
    }

    expect(() => Component.make("bad-state").pipe(Component.state(invalidState))).toThrowError(
      /Component\.state\(\.\.\.\) does not accept factory entry 'count'\. Use Component\.stateFactory\(\.\.\.\) instead\./,
    )
  })

  it("backs View.text with span roots and lets Web.as override the root tag", () => {
    const inline = View.text("hello").pipe(Web.className("copy"))
    const paragraph = View.text(() => "reactive").pipe(Web.as("p"), Web.className("body"))
    const section = View.vstack(View.text("nested")).pipe(Web.as("section"))

    expect(inline).toMatchObject({
      _tag: "Element",
      tagName: "span",
      attributes: {
        class: "copy",
      },
      children: [{ _tag: "Text", value: "hello" }],
    })
    expect(paragraph).toMatchObject({
      _tag: "Element",
      tagName: "p",
      attributes: {
        class: "body",
      },
      children: [{ _tag: "DynamicText" }],
    })
    expect(section).toMatchObject({
      _tag: "Element",
      tagName: "section",
    })
  })

  it("keeps Component.model as a compatibility bridge over shared and local state semantics", () => {
    const sharedCount = Atom.make(1)
    const counter = Component.make("legacy-counter").pipe(
      Component.model({
        count: sharedCount,
        label: "ready",
        local: () => Atom.make(0),
      }),
      Component.actions({
        incrementShared: ({ count }) => count.update((value) => value + 1),
        incrementLocal: ({ local }) => local.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        View.stack(
          View.text(() => `Shared: ${state.count()}`),
          View.text(() => `Local: ${state.local()}`),
          View.text(() => `Label: ${state.label()}`),
        )
      ),
    )

    expect(counter.model).toMatchObject({
      count: sharedCount,
      label: "ready",
    })
    expect(counter.state).toEqual({
      count: sharedCount,
      label: "ready",
    })
    expect(typeof counter.stateFactory).toBe("function")

    const first = mount({ counter })
    const second = mount({ counter })

    expect(first.state.count()).toBe(1)
    expect(second.state.count()).toBe(1)
    expect(first.state.local()).toBe(0)
    expect(second.state.local()).toBe(0)
    expect(first.observability.mount.modelKeys).toEqual(["count", "label", "local"])

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    first.actions.incrementShared()
    // @ts-expect-error mount action typing still widens in the current additive bridge.
    first.actions.incrementLocal()

    expect(first.state.count()).toBe(2)
    expect(second.state.count()).toBe(2)
    expect(first.state.local()).toBe(1)
    expect(second.state.local()).toBe(0)

    first.dispose()
    second.dispose()
  })

  it("lets actions represent Effect work explicitly and exposes mount observability metadata", () => {
    const registry = AtomRegistry.make()
    const counter = Component.make("effect-counter").pipe(
      Component.model({
        count: Atom.make(1),
      }),
      Component.actions({
        save: ({ count, component, state }) => {
          count.update((value) => value + 1)

          return Component.actionEffect(
            Effect.succeed(`saved:${state.count()}`),
            {
              label: "persist-count",
              details: {
                action: "save",
                component: component.name ?? "anonymous",
                count: state.count(),
              },
            },
          )
        },
      }),
      Component.view(({ state, actions }) =>
        View.stack(
          View.text(() => `Count: ${state.count()}`),
          View.button("Save", actions.save),
        )
      ),
    )

    const handle = mount({ counter }, { registry })
    // @ts-expect-error mount action typing still widens in the current additive bridge.
    const saveResult = handle.actions.save()

    expect(Component.isActionEffect(saveResult)).toBe(true)
    expect(saveResult).toMatchObject({
      _tag: "LoomActionEffect",
      annotations: {
        label: "persist-count",
        details: {
          action: "save",
          component: "effect-counter",
          count: 2,
        },
      },
    })
    expect(handle.state.count()).toBe(2)
    expect(handle.html).toContain("Count: 2")
    expect(handle.observability.mount).toEqual({
      entry: "counter",
      componentName: "effect-counter",
      modelKeys: ["count"],
      actionNames: ["save"],
      slotNames: [],
    })
    expect(handle.observability.actions.save).toEqual({
      name: "save",
      componentName: "effect-counter",
      invocations: 1,
      lastResult: "effect",
      lastAnnotations: {
        label: "persist-count",
        details: {
          action: "save",
          component: "effect-counter",
          count: 2,
        },
      },
    })

    handle.dispose()
    registry.dispose()
  })

  it("supports slot-based layout composition through Component.use(..., props?, slots?)", () => {
    const layout = Component.make("app-layout").pipe(
      Component.slots({
        default: Slot.required(),
        header: Slot.optional(),
        sidebar: Slot.optional(),
      }),
      Component.view(({ slots }) =>
        View.stack(
          View.when(slots.header, View.header(slots.header)),
          View.row(
            View.when(slots.sidebar, View.aside(slots.sidebar)),
            View.main(slots.default),
          ),
        ).pipe(Web.className("layout"))
      ),
    )

    const page = Component.make("page").pipe(
      Component.view(() =>
        Component.use(layout, undefined, {
          header: View.text("Header"),
          sidebar: View.text("Sidebar"),
          default: View.stack(View.text("Content")),
        })
      ),
    )

    const withoutSidebar = Component.make("page-no-sidebar").pipe(
      Component.view(() =>
        Component.use(layout, undefined, {
          header: View.text("Header"),
          default: View.text("Content"),
        })
      ),
    )

    const full = mount({ page })
    const optional = mount({ withoutSidebar })

    expect(full.html).toContain("<header><span>Header</span></header>")
    expect(full.html).toContain("<aside><span>Sidebar</span></aside>")
    expect(full.html).toContain("<main><div><span>Content</span></div></main>")
    expect(optional.html).toContain("<header><span>Header</span></header>")
    expect(optional.html).not.toContain("<aside>Sidebar</aside>")
    expect(optional.html).toContain("<main><span>Content</span></main>")

    full.dispose()
    optional.dispose()
  })

  it("treats direct View.if conditions as snapshots, tracks thunk conditions, and keeps View.when compatible", () => {
    const root = document.createElement("div")
    const widget = Component.make("control-flow-widget").pipe(
      Component.model({ visible: Atom.make(true) }),
      Component.view(({ state }) =>
        View.stack(
          View.if(state.visible(), View.text("snapshot-on"), View.text("snapshot-off")),
          View.if(() => state.visible(), View.text("tracked-on"), View.text("tracked-off")),
          View.when(() => state.visible(), View.text("when-on"), View.text("when-off")),
        )
      ),
    )

    const handle = mount({ widget }, { root })

    expect(root.textContent).toBe("snapshot-ontracked-onwhen-on")

    handle.model.visible.set(false)

    expect(root.textContent).toBe("snapshot-ontracked-offwhen-off")

    handle.sync()

    expect(root.textContent).toBe("snapshot-offtracked-offwhen-off")

    handle.dispose()
  })

  it("reorders keyed View.for items without remounting retained nodes and renders empty fallback", () => {
    const root = document.createElement("div")
    const alpha = { id: "alpha", label: "Alpha" }
    const beta = { id: "beta", label: "Beta" }
    const inventory = Component.make("inventory").pipe(
      Component.model({
        items: Atom.make([alpha, beta]),
      }),
      Component.view(({ state }) =>
        View.for(() => state.items(), {
          key: (item) => item.id,
          render: (item) => View.text(item.label).pipe(Web.as("p")),
          empty: View.text("empty").pipe(Web.as("p")),
        })
      ),
    )

    const handle = mount({ inventory }, { root })
    const before = Array.from(root.querySelectorAll("p"))

    expect(before.map((node) => node.textContent)).toEqual(["Alpha", "Beta"])

    handle.model.items.set([beta, alpha])

    const reordered = Array.from(root.querySelectorAll("p"))

    expect(reordered.map((node) => node.textContent)).toEqual(["Beta", "Alpha"])
    expect(reordered[0]).toBe(before[1])
    expect(reordered[1]).toBe(before[0])

    handle.model.items.set([])

    expect(Array.from(root.querySelectorAll("p")).map((node) => node.textContent)).toEqual(["empty"])

    handle.model.items.set([{ id: "gamma", label: "Gamma" }])

    expect(Array.from(root.querySelectorAll("p")).map((node) => node.textContent)).toEqual(["Gamma"])

    handle.dispose()
  })

  it("throws duplicate-key failures for View.for without corrupting the previous DOM", () => {
    const root = document.createElement("div")
    const inventory = Component.make("duplicate-inventory").pipe(
      Component.model({
        items: Atom.make([
          { id: "alpha", label: "Alpha" },
          { id: "beta", label: "Beta" },
        ]),
      }),
      Component.view(({ state }) =>
        View.for(() => state.items(), {
          key: (item) => item.id,
          render: (item) => View.text(item.label).pipe(Web.as("p")),
        })
      ),
    )

    const handle = mount({ inventory }, { root })
    const before = Array.from(root.querySelectorAll("p"))

    expect(() =>
      handle.model.items.set([
        { id: "alpha", label: "Alpha" },
        { id: "alpha", label: "Again" },
      ])
    ).toThrowError(DuplicateControlFlowKeyError)

    const after = Array.from(root.querySelectorAll("p"))

    expect(after).toHaveLength(2)
    expect(after[0]).toBe(before[0])
    expect(after[1]).toBe(before[1])
    expect(after.map((node) => node.textContent)).toEqual(["Alpha", "Beta"])

    handle.dispose()
  })

  it("supports children-based composition through metadata-driven Component.use dispatch", () => {
    const card = Component.make("card").pipe(
      Component.children(),
      Component.view(({ children }) =>
        View.vstack(
          View.text("Card"),
          View.main(children),
        ).pipe(Web.className("card"))
      ),
    )

    const page = Component.make("page").pipe(
      Component.view(() =>
        View.fragment(
          Component.use(card, View.text("Simple body")),
          Component.use(card, undefined, ["Nested ", 2, false, View.text("items")]),
        )
      ),
    )

    const handle = mount({ page })

    expect(handle.html).toContain('<div class="card"><span>Card</span><main><span>Simple body</span></main></div>')
    expect(handle.html).toContain(
      '<div class="card"><span>Card</span><main>Nested 2<span>items</span></main></div>',
    )

    handle.dispose()
  })

  it("normalizes broad ViewChild content for fragments, buttons, links, and layout aliases", () => {
    const badge = Component.make("badge").pipe(
      Component.view(() => View.text("Docs")),
    )
    const icon = View.text("+")
    const vertical = View.vstack("one", [2, null, false, View.text("three")])
    const horizontal = View.hstack(icon, "Save")
    const button = View.button([horizontal, " now"], effectLike)
    const link = View.link([badge, " guide"], {
      href: "/docs",
      target: "_blank",
      rel: "noreferrer",
      download: true,
    })

    expect(View.stack("one", [2, null, false, View.text("three")])).toEqual(vertical)
    expect(View.row(icon, "Save")).toEqual(horizontal)
    expect(vertical).toMatchObject({
      _tag: "Element",
      tagName: "div",
      children: [
        { _tag: "Text", value: "one" },
        { _tag: "Text", value: "2" },
        {
          _tag: "Element",
          tagName: "span",
          children: [{ _tag: "Text", value: "three" }],
        },
      ],
    })
    expect(button).toMatchObject({
      _tag: "Element",
      tagName: "button",
      children: [
        {
          _tag: "Element",
          tagName: "div",
          children: [
            {
              _tag: "Element",
              tagName: "span",
              children: [{ _tag: "Text", value: "+" }],
            },
            { _tag: "Text", value: "Save" },
          ],
        },
        { _tag: "Text", value: " now" },
      ],
    })
    expect(link).toMatchObject({
      _tag: "Element",
      tagName: "a",
      attributes: {
        href: "/docs",
        target: "_blank",
        rel: "noreferrer",
        download: "",
      },
      children: [
        {
          _tag: "ComponentUse",
          component: badge,
        },
        { _tag: "Text", value: " guide" },
      ],
    })
  })

  it("renders primitive child content with text, nested views, and component children", () => {
    const badge = Component.make("badge").pipe(
      Component.view(() => View.text("Guide")),
    )

    const page = Component.make("primitive-content-page").pipe(
      Component.view(() =>
        View.fragment(
          View.button(View.fragment("Save", " now"), effectLike),
          View.button(View.hstack(View.text("+"), "1"), effectLike),
          View.link("Open settings", "/settings"),
          View.link(View.fragment(badge, " docs"), { href: "/docs" }),
        )
      ),
    )

    const handle = mount({ page })

    expect(handle.html).toContain("<button>Save now</button>")
    expect(handle.html).toContain("<button><div><span>+</span>1</div></button>")
    expect(handle.html).toContain('<a href="/settings">Open settings</a>')
    expect(handle.html).toContain('<a href="/docs"><span>Guide</span> docs</a>')

    handle.dispose()
  })

  it("keeps View nodes pipeable and lets Web modifiers update element attributes", () => {
    const view = View.row(
      View.text("hello"),
      View.button("Save", effectLike),
    ).pipe(
      Web.className("row"),
      Web.attr("data-testid", "greeting"),
    )

    expect(view).toMatchObject({
      _tag: "Element",
      tagName: "div",
      attributes: {
        class: "row",
        "data-testid": "greeting",
      },
    })
  })

  it("keeps View neutral while Web adds ergonomic attrs, data, aria, and style modifiers", () => {
    const view = View.main(
      View.button("Save", effectLike),
    ).pipe(
      Web.className("shell"),
      Web.attrs({
        id: "main-shell",
        title: "Main shell",
      }),
      Web.data("panel", "main"),
      Web.aria("label", "Primary content"),
      Web.style({
        display: "flex",
        gap: "1rem",
      }),
    )

    expect(view).toMatchObject({
      _tag: "Element",
      tagName: "main",
      attributes: {
        class: "shell",
        id: "main-shell",
        title: "Main shell",
        "data-panel": "main",
        "aria-label": "Primary content",
        style: "display:flex;gap:1rem",
      },
    })
  })

  it("widens Web modifiers to retain snapshot attrs and record reactive element bindings", () => {
    const view = View.main(
      View.text("Ready"),
    ).pipe(
      Web.className("shell"),
      Web.attr("title", () => "Dynamic title"),
      Web.data("panel", () => "main"),
      Web.aria("label", () => "Primary content"),
      Web.className(() => "interactive"),
      Web.style(() => ({ display: "flex", gap: "1rem" })),
    )

    expect(view).toMatchObject({
      _tag: "Element",
      tagName: "main",
      attributes: {
        class: "shell",
      },
      bindings: [
        { _tag: "AttrBinding", name: "title" },
        { _tag: "AttrBinding", name: "data-panel" },
        { _tag: "AttrBinding", name: "aria-label" },
        { _tag: "ClassBinding" },
        { _tag: "StyleBinding" },
      ],
    })
  })

  it("introduces a text input primitive with dedicated value-property bindings", () => {
    const input = View.input().pipe(
      Web.value("seed"),
      Web.inputValue(() => "reactive"),
    )

    expect(input).toMatchObject({
      _tag: "Element",
      tagName: "input",
      attributes: {
        type: "text",
        value: "seed",
      },
      bindings: [{ _tag: "ValueBinding" }],
    })
  })

  it("serializes the current reactive input value into SSR html", () => {
    const html = Html.renderToString(View.input().pipe(Web.value(() => "seed")))

    expect(html).toBe('<input type="text" value="seed"></input>')
  })

  it("mounts a named component record through the additive mount seam", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.view(() => View.stack(View.text("Mounted")).pipe(Web.className("mounted"))),
    )

    const handle = mount({ counter }, { root })

    expect(handle.entry).toBe("counter")
    expect(handle.component).toBe(counter)
    expect(handle.html).toBe('<div class="mounted"><span>Mounted</span></div>')
    expect(root.innerHTML).toBe(handle.html)

    handle.dispose()
  })

  it("updates dynamic text nodes in place without replacing static siblings", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state, actions }) =>
        View.stack(
          View.button("Increment", actions.increment),
          View.text(() => `Count: ${state.count()}`),
          View.text("Stable footer"),
        )
      ),
    )

    const handle = mount({ counter }, { root })
    const container = root.firstElementChild
    const button = container?.querySelector("button")
    const countNode = container?.childNodes[1]
    const footerNode = container?.childNodes[2]
    const dynamicTextNode = countNode?.firstChild
    const stableFooterTextNode = footerNode?.firstChild

    expect(countNode?.nodeName).toBe("SPAN")
    expect(footerNode?.nodeName).toBe("SPAN")
    expect(dynamicTextNode?.textContent).toBe("Count: 1")
    expect(footerNode?.textContent).toBe("Stable footer")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.increment()

    expect(container?.querySelector("button")).toBe(button)
    expect(container?.childNodes[1]).toBe(countNode)
    expect(container?.childNodes[2]).toBe(footerNode)
    expect(countNode?.firstChild).toBe(dynamicTextNode)
    expect(footerNode?.firstChild).toBe(stableFooterTextNode)
    expect(dynamicTextNode?.textContent).toBe("Count: 2")
    expect(footerNode?.textContent).toBe("Stable footer")
    expect(root.innerHTML).toContain("Count: 2")

    handle.dispose()
  })

  it("updates mounted reactive attrs, data, aria, class, and style bindings in place", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        View.stack(
          View.text("Stable label"),
        ).pipe(
          Web.attr("title", () => `Count ${state.count()}`),
          Web.data("count", () => state.count()),
          Web.aria("label", () => `Counter ${state.count()}`),
          Web.className(() => `count-${state.count()}`),
          Web.style(() => ({ order: state.count(), gap: `${state.count()}rem` })),
        )
      ),
    )

    const handle = mount({ counter }, { root })
    const container = root.firstElementChild
    const stableNode = container?.firstChild

    expect(container?.getAttribute("title")).toBe("Count 1")
    expect(container?.getAttribute("data-count")).toBe("1")
    expect(container?.getAttribute("aria-label")).toBe("Counter 1")
    expect(container?.className).toBe("count-1")
    expect(container?.getAttribute("style")).toBe("order:1;gap:1rem")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.increment()

    expect(root.firstElementChild).toBe(container)
    expect(container?.firstChild).toBe(stableNode)
    expect(container?.getAttribute("title")).toBe("Count 2")
    expect(container?.getAttribute("data-count")).toBe("2")
    expect(container?.getAttribute("aria-label")).toBe("Counter 2")
    expect(container?.className).toBe("count-2")
    expect(container?.getAttribute("style")).toBe("order:2;gap:2rem")

    handle.dispose()
  })

  it("updates mounted input values through DOM property semantics", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.model({ value: Atom.make("seed") }),
      Component.actions({
        advance: ({ value }) => value.set("next"),
      }),
      Component.view(({ state }) => View.input().pipe(Web.inputValue(() => state.value()))),
    )

    const handle = mount({ counter }, { root })
    const input = root.querySelector("input")

    expect(input?.getAttribute("type")).toBe("text")
    expect(input?.value).toBe("seed")

    if (input !== null) {
      input.value = "typed-locally"
    }

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.advance()

    expect(root.querySelector("input")).toBe(input)
    expect(input?.value).toBe("next")
    expect(input?.getAttribute("value")).toBe("next")

    handle.dispose()
  })

  it("preserves focused dirty input edits until the model catches up", () => {
    const root = document.createElement("div")
    document.body.append(root)
    const counter = Component.make("counter").pipe(
      Component.model({ value: Atom.make("seed") }),
      Component.actions(({ model }) => ({
        sync: (nextValue: string) => model.value.set(nextValue),
      })),
      Component.view(({ state }) => View.input().pipe(Web.inputValue(() => state.value()))),
    )

    const handle = mount({ counter }, { root })
    const input = root.querySelector("input")

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("expected mounted input")
    }

    input.focus()
    input.value = "typed-locally"

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.sync("server-update")

    expect(root.querySelector("input")).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe("typed-locally")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.sync("typed-locally")

    expect(input.value).toBe("typed-locally")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.sync("model-after-catchup")

    expect(input.value).toBe("model-after-catchup")
    expect(input.getAttribute("value")).toBe("model-after-catchup")

    handle.dispose()
    root.remove()
  })

  it("preserves caret selection for focused controlled input updates when safe", () => {
    const root = document.createElement("div")
    document.body.append(root)
    const counter = Component.make("counter").pipe(
      Component.model({ value: Atom.make("seed") }),
      Component.actions(({ model }) => ({
        sync: (nextValue: string) => model.value.set(nextValue),
      })),
      Component.view(({ state }) => View.input().pipe(Web.inputValue(() => state.value()))),
    )

    const handle = mount({ counter }, { root })
    const input = root.querySelector("input")

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("expected mounted input")
    }

    input.focus()
    input.setSelectionRange(2, 2, "forward")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.sync("seeding")

    expect(document.activeElement).toBe(input)
    expect(input.value).toBe("seeding")
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(2)
    expect(input.selectionDirection).toBe("forward")

    input.setSelectionRange(3, 6, "backward")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.sync("go")

    expect(input.value).toBe("go")
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(2)
    expect(input.selectionDirection).toBe("backward")

    handle.dispose()
    root.remove()
  })

  it("wires mounted button clicks to actions in the fine-grained mount path", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
        decrement: ({ count }) => count.update((value) => value - 1),
        reset: ({ count }) => count.set(1),
      }),
      Component.view(({ state, actions }) =>
        View.stack(
          View.button("Increase", actions.increment),
          View.button("Decrease", actions.decrement),
          View.button("Reset", actions.reset),
          View.text(() => `Count: ${state.count()}`),
        )
      ),
    )

    const handle = mount({ counter }, { root })
    const buttons = root.querySelectorAll("button")
    const countNode = root.firstElementChild?.childNodes[3]

    expect(countNode?.textContent).toBe("Count: 1")

    buttons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(countNode?.textContent).toBe("Count: 2")

    buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(countNode?.textContent).toBe("Count: 1")

    buttons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(countNode?.textContent).toBe("Count: 1")

    handle.dispose()
  })

  it("keeps mounted regions isolated and stops updating disposed dynamic text bindings", () => {
    const parent = document.createElement("div")
    const firstRoot = document.createElement("div")
    const secondRoot = document.createElement("div")
    const registry = AtomRegistry.make()
    parent.append(firstRoot, secondRoot)

    const first = Component.make("first").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) => View.text(() => `First: ${state.count()}`)),
    )

    const second = Component.make("second").pipe(
      Component.model({ label: Atom.make("ready") }),
      Component.actions({
        rename: ({ label }) => label.set("done"),
      }),
      Component.view(({ state }) => View.text(() => `Second: ${state.label()}`)),
    )

    const firstHandle = mount({ first }, { root: firstRoot, registry })
    const secondHandle = mount({ second }, { root: secondRoot, registry })
    const secondNode = secondRoot.firstChild

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    firstHandle.actions.increment()

    expect(firstRoot.textContent).toBe("First: 2")
    expect(secondRoot.firstChild).toBe(secondNode)
    expect(secondRoot.textContent).toBe("Second: ready")

    firstHandle.dispose()

    expect(() => firstHandle.model.count.set(3)).not.toThrow()
    expect(firstRoot.textContent).toBe("First: 2")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    secondHandle.actions.rename()

    expect(secondRoot.firstChild).toBe(secondNode)
    expect(secondRoot.textContent).toBe("Second: done")

    secondHandle.dispose()
    registry.dispose()
  })

  it("keeps mounted reactive element bindings isolated and stops updating disposed roots", () => {
    const parent = document.createElement("div")
    const firstRoot = document.createElement("div")
    const secondRoot = document.createElement("div")
    const registry = AtomRegistry.make()
    parent.append(firstRoot, secondRoot)

    const first = Component.make("first").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        View.stack(View.text("First")).pipe(
          Web.attr("data-count", () => state.count()),
          Web.className(() => `first-${state.count()}`),
        )
      ),
    )

    const second = Component.make("second").pipe(
      Component.model({ label: Atom.make("ready") }),
      Component.actions({
        rename: ({ label }) => label.set("done"),
      }),
      Component.view(({ state }) =>
        View.stack(View.text("Second")).pipe(
          Web.attr("data-label", () => state.label()),
          Web.className(() => `second-${state.label()}`),
        )
      ),
    )

    const firstHandle = mount({ first }, { root: firstRoot, registry })
    const secondHandle = mount({ second }, { root: secondRoot, registry })
    const secondNode = secondRoot.firstElementChild

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    firstHandle.actions.increment()

    expect(firstRoot.firstElementChild?.getAttribute("data-count")).toBe("2")
    expect(firstRoot.firstElementChild?.className).toBe("first-2")
    expect(secondRoot.firstElementChild).toBe(secondNode)
    expect(secondRoot.firstElementChild?.getAttribute("data-label")).toBe("ready")

    firstHandle.dispose()

    expect(() => firstHandle.model.count.set(3)).not.toThrow()
    expect(firstRoot.firstElementChild?.getAttribute("data-count")).toBe("2")
    expect(firstRoot.firstElementChild?.className).toBe("first-2")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    secondHandle.actions.rename()

    expect(secondRoot.firstElementChild).toBe(secondNode)
    expect(secondRoot.firstElementChild?.getAttribute("data-label")).toBe("done")
    expect(secondRoot.firstElementChild?.className).toBe("second-done")

    secondHandle.dispose()
    registry.dispose()
  })

  it("keeps non-reactive state reads inert outside tracked dynamic text render contexts", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) => {
        const snapshot = state.count()

        return View.stack(
          View.text(() => `Live: ${state.count()}`),
          View.text(`Snapshot: ${snapshot}`),
        ).pipe(Web.attr("data-count", String(snapshot)))
      }),
    )

    const handle = mount({ counter }, { root })
    const container = root.firstElementChild
    const liveNode = container?.childNodes[0]
    const snapshotNode = container?.childNodes[1]

    expect(container?.getAttribute("data-count")).toBe("1")
    expect(liveNode?.textContent).toBe("Live: 1")
    expect(snapshotNode?.textContent).toBe("Snapshot: 1")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.increment()

    expect(handle.state.count()).toBe(2)
    expect(container?.childNodes[0]).toBe(liveNode)
    expect(container?.childNodes[1]).toBe(snapshotNode)
    expect(liveNode?.textContent).toBe("Live: 2")
    expect(snapshotNode?.textContent).toBe("Snapshot: 1")
    expect(container?.getAttribute("data-count")).toBe("1")

    handle.dispose()
  })

  it("keeps attrs, styles, lists, and hydration metadata snapshot-only in this slice", () => {
    const root = document.createElement("div")
    const inventory = Component.make("inventory").pipe(
      Component.model({
        count: Atom.make(1),
        items: Atom.make(["alpha"]),
      }),
      Component.actions({
        advance: ({ count, items }) => {
          count.update((value) => value + 1)
          items.update((value) => [...value, `item-${value.length + 1}`])
        },
      }),
      Component.view(({ state, actions }) => {
        const countSnapshot = state.count()
        const itemsSnapshot = state.items()
        const strategy = countSnapshot > 1 ? Hydration.idle() : Hydration.manual()

        return View.stack(
          View.button("Advance", actions.advance),
          View.text(() => `Live count: ${state.count()}`),
          View.fragment(...itemsSnapshot.map((item) => View.text(item))),
        ).pipe(
          Web.className(`count-${countSnapshot}`),
          Web.attr("data-count", String(countSnapshot)),
          Web.style({ order: countSnapshot, gap: `${itemsSnapshot.length}rem` }),
          Web.hydrate(strategy),
        )
      }),
    )

    const handle = mount({ inventory }, { root })
    const container = root.firstElementChild

    expect(container?.className).toBe("count-1")
    expect(container?.getAttribute("data-count")).toBe("1")
    expect(container?.getAttribute("style")).toBe("order:1;gap:1rem")
    expect(container?.getAttribute(Hydration.attributeName)).toBe("manual")
    expect(root.textContent).toBe("AdvanceLive count: 1alpha")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.advance()

    expect(handle.state.count()).toBe(2)
    expect(handle.state.items()).toEqual(["alpha", "item-2"])
    expect(container?.className).toBe("count-1")
    expect(container?.getAttribute("data-count")).toBe("1")
    expect(container?.getAttribute("style")).toBe("order:1;gap:1rem")
    expect(container?.getAttribute(Hydration.attributeName)).toBe("manual")
    expect(root.textContent).toBe("AdvanceLive count: 2alpha")
    expect(root.textContent).not.toContain("item-2")

    handle.dispose()
  })
})
