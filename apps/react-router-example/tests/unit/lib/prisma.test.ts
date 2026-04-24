import { beforeEach, describe, expect, it, vi } from "vitest"

const { databaseConstructorMock, databaseExecMock } = vi.hoisted(() => ({
  databaseConstructorMock: vi.fn(),
  databaseExecMock: vi.fn(),
}))

vi.mock("better-sqlite3", () => {
  class MockDatabase {
    constructor(path: string) {
      databaseConstructorMock(path)
    }

    exec(sql: string) {
      databaseExecMock(sql)
      return this
    }
  }

  return {
    default: MockDatabase,
    Database: MockDatabase,
  }
})

describe("prisma SQLite bootstrap", () => {
  beforeEach(() => {
    vi.resetModules()
    databaseConstructorMock.mockReset()
    databaseExecMock.mockReset()
    delete process.env.DATABASE_URL
  })

  it("defaults to the local dev SQLite database when DATABASE_URL is missing", async () => {
    await import("../../../app/lib/prisma.js")

    expect(databaseConstructorMock).toHaveBeenCalledWith("./dev.db")
  })

  it("bootstraps better-auth and Todo tables on startup", async () => {
    process.env.DATABASE_URL = "file:./custom-dev.db"

    const prismaModule = await import("../../../app/lib/prisma.js")

    expect(databaseConstructorMock).toHaveBeenCalledWith("./custom-dev.db")
    expect(databaseExecMock).toHaveBeenCalledWith(
      prismaModule.localDevBootstrapSql,
    )
    expect(prismaModule.localDevBootstrapSql).toContain(
      'CREATE TABLE IF NOT EXISTS "user"',
    )
    expect(prismaModule.localDevBootstrapSql).toContain(
      'CREATE TABLE IF NOT EXISTS "Todo"',
    )
  })
})
