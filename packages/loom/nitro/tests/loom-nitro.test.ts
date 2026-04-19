import { describe, expect, it } from "vitest"
import { Html, Hydration } from "@effectify/loom"
import {
  assertLoomPayloadSerializable,
  createLoomActivationPayload,
  decodeLoomActivationPayload,
  encodeLoomActivationPayload,
  renderLoomPayloadElement,
} from "../src/internal/payload.js"
import { renderLoomNitroResponse } from "../src/internal/ssr-adapter.js"
import { renderer } from "../src/loom-nitro.js"

describe("@effectify/loom-nitro", () => {
  it("creates an activation payload for hydratable SSR and round-trips it through JSON", () => {
    const render = Html.ssr(Html.el("main", Html.hydrate(Hydration.visible()), Html.children("ready")))
    const payload = createLoomActivationPayload("loom-root", render)

    expect(payload).toBeDefined()

    if (payload === undefined) {
      throw new Error("expected activation payload")
    }

    expect(payload).toMatchObject({
      version: 1,
      rootId: "loom-root",
      manifest: render.activation.manifest,
      dehydratedAtoms: render.dehydratedAtoms,
    })
    expect(decodeLoomActivationPayload(encodeLoomActivationPayload(payload))).toEqual(payload)
    expect(renderLoomPayloadElement(payload, "loom-payload")).toContain('id="loom-payload"')
  })

  it("skips activation payload creation for static SSR", () => {
    const render = Html.ssr(Html.el("main", Html.children("static")))

    expect(createLoomActivationPayload("loom-root", render)).toBeUndefined()
  })

  it("rejects non-serializable activation payload values explicitly", () => {
    expect(() =>
      assertLoomPayloadSerializable({
        version: 1,
        rootId: "loom-root",
        manifest: { boundaries: [], deferred: [] },
        dehydratedAtoms: [{ key: "bad", value: Number.NaN, dehydratedAt: Date.now() }],
      })
    ).toThrow("Loom activation payload is not JSON serializable")
  })

  it("accepts dehydrated atoms whose optional promise slot is absent at serialization time", () => {
    expect(
      assertLoomPayloadSerializable({
        version: 1,
        rootId: "loom-root",
        manifest: { boundaries: [], deferred: [] },
        dehydratedAtoms: [
          {
            "~effect/reactivity/DehydratedAtom": true,
            key: "live:ready",
            value: "server",
            dehydratedAt: Date.now(),
            resultPromise: undefined,
          },
        ],
      }),
    ).toMatchObject({
      rootId: "loom-root",
      dehydratedAtoms: [
        expect.objectContaining({
          key: "live:ready",
          value: "server",
        }),
      ],
    })
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
      activation: expect.objectContaining({
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
      activation: undefined,
    })
  })
})
