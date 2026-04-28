// @vitest-environment node

import { describe, expect, it } from "vitest"
import { Html, html, Hydration } from "../src/index.js"

describe("@effectify/loom template parsing in node", () => {
  it("authors SSR-safe templates without installing a global document", () => {
    Reflect.deleteProperty(globalThis, "document")

    const result = Html.renderToString(
      html`
        <section class="inventory" web:hydrate=${Hydration.strategy.visible()}>
          <button type="button" web:click=${() => undefined}>increment</button>
          <input type="text" value=${() => "count:1"} />
          <p>${() => 1}</p>
        </section>
      `,
    )

    expect(result).toContain('data-loom-hydrate="visible"')
    expect(result).toContain('data-loom-events="click"')
    expect(result).toContain('value="count:1"')
    expect(result).toContain("<p>1</p>")
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })

  it("keeps unsupported directive errors stable when document is unavailable", () => {
    Reflect.deleteProperty(globalThis, "document")

    expect(() => html`<div web:class=${() => "active"}></div>`).toThrowError(
      /Unsupported template directive 'web:class'/,
    )
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })

  it("fails fast for malformed templates without installing a global document", () => {
    Reflect.deleteProperty(globalThis, "document")

    expect(() => html`<section><span>broken</section>`).toThrowError(
      /Invalid html template: expected <\/span> but found <\/section>\./,
    )
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })
})
