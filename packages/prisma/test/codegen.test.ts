import { afterEach, describe, expect, it, vi } from "vitest"

import { generateFileHeader } from "../src/schema-generator/utils/codegen.js"

describe("generateFileHeader", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the same static generated-file warning at different times", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
    const firstHeader = generateFileHeader()

    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"))
    const secondHeader = generateFileHeader()

    expect(firstHeader).toBe(`/**
 * DO NOT EDIT MANUALLY
 */`)
    expect(secondHeader).toBe(firstHeader)
    expect(secondHeader).not.toContain("Generated:")
    expect(secondHeader).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
  })
})
