import "dotenv/config"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import Database from "better-sqlite3"
import { PrismaClient } from "../../prisma/generated/client.js"

const connectionString = process.env.DATABASE_URL
if (!connectionString || connectionString.trim().length === 0) {
  throw new Error("Missing DATABASE_URL environment variable")
}

// better-sqlite3 expects just the file path, not the full connection string
const dbPath = connectionString.replace("file:", "")
export const database: Database.Database = new Database(dbPath)
const adapter = new PrismaBetterSqlite3(database)
const prisma = new PrismaClient({ adapter })

export { adapter, prisma }
