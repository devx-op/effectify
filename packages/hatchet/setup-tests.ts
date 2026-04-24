import * as it from "@effect/vitest"
import path from "node:path"
import { fileURLToPath } from "node:url"

it.addEqualityTesters()

if (typeof __dirname === "undefined") {
  ;(globalThis as any).__dirname = path.dirname(fileURLToPath(import.meta.url))
}
