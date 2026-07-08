import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { extractServerAssetUrls, validateBuildAssetContract } from "../../../scripts/validate-build-assets.mjs"

const tempRoots: string[] = []

const createBuildRoot = () => {
  const root = mkdtempSync(resolve(tmpdir(), "react-router-build-contract-"))
  tempRoots.push(root)
  return root
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe("React Router build asset contract", () => {
  it("extracts unique JavaScript asset URLs from a server bundle", () => {
    const serverBundle = [
      '"module": "/assets/entry.client-abc123.js"',
      '"imports": ["/assets/chunk-shared.js", "/assets/chunk-shared.js"]',
      '"url": "/assets/manifest-abc123.js"',
      '"stylesheet": "/assets/app.css"',
    ].join("\n")

    expect(extractServerAssetUrls(serverBundle)).toEqual([
      "/assets/chunk-shared.js",
      "/assets/entry.client-abc123.js",
      "/assets/manifest-abc123.js",
    ])
  })

  it("confirms every server-referenced asset exists under build/client/assets", () => {
    const buildRoot = createBuildRoot()
    const serverRoot = resolve(buildRoot, "server")
    const clientAssetsRoot = resolve(buildRoot, "client/assets")

    mkdirSync(serverRoot, { recursive: true })
    mkdirSync(clientAssetsRoot, { recursive: true })

    writeFileSync(
      resolve(serverRoot, "index.js"),
      [
        '"module": "/assets/entry.client-abc123.js"',
        '"imports": ["/assets/chunk-shared.js"]',
      ].join("\n"),
    )
    writeFileSync(
      resolve(clientAssetsRoot, "entry.client-abc123.js"),
      "export {}",
    )
    writeFileSync(resolve(clientAssetsRoot, "chunk-shared.js"), "export {}")

    expect(validateBuildAssetContract(buildRoot)).toEqual({
      assetUrls: ["/assets/chunk-shared.js", "/assets/entry.client-abc123.js"],
      missingAssetUrls: [],
      serverEntryPath: resolve(buildRoot, "server/index.js"),
    })
  })

  it("reports every missing client asset referenced by the server bundle", () => {
    const buildRoot = createBuildRoot()
    const serverRoot = resolve(buildRoot, "server")
    const clientAssetsRoot = resolve(buildRoot, "client/assets")

    mkdirSync(serverRoot, { recursive: true })
    mkdirSync(clientAssetsRoot, { recursive: true })

    writeFileSync(
      resolve(serverRoot, "index.js"),
      [
        '"module": "/assets/entry.client-abc123.js"',
        '"imports": ["/assets/chunk-shared.js"]',
      ].join("\n"),
    )
    writeFileSync(resolve(clientAssetsRoot, "chunk-shared.js"), "export {}")

    expect(validateBuildAssetContract(buildRoot)).toEqual({
      assetUrls: ["/assets/chunk-shared.js", "/assets/entry.client-abc123.js"],
      missingAssetUrls: ["/assets/entry.client-abc123.js"],
      serverEntryPath: resolve(buildRoot, "server/index.js"),
    })
  })
})
