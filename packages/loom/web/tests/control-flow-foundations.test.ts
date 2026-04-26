// @vitest-environment jsdom

import { Atom } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import { describe, expect, it } from "vitest"
import { Component, mount, View } from "../src/index.js"

describe("@effectify/loom control-flow foundations", () => {
  it("reacts to structural If branches without remounting the outer root", () => {
    const root = document.createElement("div")
    const widget = Component.make("widget").pipe(
      Component.model({ visible: Atom.make(true) }),
      Component.actions({
        toggle: ({ visible }) => visible.update((value) => !value),
      }),
      Component.view(({ state, actions }) =>
        View.stack(
          View.button("toggle", actions.toggle),
          View.when(() => state.visible(), View.text("Visible"), View.text("Hidden")),
        )
      ),
    )

    const handle = mount({ widget }, { root })
    const container = root.firstElementChild
    const button = container?.querySelector("button")

    expect(root.textContent).toBe("toggleVisible")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.toggle()

    expect(root.firstElementChild).toBe(container)
    expect(root.querySelector("button")).toBe(button)
    expect(root.textContent).toBe("toggleHidden")

    handle.dispose()
  })

  it("reacts to structural For lists and fallback content in mounted ranges", () => {
    const root = document.createElement("div")
    const inventory = Component.make("inventory").pipe(
      Component.model({ items: Atom.make(["alpha", "beta"]) }),
      Component.actions({
        clear: ({ items }) => items.set([]),
        seed: ({ items }) => items.set(["gamma", "delta"]),
      }),
      Component.view(({ state, actions }) =>
        View.stack(
          View.button("clear", actions.clear),
          View.button("seed", actions.seed),
          LoomCore.Ast.forEach(
            () => state.items(),
            (item, index) => View.text(`${index}:${item}`),
            View.text("empty"),
          ),
        )
      ),
    )

    const handle = mount({ inventory }, { root })
    const container = root.firstElementChild

    expect(root.textContent).toBe("clearseed0:alpha1:beta")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.clear()

    expect(root.firstElementChild).toBe(container)
    expect(root.textContent).toBe("clearseedempty")

    // @ts-expect-error mount action typing still widens in the current additive bridge.
    handle.actions.seed()

    expect(root.firstElementChild).toBe(container)
    expect(root.textContent).toBe("clearseed0:gamma1:delta")

    handle.dispose()
  })
})
