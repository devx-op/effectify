// @vitest-environment jsdom

import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { LoomNitro } from "../../nitro/src/index.js"
import { LoomVite } from "../../vite/src/index.js"
import { Html, Hydration } from "../src/index.js"

const makeSerializableTextAtom = (key: string, value: string) =>
  Atom.serializable(Atom.make(value), {
    key,
    schema: Schema.String,
  })

const writePayloadDocument = (html: string, payload: unknown, payloadElementId = "loom-payload"): void => {
  document.body.innerHTML =
    `<div id="loom-root">${html}</div><script type="application/json" id="${payloadElementId}">${
      JSON.stringify(payload)
    }</script><div id="outside-root"><p>outside</p></div>`
}

describe("loom web integrations browser bootstrap", () => {
  it("consumes the Nitro activation payload and activates matching live islands from the browser document", async () => {
    const source = makeSerializableTextAtom("live:bootstrap", "client")
    const serverRegistry = AtomRegistry.make()
    const clientRegistry = AtomRegistry.make()
    serverRegistry.set(source, "server")

    const nitro = LoomNitro.renderer({
      rootId: "loom-root",
      render: () =>
        Html.el(
          "section",
          Html.hydrate(Hydration.visible()),
          Html.children(
            Html.live(source, (value) => Html.el("span", Html.attr("data-live", "value"), Html.children(value))),
          ),
        ),
      ssr: { registry: serverRegistry },
    })

    const result = await nitro.render({
      method: "GET",
      url: "/demo",
      headers: {},
    })

    if (result.activation === undefined) {
      throw new Error("expected Nitro activation payload")
    }

    writePayloadDocument(result.html, result.activation)

    const bootstrap = LoomVite.bootstrap(document, {
      payloadElementId: "loom-payload",
      registry: clientRegistry,
    })

    expect(bootstrap.status).toBe("activated")
    expect(bootstrap.activation?.issues).toEqual([])
    expect(bootstrap.activation?.boundaries.map(({ id }) => id)).toEqual(["b0"])
    expect(bootstrap.activation?.deferred).toEqual(result.activation.manifest.deferred)
    expect(clientRegistry.get(source)).toBe("server")
    expect(document.querySelector('[data-live="value"]')?.textContent).toBe("server")
    expect(document.querySelector("#outside-root")?.textContent).toContain("outside")
  })

  it("leaves static html unchanged when no serialized payload is present", () => {
    document.body.innerHTML = '<div id="loom-root"><main>static</main></div>'
    const before = document.body.innerHTML

    const bootstrap = LoomVite.bootstrap(document)

    expect(bootstrap.status).toBe("missing-payload")
    expect(bootstrap.activation).toBeUndefined()
    expect(document.body.innerHTML).toBe(before)
  })

  it("reports root drift without mutating the DOM when the payload root cannot be found", async () => {
    const nitro = LoomNitro.renderer({
      rootId: "loom-root",
      render: () => Html.el("section", Html.hydrate(Hydration.visible()), Html.children("ready")),
    })

    const result = await nitro.render({
      method: "GET",
      url: "/drift",
      headers: {},
    })

    if (result.activation === undefined) {
      throw new Error("expected Nitro activation payload")
    }

    writePayloadDocument(result.html, {
      ...result.activation,
      rootId: "missing-root",
    })
    const before = document.body.innerHTML

    const bootstrap = LoomVite.bootstrap(document, { payloadElementId: "loom-payload" })

    expect(bootstrap.status).toBe("missing-root")
    expect(bootstrap.activation).toBeUndefined()
    expect(document.body.innerHTML).toBe(before)
  })

  it("surfaces boundary drift issues from a stale payload manifest", async () => {
    const nitro = LoomNitro.renderer({
      rootId: "loom-root",
      render: () => Html.el("section", Html.hydrate(Hydration.visible()), Html.children("ready")),
    })

    const result = await nitro.render({
      method: "GET",
      url: "/stale-manifest",
      headers: {},
    })

    if (result.activation === undefined) {
      throw new Error("expected Nitro activation payload")
    }

    writePayloadDocument(result.html, {
      ...result.activation,
      manifest: {
        ...result.activation.manifest,
        boundaries: result.activation.manifest.boundaries.map((boundary) => ({
          ...boundary,
          id: `${boundary.id}-stale`,
        })),
      },
    })

    const bootstrap = LoomVite.bootstrap(document, { payloadElementId: "loom-payload" })

    expect(bootstrap.status).toBe("activated")
    expect(bootstrap.activation?.issues).toContainEqual({
      boundaryId: "b0",
      nodeId: "",
      event: "",
      reason: "missing-runtime-boundary",
    })
  })
})
