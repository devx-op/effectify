import { existsSync } from "node:fs"
import { readdir, rmdir } from "node:fs/promises"
import { resolve } from "node:path"

async function cleanupTests() {
  const testsDir = resolve("src/generated/tests")
  const testDbsDir = resolve("src/generated/tests-dbs")

  // Clean up test files
  if (existsSync(testsDir)) {
    await rmdir(testsDir, { recursive: true })
  }

  // Clean up test databases
  if (existsSync(testDbsDir)) {
    const files = await readdir(testDbsDir)
    if (files.length > 0) {
      await rmdir(testDbsDir, { recursive: true })
    }
  }
}

cleanupTests().catch((error) => {
  console.error("❌ Cleanup failed:", error)
  process.exit(1)
})
