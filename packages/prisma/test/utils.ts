import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

export const trackedDbPath = path.join(import.meta.dirname, "../prisma/dev.db")
export const trackedDbSnapshot = readFileSync(trackedDbPath)
export const testDbDirectory = mkdtempSync(path.join(tmpdir(), "effectify-prisma-test-"))
export const cleanupTestDbDirectory = () => {
  rmSync(testDbDirectory, { recursive: true, force: true })
}
process.once("exit", cleanupTestDbDirectory)

export const dbPath = path.join(testDbDirectory, "dev.db")

export const prisma = (() => {
  try {
    copyFileSync(trackedDbPath, dbPath)
    const adapter = new PrismaBetterSqlite3({
      url: `file:${dbPath}`,
    })
    return new PrismaClient({ adapter })
  } catch (error) {
    cleanupTestDbDirectory()
    throw error
  }
})()
