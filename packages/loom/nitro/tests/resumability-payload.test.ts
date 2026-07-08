import { describe, expect, it } from "vitest"
import { Html, Hydration, Resumability } from "../../web/src/index.js"
import {
  createLoomResumabilityPayload,
  decodeLoomResumabilityPayload,
  encodeLoomResumabilityPayload,
  renderLoomPayloadElement,
} from "../src/internal/payload.js"
import { renderLoomNitroResponse } from "../src/internal/ssr-adapter.js"

const effectLike = { _tag: "EffectLike" } as const

describe("@effectify/loom-nitro resumability payload", () => {
  it("creates a serialized resumability payload from SSR output and round-trips it", async () => {
    const clickRef = Resumability.makeExecutableRef("app/counter", "onClick")

    const render = Html.ssr(
      Html.el(
        "section",
        Html.hydrate(Hydration.visible()),
        Html.on("click", Resumability.handler(clickRef, effectLike)),
        Html.children("ready"),
      ),
    )

    const payload = await createLoomResumabilityPayload({
      buildId: "build-123",
      rootId: "loom-root",
    }, render)

    expect(payload).toBeDefined()

    if (payload === undefined) {
      throw new Error("expected resumability payload")
    }

    expect(payload).toMatchObject({
      version: 1,
      buildId: "build-123",
      rootId: "loom-root",
      handlers: [
        expect.objectContaining({
          ref: clickRef,
          event: "click",
        }),
      ],
      liveRegions: [],
    })

    await expect(decodeLoomResumabilityPayload(encodeLoomResumabilityPayload(payload), {
      expectedBuildId: "build-123",
    })).resolves.toEqual({
      status: "valid",
      contract: payload,
      issues: [],
    })

    expect(renderLoomPayloadElement(payload, "loom-payload")).toContain('id="loom-payload"')
  })

  it("keeps unsupported resumability cases honest by skipping payload creation", async () => {
    const render = Html.ssr(
      Html.el(
        "section",
        Html.hydrate(Hydration.visible()),
        Html.on("click", effectLike),
        Html.children("ready"),
      ),
    )

    await expect(createLoomResumabilityPayload({
      buildId: "build-123",
      rootId: "loom-root",
    }, render)).resolves.toBeUndefined()
  })

  it("keeps the default shell and bootstrap markers when the route body is missing", async () => {
    const result = await renderLoomNitroResponse(
      {
        render: () => ({
          title: "Broken route",
          body: undefined,
        }),
      },
      {
        method: "GET",
        url: "/broken",
        headers: {},
      },
    )

    expect(result.html).toContain("<title>Broken route</title>")
    expect(result.html).toContain('<div id="loom-root"></div>')
    expect(result.html).toContain('id="__loom_payload__"')
    expect(result.html).toContain('src="/src/entry-client.ts"')
  })
})
