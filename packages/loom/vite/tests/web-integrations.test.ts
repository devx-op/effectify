// @vitest-environment jsdom

import { Atom, AtomRegistry } from "effect/unstable/reactivity"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as LoomRuntime from "@effectify/loom-runtime"
import { Html, Hydration, Resumability } from "@effectify/loom"
import { LoomNitro } from "../../nitro/src/index.js"
import { LoomVite } from "../src/index.js"

const effectLike = { _tag: "EffectLike" } as const

const makeSerializableTextAtom = (key: string, value: string) =>
  Atom.serializable(Atom.make(value), {
    key,
    schema: Schema.String,
  })

const writePayloadDocument = (html: string): void => {
  document.documentElement.innerHTML = html
  document.body.insertAdjacentHTML("beforeend", '<div id="outside-root"><p>outside</p></div>')
}

const writePayloadContract = (
  contract: LoomRuntime.Resumability.LoomResumabilityContract,
  payloadElementId = "__loom_payload__",
): void => {
  const payloadElement = document.getElementById(payloadElementId)

  if (!(payloadElement instanceof HTMLScriptElement)) {
    throw new Error(`expected payload element ${payloadElementId}`)
  }

  payloadElement.textContent = JSON.stringify(contract)
}

const recreateContract = (
  contract: LoomRuntime.Resumability.LoomResumabilityContract,
  overrides: Partial<
    Pick<LoomRuntime.Resumability.ContractDraft, "rootId" | "boundaries" | "handlers" | "liveRegions" | "state">
  >,
) =>
  LoomRuntime.Resumability.createContract({
    buildId: contract.buildId,
    rootId: overrides.rootId ?? contract.rootId,
    boundaries: overrides.boundaries ?? contract.boundaries,
    handlers: overrides.handlers ?? contract.handlers,
    liveRegions: overrides.liveRegions ?? contract.liveRegions,
    state: overrides.state ?? {
      dehydratedAtoms: contract.state.dehydratedAtoms,
      deferred: contract.state.deferred,
    },
  })

describe("loom web integrations browser bootstrap", () => {
  it("consumes the Nitro activation payload and activates matching live islands from the browser document", async () => {
    const source = makeSerializableTextAtom("live:bootstrap", "client")
    const liveRef = Resumability.makeExecutableRef("app/live", "render")
    const serverRegistry = AtomRegistry.make()
    const clientRegistry = AtomRegistry.make()
    const localRegistry = Resumability.makeLocalRegistry()
    serverRegistry.set(source, "server")
    Resumability.registerLiveRegion(
      localRegistry,
      liveRef,
      source,
      (value) => Html.el("span", Html.attr("data-live", "value"), Html.children(String(value))),
    )

    const nitro = LoomNitro.renderer({
      render: () => ({
        title: "Demo",
        body: Html.el(
          "section",
          Html.hydrate(Hydration.visible()),
          Html.children(
            Html.live(
              source,
              Resumability.live(
                liveRef,
                (value) => Html.el("span", Html.attr("data-live", "value"), Html.children(value)),
              ),
            ),
          ),
        ),
      }),
      ssr: { registry: serverRegistry },
    })

    const result = await nitro.render({
      method: "GET",
      url: "/demo",
      headers: {},
    })

    if (result.resumability === undefined) {
      throw new Error("expected Nitro activation payload")
    }

    writePayloadDocument(result.html)

    const bootstrap = await LoomVite.bootstrap(document, {
      localRegistry,
      registry: clientRegistry,
    })

    expect(bootstrap.status).toBe("resumed")
    expect(bootstrap.activation?.issues).toEqual([])
    expect(bootstrap.activation?.boundaries.map(({ id }) => id)).toEqual(["b0"])
    expect(bootstrap.activation?.deferred).toEqual([])
    expect(clientRegistry.get(source)).toBe("server")
    expect(document.querySelector('[data-live="value"]')?.textContent).toBe("server")
    expect(document.querySelector("#outside-root")?.textContent).toContain("outside")
  })

  it("leaves static html unchanged when no serialized payload is present", async () => {
    document.body.innerHTML = '<div id="loom-root"><main>static</main></div>'
    const before = document.body.innerHTML

    const bootstrap = await LoomVite.bootstrap(document)

    expect(bootstrap.status).toBe("missing-payload")
    expect(bootstrap.activation).toBeUndefined()
    expect(document.body.innerHTML).toBe(before)
  })

  it("reports root drift without mutating the DOM when the payload root cannot be found", async () => {
    const nitro = LoomNitro.renderer({
      render: () => Html.el("section", Html.hydrate(Hydration.visible()), Html.children("ready")),
    })

    const result = await nitro.render({
      method: "GET",
      url: "/drift",
      headers: {},
    })

    if (result.resumability === undefined) {
      throw new Error("expected Nitro activation payload")
    }

    writePayloadDocument(result.html)
    writePayloadContract(await recreateContract(result.resumability, { rootId: "missing-root" }))
    const before = document.body.innerHTML

    const bootstrap = await LoomVite.bootstrap(document, {
      localRegistry: Resumability.makeLocalRegistry(),
    })

    expect(bootstrap.status).toBe("missing-root")
    expect(bootstrap.activation).toBeUndefined()
    expect(document.body.innerHTML).toBe(before)
  })

  it("surfaces boundary drift issues from a stale payload manifest", async () => {
    const nitro = LoomNitro.renderer({
      render: () => Html.el("section", Html.hydrate(Hydration.visible()), Html.children("ready")),
    })

    const result = await nitro.render({
      method: "GET",
      url: "/stale-manifest",
      headers: {},
    })

    if (result.resumability === undefined) {
      throw new Error("expected Nitro activation payload")
    }

    const staleContract = await recreateContract(result.resumability, {
      boundaries: result.resumability.boundaries.map((boundary) => ({
        ...boundary,
        id: `${boundary.id}-stale`,
      })),
    })
    writePayloadDocument(result.html)
    writePayloadContract(staleContract)

    const bootstrap = await LoomVite.bootstrap(document, {
      localRegistry: Resumability.makeLocalRegistry(),
    })

    expect(bootstrap.status).toBe("resumed")
    expect(bootstrap.activation?.issues).toContainEqual({
      boundaryId: "b0",
      nodeId: "",
      event: "",
      reason: "missing-runtime-boundary",
    })
  })

  it("keeps custom shell and custom marker overrides working through the explicit adapter seams", async () => {
    const localRegistry = Resumability.makeLocalRegistry()
    const clickRef = Resumability.makeExecutableRef("app/custom", "onClick")

    Resumability.registerHandler(localRegistry, clickRef, effectLike)

    const nitro = LoomNitro.renderer({
      bootstrap: {
        buildId: "custom-build",
        rootId: "custom-root",
        payloadElementId: "custom-payload",
        clientEntry: "/src/custom-entry.ts",
      },
      document: {
        render: ({ bodyHtml, payloadHtml }) =>
          `<!DOCTYPE html><html><body><main data-shell="custom">shell</main><div id="custom-root">${bodyHtml}</div>${payloadHtml}</body></html>`,
      },
      render: () => ({
        title: "Custom",
        body: Html.el(
          "section",
          Html.hydrate(Hydration.visible()),
          Html.on("click", Resumability.handler(clickRef, effectLike)),
          Html.children("ready"),
        ),
      }),
    })

    const result = await nitro.render({ method: "GET", url: "/custom", headers: {} })

    writePayloadDocument(result.html)

    const bootstrap = await LoomVite.bootstrap(document, {
      expectedBuildId: "custom-build",
      localRegistry,
      payloadElementId: "custom-payload",
    })

    expect(document.querySelector('[data-shell="custom"]')?.textContent).toContain("shell")
    expect(bootstrap.status).toBe("resumed")
    expect(bootstrap.payload?.rootId).toBe("custom-root")
  })
})
