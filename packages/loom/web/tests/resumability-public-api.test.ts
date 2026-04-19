import { describe, expect, it } from "vitest"
import { Html, Resumability } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

describe("@effectify/loom resumability public api", () => {
  it("re-exports resumability helpers from the package root", () => {
    const clickRef = Resumability.makeExecutableRef("app/counter", "onClick")
    const liveRef = Resumability.makeExecutableRef("app/counter", "renderLive")
    const handler = Resumability.handler(clickRef, effectLike)
    const live = Resumability.live(liveRef, (value) => Html.text(String(value)))

    expect(clickRef).toBe("app/counter#onClick")
    expect(liveRef).toBe("app/counter#renderLive")
    expect(handler).toEqual({
      _tag: "ReferencedHandler",
      ref: clickRef,
      handler: effectLike,
    })
    expect(live).toEqual({
      _tag: "ReferencedLiveRegion",
      ref: liveRef,
      render: expect.any(Function),
    })
    expect(typeof Resumability.makeLocalRegistry).toBe("function")
    expect(typeof Resumability.createRenderContract).toBe("function")
  })
})
