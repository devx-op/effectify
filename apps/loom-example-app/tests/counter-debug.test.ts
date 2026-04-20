// @vitest-environment jsdom

import { describe, expect, it } from "vitest"
import { attachCounterDebugFlash } from "../src/counter-debug.js"

const yieldToEventLoop = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe("counter debug flash helper", () => {
  it("flashes only when the dynamic counter text changes", async () => {
    document.body.innerHTML = `
      <div data-counter-value="true">
        Count:
        <div data-counter-dynamic-value="true">2</div>
      </div>
    `

    const attached = attachCounterDebugFlash(document)
    const dynamicValue = document.querySelector('[data-counter-dynamic-value="true"]')

    if (!(dynamicValue instanceof HTMLElement)) {
      throw new Error("expected dynamic counter value")
    }

    expect(attached).toBe(true)
    expect(dynamicValue.dataset.counterDebugFlash).toBe("idle")

    dynamicValue.textContent = "3"
    await yieldToEventLoop()

    expect(dynamicValue.dataset.counterDebugFlash).toBe("active")
    expect(dynamicValue.style.getPropertyValue("--counter-debug-bg")).toBe("rgba(250, 204, 21, 0.28)")
  })
})
