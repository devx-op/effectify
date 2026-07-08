import { describe, expect, it } from "vitest"

describe("loom state accessors", () => {
  it("brands loom-owned accessors without widening plain zero-arg functions", async () => {
    const module = await import(new URL("../src/internal/tracked-state.ts", import.meta.url).href)
    const { brandStateAccessor, isStateAccessor } = module
    const plain = () => "plain"
    const accessor = brandStateAccessor(() => "tracked")

    expect(isStateAccessor(plain)).toBe(false)
    expect(isStateAccessor(accessor)).toBe(true)
    expect(accessor()).toBe("tracked")
  })
})
