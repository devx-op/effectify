import { describe, expect, it } from "vitest"
import { Html, Hydration } from "@effectify/loom"
import {
  createLoomResumabilityPayload,
  decodeLoomResumabilityPayload,
  encodeLoomResumabilityPayload,
  renderLoomPayloadElement,
} from "../src/internal/payload.js"
import { renderLoomNitroResponse } from "../src/internal/ssr-adapter.js"
import { renderer } from "../src/loom-nitro.js"

describe("@effectify/loom-nitro", () => {
  it("creates an activation payload for hydratable SSR and round-trips it through JSON", async () => {
    const render = Html.ssr(Html.el("main", Html.hydrate(Hydration.visible()), Html.children("ready")))
    const payload = await createLoomResumabilityPayload({ buildId: "build-123", rootId: "loom-root" }, render)

    expect(payload).toBeDefined()

    if (payload === undefined) {
      throw new Error("expected activation payload")
    }

    expect(payload).toMatchObject({
      version: 1,
      buildId: "build-123",
      rootId: "loom-root",
      boundaries: render.resumability.status === "ready" ? render.resumability.draft.boundaries : [],
    })
    await expect(
      decodeLoomResumabilityPayload(encodeLoomResumabilityPayload(payload), { expectedBuildId: "build-123" }),
    ).resolves.toEqual({ status: "valid", contract: payload, issues: [] })
    expect(renderLoomPayloadElement(payload, "loom-payload")).toContain('id="loom-payload"')
  })

  it("skips activation payload creation for static SSR", async () => {
    const render = Html.ssr(Html.el("main", Html.children("static")))

    await expect(createLoomResumabilityPayload({ buildId: "build-123", rootId: "loom-root" }, render)).resolves
      .toBeUndefined()
  })

  it("renders the Nitro handoff shape with request metadata and activation payload", async () => {
    const result = await renderLoomNitroResponse(
      {
        rootId: "loom-root",
        render: (request) =>
          Html.el("main", Html.hydrate(Hydration.visible()), Html.children(`${request.method}:${request.url}`)),
        response: () => ({
          status: 201,
          headers: { "x-loom": "ready" },
        }),
      },
      {
        method: "GET",
        url: "/demo",
        headers: { accept: "text/html" },
      },
    )

    expect(result).toMatchObject({
      html: expect.stringContaining("GET:/demo"),
      status: 201,
      headers: { "x-loom": "ready" },
      resumability: expect.objectContaining({
        version: 1,
        rootId: "loom-root",
      }),
    })
  })

  it("exposes the initial Nitro adapter module shape", async () => {
    const nitro = renderer({
      render: (request) => Html.el("main", Html.children(request.url)),
    })

    expect(nitro.name).toBe("effectify:loom-nitro")
    await expect(
      nitro.render({
        method: "GET",
        url: "/static",
        headers: {},
      }),
    ).resolves.toMatchObject({
      html: "<main>/static</main>",
      resumability: undefined,
    })
  })
})
