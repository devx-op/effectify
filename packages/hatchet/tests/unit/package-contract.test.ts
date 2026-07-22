import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const packageDirectory = fileURLToPath(new URL("../..", import.meta.url))

const runNode = (source: string): string =>
  execFileSync(process.execPath, ["--input-type=module", "--eval", source], {
    cwd: packageDirectory,
    encoding: "utf8",
  })

describe("published package contract", () => {
  it("resolves the built testing subpath without exposing testing helpers from the root", () => {
    expect(
      existsSync(new URL("../../dist/src/testing/index.js", import.meta.url)),
    ).toBe(true)
    expect(
      existsSync(new URL("../../dist/src/testing/index.d.ts", import.meta.url)),
    ).toBe(true)

    const output = runNode(`
      import * as root from "@effectify/hatchet"
      import * as testing from "@effectify/hatchet/testing"
      console.log(JSON.stringify({
        testingLayer: typeof testing.TestHatchetLayer,
        rootHasTestingLayer: "TestHatchetLayer" in root,
      }))
    `)

    expect(JSON.parse(output)).toEqual({
      testingLayer: "object",
      rootHasTestingLayer: false,
    })
  })
})
