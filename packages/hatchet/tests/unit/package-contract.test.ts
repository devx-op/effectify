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

const removedBuildPaths = [
  "../../dist/src/clients",
  "../../dist/src/core",
  "../../dist/src/logging",
  "../../dist/src/schema",
  "../../dist/src/testing/mock-client.js",
  "../../dist/src/testing/mock-client.d.ts",
  "../../dist/src/testing/mock-context.js",
  "../../dist/src/testing/mock-context.d.ts",
].map((path) => new URL(path, import.meta.url))

describe("published package contract", () => {
  it("exposes only the root in-memory Layer from the built testing subpath", () => {
    expect(existsSync(new URL("../../dist/src/testing/index.js", import.meta.url))).toBe(true)
    expect(existsSync(new URL("../../dist/src/testing/index.d.ts", import.meta.url))).toBe(true)

    const output = runNode(`
      import * as root from "@effectify/hatchet"
      import * as testing from "@effectify/hatchet/testing"
      console.log(JSON.stringify({
        exports: Object.keys(testing).sort(),
        sameLayer: testing.layerInMemory === root.Hatchet.layerInMemory,
        rootHasTestingLayer: "layerInMemory" in root,
      }))
    `)

    expect(JSON.parse(output)).toEqual({
      exports: ["layerInMemory"],
      sameLayer: true,
      rootHasTestingLayer: false,
    })
  })

  it("omits legacy trees and testing mocks from the built package", () => {
    for (const removedPath of removedBuildPaths) {
      expect(existsSync(removedPath), removedPath.pathname).toBe(false)
    }
  })
})
