// @vitest-environment jsdom

import * as Result from "effect/Result"
import { Atom } from "effect/unstable/reactivity"
import { describe, expect, it } from "vitest"
import { Component, Html, html, Hydration, mount, Slot, View } from "../src/index.js"

const withDocumentRemoved = <Result>(run: () => Result): Result => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document")

  Reflect.deleteProperty(globalThis, "document")

  try {
    return run()
  } finally {
    if (descriptor !== undefined) {
      Object.defineProperty(globalThis, "document", descriptor)
    }
  }
}

describe("@effectify/loom template-first view API", () => {
  it("renders SSR-safe hydration metadata and lambda values without a global document", () => {
    const result = withDocumentRemoved(() =>
      Html.renderToString(
        html`
          <section class="inventory" web:hydrate=${Hydration.strategy.visible()}>
            <button type="button" web:click=${() => undefined}>increment</button>
            <input type="text" value=${() => "count:1"} />
            <p>${() => 1}</p>
          </section>
        `,
      )
    )

    expect(result).toContain('data-loom-hydrate="visible"')
    expect(result).toContain('data-loom-events="click"')
    expect(result).toContain('value="count:1"')
    expect(result).toContain("<p>1</p>")
    expect(Reflect.has(globalThis, "document")).toBe(true)
  })

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

  it("accepts eager web:class and web:style values as snapshot attributes", () => {
    const root = document.createElement("div")
    const counter = Component.make("template-style-snapshot").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) =>
        html`
          <section>
            <div
              class="counter-card"
              style="border-color:black"
              web:class=${["active", state.count() > 1 ? "armed" : undefined, "  ready  "]}
              web:style=${{ opacity: 1, transform: `translateY(${state.count()}px)` }}
              data-counter-card="true"
            >
              card
            </div>
          </section>
        `
      ),
    )

    const handle = mount({ counter }, { root })
    const card = root.querySelector('[data-counter-card="true"]')

    expect(card?.getAttribute("class")).toBe("counter-card active ready")
    expect(card?.getAttribute("style")).toBe("border-color:black;opacity:1;transform:translateY(1px)")
    ;(handle.actions as any).increment()

    expect(card?.getAttribute("class")).toBe("counter-card active ready")
    expect(card?.getAttribute("style")).toBe("border-color:black;opacity:1;transform:translateY(1px)")

    handle.dispose()
  })

  it("updates reactive web:class and web:style thunks without recreating the element", () => {
    const root = document.createElement("div")
    const counter = Component.make("template-style-reactive").pipe(
      Component.model({ count: Atom.make(0), enabled: Atom.make(false) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
        toggle: ({ enabled }) => enabled.update((value) => !value),
      }),
      Component.view(({ state }) =>
        html`
          <section>
            <div
              class="counter-card"
              style="border-color:black"
              web:class=${() => [state.enabled() ? "active" : undefined, `count-${state.count()}`]}
              web:style=${() => ({ opacity: state.enabled() ? 1 : 0.25, transform: `translateY(${state.count()}px)` })}
              data-counter-card="true"
            >
              card
            </div>
          </section>
        `
      ),
    )

    const handle = mount({ counter }, { root })
    const cardBefore = root.querySelector('[data-counter-card="true"]')

    expect(cardBefore?.getAttribute("class")).toBe("counter-card count-0")
    expect(cardBefore?.getAttribute("style")).toBe("border-color:black;opacity:0.25;transform:translateY(0px)")
    ;(handle.actions as any).toggle()
    ;(handle.actions as any).increment()

    const cardAfter = root.querySelector('[data-counter-card="true"]')

    expect(cardAfter).toBe(cardBefore)
    expect(cardAfter?.getAttribute("class")).toBe("counter-card active count-1")
    expect(cardAfter?.getAttribute("style")).toBe("border-color:black;opacity:1;transform:translateY(1px)")

    handle.dispose()
  })

  it("rejects invalid web:class and web:style value shapes", () => {
    expect(() => html`<div web:class=${{ active: true } as never}></div>`).toThrowError(/web:class expects/)
    expect(() => html`<div web:style=${["opacity:1"] as never}></div>`).toThrowError(/web:style expects/)
    expect(() => html`<div web:class=${((value: string) => value) as never}></div>`).toThrowError(/web:class expects/)
    expect(() => html`<div web:style=${((value: string) => value) as never}></div>`).toThrowError(/web:style expects/)
  })

  it("keeps rejecting unknown web directives", () => {
    expect(() => html`<div web:foo=${() => "active"}></div>`).toThrowError(
      /Unsupported template directive 'web:foo'/,
    )
  })

  it("binds web:input through the same event context path as Web.on", () => {
    const root = document.createElement("div")
    const draftInput = Component.make("draft-input").pipe(
      Component.model({ draft: Atom.make("") }),
      Component.actions(({ model }) => ({
        syncDraft: (value: string) => model.draft.set(value),
      })),
      Component.view(({ state, actions }) =>
        html`
          <label>
            <span>${() => state.draft()}</span>
            <input
              type="text"
              web:value=${() => state.draft()}
              web:input=${({ currentTarget }) => {
          if (currentTarget instanceof HTMLInputElement) {
            actions.syncDraft(currentTarget.value)
          }
        }}
            />
          </label>
        `
      ),
    )

    const handle = mount({ draftInput }, { root })
    const input = root.querySelector("input")

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("expected input element")
    }

    input.value = "Ship template input parity"
    input.dispatchEvent(new Event("input", { bubbles: true }))

    expect(root.querySelector("span")?.textContent).toBe("Ship template input parity")
    expect(input.value).toBe("Ship template input parity")

    handle.dispose()
  })

  it("binds web:submit through the same submit runtime path as Web.on", () => {
    const root = document.createElement("div")
    const formEvents = Component.make("submit-form").pipe(
      Component.model({ submits: Atom.make(0), tagName: Atom.make("idle") }),
      Component.actions(({ model }) => ({
        submit: (element: EventTarget | null) => {
          model.submits.update((value) => value + 1)
          model.tagName.set(element instanceof HTMLFormElement ? element.tagName : "invalid")
        },
      })),
      Component.view(({ state, actions }) =>
        html`
          <form
            web:submit=${({ currentTarget, event }) => {
          event.preventDefault()
          actions.submit(currentTarget)
        }}
          >
            <button type="submit">Save</button>
            <output data-submit-count="true">${() => state.submits()}</output>
            <output data-submit-tag="true">${() => state.tagName()}</output>
          </form>
        `
      ),
    )

    const handle = mount({ formEvents }, { root })
    const form = root.querySelector("form")

    if (!(form instanceof HTMLFormElement)) {
      throw new Error("expected form element")
    }

    const submitted = form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))

    expect(submitted).toBe(false)
    expect(root.querySelector('[data-submit-count="true"]')?.textContent).toBe("1")
    expect(root.querySelector('[data-submit-tag="true"]')?.textContent).toBe("FORM")

    handle.dispose()
  })

  it("updates runtime-visible attr, class, reactive string style, click, and inputValue behavior through template directives", () => {
    const root = document.createElement("div")
    const templateDirectives = Component.make("template-directives-runtime").pipe(
      Component.model({ count: Atom.make(1), draft: Atom.make("alpha") }),
      Component.actions(({ model }) => ({
        increment: () => model.count.update((value) => value + 1),
        syncDraft: (value: string) => model.draft.set(value),
      })),
      Component.view(({ state, actions }) =>
        html`
          <section>
            <button type="button" data-action="increment" web:click=${actions.increment}>Increment</button>
            <input
              type="text"
              data-draft-input="true"
              web:inputValue=${() => `${state.draft()}:${state.count()}`}
              web:input=${({ currentTarget }) => {
          if (currentTarget instanceof HTMLInputElement) {
            actions.syncDraft(currentTarget.value)
          }
        }}
            />
            <div
              data-runtime-card="true"
              data-tone=${() => state.count() > 1 ? "active" : "idle"}
              title=${() => `draft:${state.draft()}`}
              web:class=${() => ["status-card", state.count() > 1 ? "status-card--active" : "status-card--idle"]}
              web:style=${() => `transform:translateY(${state.count()}px);opacity:${state.count() > 1 ? 1 : 0.5}`}
            >
              ${() => `${state.draft()}#${state.count()}`}
            </div>
          </section>
        `
      ),
    )

    const handle = mount({ templateDirectives }, { root })
    const button = root.querySelector('[data-action="increment"]')
    const input = root.querySelector('[data-draft-input="true"]')
    const card = root.querySelector('[data-runtime-card="true"]')

    if (
      !(button instanceof HTMLButtonElement) || !(input instanceof HTMLInputElement) ||
      !(card instanceof HTMLDivElement)
    ) {
      throw new Error("expected template runtime elements")
    }

    expect(input.value).toBe("alpha:1")
    expect(card.dataset.tone).toBe("idle")
    expect(card.getAttribute("title")).toBe("draft:alpha")
    expect(card.getAttribute("class")).toContain("status-card--idle")
    expect(card.getAttribute("style")).toBe("transform:translateY(1px);opacity:0.5")
    expect(card.style.transform).toBe("translateY(1px)")
    expect(card.textContent).toBe("alpha#1")

    button.click()

    expect(input.value).toBe("alpha:2")
    expect(card.dataset.tone).toBe("active")
    expect(card.getAttribute("class")).toContain("status-card--active")
    expect(card.getAttribute("style")).toBe("transform:translateY(2px);opacity:1")
    expect(card.style.opacity).toBe("1")
    expect(card.textContent).toBe("alpha#2")

    input.value = "beta"
    input.dispatchEvent(new Event("input", { bubbles: true }))

    expect(input.value).toBe("beta:2")
    expect(card.getAttribute("title")).toBe("draft:beta")
    expect(card.textContent).toBe("beta#2")

    handle.dispose()
  })

  it("rejects invalid handlers for web:input and web:submit", () => {
    expect(() => html`<input web:input=${"hello"} />`).toThrowError(/web:input expects an event handler\./)
    expect(() => html`<form web:submit=${"hello"}></form>`).toThrowError(/web:submit expects an event handler\./)
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

  it("does not auto-track broad expressions or formatted helper results as accessor sugar", () => {
    const root = document.createElement("div")
    const formatTitle = (value: string) => `title:${value}`
    const counter = Component.make("non-reactive-template-expression-counter").pipe(
      Component.model({ count: Atom.make(1), title: Atom.make("Count 1") }),
      Component.actions({
        increment: ({ count, title }) => {
          count.update((value) => value + 1)
          title.set(`Count ${count.get()}`)
        },
      }),
      Component.view(({ state }) =>
        html`
          <section>
            <p data-kind="broad-expression">${state.count() + 1}</p>
            <p data-kind="formatted-helper">${formatTitle(state.title())}</p>
            <p data-kind="accessor">${state.count}</p>
          </section>
        `
      ),
    )

    const handle = mount({ counter }, { root })
    const broadExpression = root.querySelector('[data-kind="broad-expression"]')
    const formattedHelper = root.querySelector('[data-kind="formatted-helper"]')
    const accessor = root.querySelector('[data-kind="accessor"]')

    expect(broadExpression?.textContent).toBe("2")
    expect(formattedHelper?.textContent).toBe("title:Count 1")
    expect(accessor?.textContent).toBe("1")
    ;(handle.actions as any).increment()

    expect(broadExpression?.textContent).toBe("2")
    expect(formattedHelper?.textContent).toBe("title:Count 1")
    expect(accessor?.textContent).toBe("2")

    handle.dispose()
  })

  it("supports bare state accessors as reactive template sugar in text and approved bindings", () => {
    const root = document.createElement("div")
    const counter = Component.make("accessor-sugar-counter").pipe(
      Component.model({ count: Atom.make(1), title: Atom.make("Count 1") }),
      Component.actions({
        increment: ({ count, title }) => {
          count.update((value) => value + 1)
          title.set(`Count ${count.get()}`)
        },
      }),
      Component.view(({ state }) =>
        html`
          <section>
            <p data-kind="accessor">${state.count}</p>
            <p data-kind="snapshot">${state.count()}</p>
            <input type="text" title=${state.title} web:value=${state.count} />
          </section>
        `
      ),
    )

    const handle = mount({ counter }, { root })
    const accessor = root.querySelector('[data-kind="accessor"]')
    const snapshot = root.querySelector('[data-kind="snapshot"]')
    const input = root.querySelector("input")

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("expected html template input")
    }

    expect(accessor?.textContent).toBe("1")
    expect(snapshot?.textContent).toBe("1")
    expect(input.value).toBe("1")
    expect(input.getAttribute("title")).toBe("Count 1")
    ;(handle.actions as any).increment()

    expect(accessor?.textContent).toBe("2")
    expect(snapshot?.textContent).toBe("1")
    expect(input.value).toBe("2")
    expect(input.getAttribute("title")).toBe("Count 2")

    handle.dispose()
  })

  it("keeps custom zero-arg functions as explicit reactive lambdas", () => {
    const root = document.createElement("div")
    const counter = Component.make("custom-lambda-counter").pipe(
      Component.model({ count: Atom.make(1) }),
      Component.actions({
        increment: ({ count }) => count.update((value) => value + 1),
      }),
      Component.view(({ state }) => {
        const plusOne = () => state.count() + 1

        return html`<p data-kind="lambda">${plusOne}</p>`
      }),
    )

    const handle = mount({ counter }, { root })
    const lambda = root.querySelector('[data-kind="lambda"]')

    expect(lambda?.textContent).toBe("2")
    ;(handle.actions as any).increment()
    expect(lambda?.textContent).toBe("3")

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
