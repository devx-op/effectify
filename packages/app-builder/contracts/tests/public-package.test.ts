import { expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

it("publishes one browser-neutral root ESM entry with Effect as a peer", () => {
  const packageJson = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")) as {
    readonly private?: boolean
    readonly peerDependencies?: Record<string, string>
    readonly exports?: Record<string, Record<string, string>>
  }

  expect(packageJson.private).toBeUndefined()
  expect(packageJson.peerDependencies).toMatchObject({ effect: "catalog:" })
  expect(packageJson.exports).toEqual({
    ".": {
      "@effectify/source": "./src/index.ts",
      types: "./dist/src/index.d.ts",
      import: "./dist/src/index.js",
      default: "./dist/src/index.js",
    },
  })
})
