// @vitest-environment node

import { describe, expect, it } from "vitest"
import { Html, html, Hydration } from "../src/index.js"

const expectParserErrorWithoutDocument = (
  render: () => unknown,
  message: RegExp,
): void => {
  Reflect.deleteProperty(globalThis, "document")

  expect(render).toThrowError(message)
  expect(Reflect.has(globalThis, "document")).toBe(false)
}

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

  it("serializes web:class and web:style during SSR without installing a global document", () => {
    Reflect.deleteProperty(globalThis, "document")

    const result = Html.renderToString(
      html`
        <div
          class="counter-card"
          style="border-color:black"
          web:class=${() => ["active", "ready"]}
          web:style=${() => ({ opacity: 1, transform: "translateY(2px)" })}
        >
          card
        </div>
      `,
    )

    expect(result).toContain('class="counter-card active ready"')
    expect(result).toContain('style="border-color:black;opacity:1;transform:translateY(2px)"')
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })

  it("rejects unsupported template directives without installing a global document", () => {
    expectParserErrorWithoutDocument(
      () => html`<section web:foo=${() => ["active"]}></section>`,
      /Unsupported template directive 'web:foo'/,
    )
  })

  it("fails fast for malformed templates without installing a global document", () => {
    expectParserErrorWithoutDocument(
      () => html`<section><span>broken</section>`,
      /Invalid html template: expected <\/span> but found <\/section>\./,
    )
  })
})
