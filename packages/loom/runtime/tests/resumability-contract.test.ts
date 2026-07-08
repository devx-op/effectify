import { describe, expect, expectTypeOf, it } from "vitest"
import * as Resumability from "../src/resumability.js"

describe("@effectify/loom-runtime resumability contract", () => {
  it("creates a canonical contract, strips transient fields, and round-trips through json", async () => {
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
        dehydratedAtoms: [{ key: "live:counter", value: 1 }],
        deferred: [{ id: "l0", kind: "live", reason: "activation-pending" }],
        transient: { cache: true },
      },
      transient: {
        openHandles: ["timer"],
      },
    })

    const encoded = Resumability.encodeContract(contract)
    const decoded = await Resumability.decodeContract(encoded, {
      expectedBuildId: "build-123",
    })

    expect(contract.version).toBe(Resumability.contractVersion)
    expect(contract.integrity.algorithm).toBe(Resumability.integrityAlgorithm)
    expect(encoded).not.toContain("transient")
    expect(decoded).toMatchObject({
      status: "valid",
      contract,
      issues: [],
    })

    expectTypeOf(Resumability.contractVersion).toEqualTypeOf<1>()
    expectTypeOf<Resumability.LoomResumabilityContract["handlers"][number]>().toMatchTypeOf<
      Resumability.HandlerDescriptor
    >()
    expectTypeOf<Resumability.LoomResumabilityContract["liveRegions"][number]>().toMatchTypeOf<
      Resumability.LiveRegionDescriptor
    >()
  })

  it("rejects malformed contracts, version drift, and integrity failures", async () => {
    const valid = await Resumability.createContract({
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
      liveRegions: [],
      state: {
        dehydratedAtoms: [],
        deferred: [],
      },
    })

    const missingHandler = await Resumability.validateContract({
      version: Resumability.contractVersion,
      buildId: "build-123",
      rootId: "loom-root",
      boundaries: [{ id: "b0", strategy: "visible", nodeIds: ["b0.n0"] }],
      handlers: [{ boundaryId: "b0", nodeId: "b0.n0", event: "click", mode: "effect" }],
      liveRegions: [],
      state: { dehydratedAtoms: [], deferred: [] },
      integrity: valid.integrity,
    })

    const versionDrift = await Resumability.validateContract(valid, {
      expectedVersion: Resumability.contractVersion + 1,
    })

    const tamperedPayload = JSON.stringify({
      ...valid,
      rootId: "tampered-root",
    })
    const integrityFailure = await Resumability.decodeContract(tamperedPayload, {
      expectedBuildId: "build-123",
    })

    expect(missingHandler.status).toBe("invalid")
    expect(missingHandler.issues).toContainEqual(
      expect.objectContaining({
        path: "handlers[0].ref",
        reason: "missing-field",
      }),
    )
    expect(versionDrift.status).toBe("invalid")
    expect(versionDrift.issues).toContainEqual(
      expect.objectContaining({
        path: "version",
        reason: "version-mismatch",
      }),
    )
    expect(integrityFailure.status).toBe("invalid")
    expect(integrityFailure.issues).toContainEqual(
      expect.objectContaining({
        path: "integrity.payloadHash",
        reason: "integrity-mismatch",
      }),
    )
  })
})
