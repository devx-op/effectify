import { Atom } from "effect/unstable/reactivity"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Resumability from "../src/resumability.js"

describe("@effectify/loom-runtime resumability registry", () => {
  it("resolves registered handler and live-region refs through the local registry seam", () => {
    const registry = Resumability.makeLocalRegistry()
    const handlerRef = Resumability.makeExecutableRef("app/counter", "onClick")
    const liveRegionRef = Resumability.makeExecutableRef("app/counter", "renderLive")
    const handler = { _tag: "EffectLike" } as const
    const atom = Atom.serializable(Atom.make(1), { key: "live:counter", schema: Schema.Number })
    const renderLive: Resumability.LiveRegionRenderer = (value) => ({
      _tag: "Text",
      value: String(value),
    })

    Resumability.registerHandler(registry, handlerRef, handler)
    Resumability.registerLiveRegion(registry, liveRegionRef, atom, renderLive)

    expect(Resumability.resolveHandler(registry, handlerRef)).toBe(handler)
    expect(Resumability.resolveLiveRegion(registry, liveRegionRef).atom).toBe(atom)
    expect(Resumability.resolveLiveRegion(registry, liveRegionRef).render(1)).toEqual({
      _tag: "Text",
      value: "1",
    })
  })

  it("downgrades missing local refs to a fresh start and surfaces explicit lookup errors", async () => {
    const contract = await Resumability.createContract({
      buildId: "build-123",
      rootId: "loom-root",
      boundaries: [{ id: "b0", strategy: "visible", nodeIds: ["b0.n0"] }],
      handlers: [
        {
          ref: Resumability.makeExecutableRef("app/counter", "onClick"),
          boundaryId: "b0",
          nodeId: "b0.n0",
          event: "click",
          mode: "effect",
        },
      ],
      liveRegions: [
        {
          id: "l0",
          boundaryId: "b0",
          ref: Resumability.makeExecutableRef("app/counter", "renderLive"),
          atomKey: "live:counter",
          startMarker: "loom-live-start:l0",
          endMarker: "loom-live-end:l0",
        },
      ],
      state: {
        dehydratedAtoms: [],
        deferred: [],
      },
    })

    const registry = Resumability.makeLocalRegistry()
    const validation = await Resumability.validateContract(contract, { registry })

    expect(validation.status).toBe("fresh-start")
    expect(validation.issues).toEqual([
      expect.objectContaining({
        path: "handlers[0].ref",
        reason: "missing-local-handler-ref",
      }),
      expect.objectContaining({
        path: "liveRegions[0].ref",
        reason: "missing-local-live-region-ref",
      }),
    ])
    expect(() => Resumability.resolveHandler(registry, contract.handlers[0]!.ref)).toThrowError(
      Resumability.MissingHandlerRefError,
    )
    expect(() => Resumability.resolveLiveRegion(registry, contract.liveRegions[0]!.ref)).toThrowError(
      Resumability.MissingLiveRegionRefError,
    )
  })
})
