import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as it from '@effect/vitest'

it.addEqualityTesters()

if (typeof __dirname === 'undefined') {
  
  ;(globalThis as any).__dirname = path.dirname(fileURLToPath(import.meta.url))
}
