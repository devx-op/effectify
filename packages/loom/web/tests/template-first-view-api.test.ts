// @vitest-environment jsdom

import * as Result from "effect/Result"
import { Atom } from "effect/unstable/reactivity"
import { describe, expect, it } from "vitest"
import { Component, html, Hydration, mount, Slot, View } from "../src/index.js"

describe("@effectify/loom template-first view API", () => {
  it("authors views through imported html with lambda reactivity, falsy normalization, View.for, and phase-1 web directives", () => {
    const root = document.createElement("div")
    const inventory = Component.make("template-inventory").pipe(
      Component.model({
        count: Atom.make(1),
        items: Atom.make([
          { id: "alpha", label: "Alpha" },
          { id: "beta", label: "Beta" },
        ]),
      }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
        clear: ({ items }) => items.set([]),
        seed: ({ items }) => items.set([{ id: "gamma", label: "Gamma" }]),
      }),
      Component.view((context) => {
        const { state, actions } = context as any

        return html`
        <section class="inventory" web:hydrate=${Hydration.strategy.visible()}>
          <button type="button" web:click=${actions.increment}>increment</button>
          <button type="button" web:click=${actions.clear}>clear</button>
          <button type="button" web:click=${actions.seed}>seed</button>
          <input type="text" web:value=${() => `count:${state.count()}`} />
          <p>${() => state.count()}</p>
          <div>${null}${undefined}${false}${0}${""}</div>
          ${
          View.for(() => state.items(), {
            key: (item: any) => item.id,
            render: (item: any) => html`<p>${item.label}</p>`,
            empty: html`<p>empty</p>`,
          })
        }
        </section>
      `
      }),
    )

    const handle = mount({ inventory }, { root })
    const input = root.querySelector("input")

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("expected html template input")
    }

    expect(root.textContent).toBe("incrementclearseed10AlphaBeta")
    expect(input.value).toBe("count:1")
    expect(handle.html).toContain('data-loom-hydrate="visible"')
    ;(handle.actions as any).increment()

    expect(root.textContent).toBe("incrementclearseed20AlphaBeta")
    expect(input.value).toBe("count:2")
    ;(handle.actions as any).clear()

    expect(Array.from(root.querySelectorAll("p")).map((node) => node.textContent)).toEqual(["2", "empty"])
    ;(handle.actions as any).seed()

    expect(Array.from(root.querySelectorAll("p")).map((node) => node.textContent)).toEqual(["2", "Gamma"])

    handle.dispose()
  })

  it("composes subtrees through View.use, local boundaries, and both View.match families", () => {
    interface SaveGateway {
      readonly save: (value: string) => string
    }

    const child = Component.make("template-child").pipe(
      Component.view(() => html`<span>child</span>`),
    )

    const boundary = View.use(child)
      .pipe(View.catchTag("SaveFailure", () => html`<span>handled</span>`))
      .pipe(View.provideService({ save: (value: string) => value } satisfies SaveGateway))

    const host = Component.make("template-host").pipe(
      Component.view(() =>
        html`
        <article>
          ${boundary}
          ${
          View.match(Result.succeed("ready"), {
            onSuccess: (value) => html`<strong>${value}</strong>`,
            onFailure: (error) => html`<strong>${String(error)}</strong>`,
          })
        }
          ${
          View.match({ _tag: "Ready", label: "go" } as const, {
            Ready: ({ label }) => html`<em>${label}</em>`,
            orElse: () => html`<em>fallback</em>`,
          })
        }
        </article>
      `
      ),
    )

    const handle = mount({ host })

    expect(handle.html).toContain("<span>child</span>")
    expect(handle.html).toContain("<strong>ready</strong>")
    expect(handle.html).toContain("<em>go</em>")

    handle.dispose()
  })

  it("interpolates array-shaped children and slots inside html through View.use", () => {
    const card = Component.make("html-card").pipe(
      Component.view(({ children }) => html`<article>${children}</article>`),
    )

    const layout = Component.make("html-layout").pipe(
      Component.slots({
        default: Slot.required(),
        header: Slot.optional(),
      }),
      Component.view(({ slots }) => html`<section>${slots.header}<main>${slots.default}</main></section>`),
    )

    const page = Component.make("html-page").pipe(
      Component.view(() =>
        html`
        <div>
          ${View.use(card, ["lead ", html`<strong>body</strong>`, 2])}
          ${
          View.use(layout, {
            header: ["Header ", html`<span>slot</span>`],
            default: [html`<p>content</p>`, " tail"],
          })
        }
        </div>
      `
      ),
    )

    const handle = mount({ page })

    expect(handle.html).toContain("<article>lead <strong>body</strong>2</article>")
    expect(handle.html).toContain("<section>Header <span>slot</span><main><p>content</p> tail</main></section>")

    handle.dispose()
  })

  it("rejects unsupported web directives", () => {
    expect(() => html`<div web:class=${() => "active"}></div>`).toThrowError(
      /Unsupported template directive 'web:class'/,
    )
  })

  it("matches async result sources across waiting, success, failure, error, and defect branches", () => {
    const root = document.createElement("div")
    const loader = Component.make("template-loader").pipe(
      Component.model({
        result: Atom.make<View.AsyncResult<string, string, Error>>({ _tag: "Waiting" }),
      }),
      Component.actions({
        succeed: ({ result }) => result.set({ _tag: "Success", success: "ready" }),
        fail: ({ result }) => result.set({ _tag: "Failure", failure: "nope" }),
        error: ({ result }) => result.set({ _tag: "Error", error: new Error("boom") }),
        defect: ({ result }) => result.set({ _tag: "Defect", defect: "kaput" }),
      }),
      Component.view(({ state }) =>
        html`
        <section>
          ${
          View.match(() => state.result(), {
            onWaiting: () => html`<p>waiting</p>`,
            onSuccess: (value) => html`<p>${value}</p>`,
            onFailure: (failure) => html`<p>${failure}</p>`,
            onError: (error) => html`<p>${error.message}</p>`,
            onDefect: (defect) => html`<p>${String(defect)}</p>`,
          })
        }
        </section>
      `
      ),
    )

    const handle = mount({ loader }, { root })

    expect(root.textContent).toBe("waiting")
    ;(handle.actions as any).succeed()
    expect(root.textContent).toBe("ready")
    ;(handle.actions as any).fail()
    expect(root.textContent).toBe("nope")
    ;(handle.actions as any).error()
    expect(root.textContent).toBe("boom")
    ;(handle.actions as any).defect()
    expect(root.textContent).toBe("kaput")

    handle.dispose()
  })

  it("keeps eager template reads as snapshots while lambda reads stay reactive", () => {
    const root = document.createElement("div")
    const counter = Component.make("snapshot-counter").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        html`
        <section>
          <p data-kind="eager">${state.count()}</p>
          <p data-kind="lazy">${() => state.count()}</p>
        </section>
      `
      ),
    )

    const handle = mount({ counter }, { root })
    const eager = root.querySelector('[data-kind="eager"]')
    const lazy = root.querySelector('[data-kind="lazy"]')

    expect(eager?.textContent).toBe("1")
    expect(lazy?.textContent).toBe("1")
    ;(handle.actions as any).increment()

    expect(eager?.textContent).toBe("1")
    expect(lazy?.textContent).toBe("2")

    handle.dispose()
  })

  it("rejects direct component and array interpolation in the template path", () => {
    const child = Component.make("template-child").pipe(
      Component.view(() => html`<span>child</span>`),
    )

    expect(() => html`<div>${child as never}</div>`).toThrowError(/View\.use/)
    expect(() => html`<div>${[View.text("invalid")] as never}</div>`).toThrowError(/View\.for/)
  })
})
