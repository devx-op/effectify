// @vitest-environment jsdom

import * as Effect from "effect/Effect"
import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import { describe, expect, it } from "vitest"
import { Component, mount, Slot, View, Web } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

describe("@effectify/loom vNext public surface", () => {
  it("re-exports the vNext namespaces and mount seam from the package root", () => {
    expect(typeof Component.make).toBe("function")
    expect(typeof Component.model).toBe("function")
    expect(typeof Component.actions).toBe("function")
    expect(typeof Component.actionEffect).toBe("function")
    expect(typeof Component.isActionEffect).toBe("function")
    expect(typeof Component.view).toBe("function")
    expect(typeof Component.slots).toBe("function")
    expect(typeof Slot.required).toBe("function")
    expect(typeof View.stack).toBe("function")
    expect(typeof Web.className).toBe("function")
    expect(typeof mount).toBe("function")
  })

  it("supports pipeable component authoring with model, actions, view, and slots seams", () => {
    const registry = AtomRegistry.make()
    const count = Atom.make(2)
    const counter = Component.make("counter").pipe(
      Component.model({ count }),
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
          View.text(`Count: ${state.count}`),
          View.text(Object.keys(slots).join(",")),
          View.button("Increment", actions.increment),
        ).pipe(Web.className("counter"))
      ),
    )

    expect(counter.name).toBe("counter")
    expect(counter.model).toEqual({ count })
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
        { _tag: "Text", value: "Count: 2" },
        { _tag: "Text", value: "default,sidebar" },
        {
          _tag: "Element",
          tagName: "button",
        },
      ],
    })

    const handle = mount({ counter }, { registry })

    expect(handle.state.count).toBe(2)

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.increment()

    expect(handle.state.count).toBe(3)
    expect(handle.html).toContain("Count: 3")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.reset()

    expect(handle.state.count).toBe(0)
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
          View.text(`Count: ${state.count}`),
          View.text(`Label: ${state.label}`),
        )
      ),
    )

    const first = mount({ counter })
    const second = mount({ counter })

    expect(first.state.count).toBe(1)
    expect(second.state.count).toBe(1)
    expect(first.state.label).toBe("ready")
    expect(second.state.label).toBe("ready")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    first.actions.increment()

    expect(first.state.count).toBe(2)
    expect(second.state.count).toBe(1)
    expect(first.html).toContain("Count: 2")
    expect(second.html).toContain("Count: 1")

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
            Effect.succeed(`saved:${state.count}`),
            {
              label: "persist-count",
              details: {
                action: "save",
                component: component.name ?? "anonymous",
                count: state.count,
              },
            },
          )
        },
      }),
      Component.view(({ state, actions }) =>
        View.stack(
          View.text(`Count: ${state.count}`),
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
    expect(handle.state.count).toBe(2)
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

    expect(full.html).toContain("<header>Header</header>")
    expect(full.html).toContain("<aside>Sidebar</aside>")
    expect(full.html).toContain("<main><div>Content</div></main>")
    expect(optional.html).toContain("<header>Header</header>")
    expect(optional.html).not.toContain("<aside>Sidebar</aside>")
    expect(optional.html).toContain("<main>Content</main>")

    full.dispose()
    optional.dispose()
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

  it("mounts a named component record through the additive mount seam", () => {
    const root = document.createElement("div")
    const counter = Component.make("counter").pipe(
      Component.view(() => View.stack(View.text("Mounted")).pipe(Web.className("mounted"))),
    )

    const handle = mount({ counter }, { root })

    expect(handle.entry).toBe("counter")
    expect(handle.component).toBe(counter)
    expect(handle.html).toBe('<div class="mounted">Mounted</div>')
    expect(root.innerHTML).toBe(handle.html)

    handle.dispose()
  })
})
