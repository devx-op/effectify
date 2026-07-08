import { describe, expect, it } from "vitest"
import { Html, Hydration } from "@effectify/loom"
import {
  createLoomResumabilityPayload,
  decodeLoomResumabilityPayload,
  encodeLoomResumabilityPayload,
  renderLoomPayloadElement,
} from "../src/internal/payload.js"
import { defaultLoomNitroClientEntry, renderLoomNitroResponse } from "../src/internal/ssr-adapter.js"
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

  it("renders the default Nitro document shell with request metadata and activation payload", async () => {
    const result = await renderLoomNitroResponse(
      {
        render: (request) => ({
          title: `Page ${request.url}`,
          body: Html.el("main", Html.hydrate(Hydration.visible()), Html.children(`${request.method}:${request.url}`)),
        }),
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
      diagnosticSummary: [],
      resumability: expect.objectContaining({
        version: 1,
        rootId: "loom-root",
      }),
    })
    expect(result.html).toContain("<!DOCTYPE html>")
    expect(result.html).toContain('<html lang="en">')
    expect(result.html).toContain("<title>Page /demo</title>")
    expect(result.html).toContain('<div id="loom-root">')
    expect(result.html).toContain("GET:/demo")
    expect(result.html).toContain('id="__loom_payload__"')
    expect(result.html).toContain(`<script type="module" src="${defaultLoomNitroClientEntry}"></script>`)
  })

  it("surfaces canonical resumability diagnostics through the Nitro adapter result", async () => {
    const result = await renderLoomNitroResponse(
      {
        rootId: "loom-root",
        render: () =>
          Html.el(
            "section",
            Html.hydrate(Hydration.visible()),
            Html.on("click", { _tag: "EffectLike" }),
            Html.children("ready"),
          ),
      },
      {
        method: "GET",
        url: "/unsupported",
        headers: {},
      },
    )

    expect(result.resumability).toBeUndefined()
    expect(result.diagnosticSummary).toEqual([
      {
        phase: "resumability",
        total: 1,
        highestSeverity: "error",
        hasErrors: true,
      },
    ])
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
      html: expect.stringContaining("<main>/static</main>"),
      resumability: undefined,
    })
  })

  it("uses an explicit custom document override while keeping bootstrap metadata configurable", async () => {
    const result = await renderLoomNitroResponse(
      {
        bootstrap: {
          rootId: "custom-root",
          payloadElementId: "custom-payload",
          clientEntry: "/src/custom-entry.ts",
        },
        document: {
          render: ({ bodyHtml, payloadHtml, bootstrap, title }) =>
            `<!DOCTYPE html><html><head><title>${title}</title></head><body><aside data-client-entry="${bootstrap.clientEntry}">custom-shell</aside><div id="${bootstrap.rootId}">${bodyHtml}</div>${payloadHtml}</body></html>`,
        },
        render: () => ({
          title: "Custom shell",
          body: Html.el("section", Html.hydrate(Hydration.visible()), Html.children("body")),
        }),
      },
      {
        method: "GET",
        url: "/custom",
        headers: {},
      },
    )

    expect(result.html).toContain("custom-shell")
    expect(result.html).toContain('id="custom-root"')
    expect(result.html).toContain('id="custom-payload"')
    expect(result.html).toContain('data-client-entry="/src/custom-entry.ts"')
    expect(result.resumability?.rootId).toBe("custom-root")
  })
})
