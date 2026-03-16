import "dotenv/config"
import Database from "better-sqlite3"

const connectionString = process.env.DATABASE_URL
if (!connectionString || connectionString.trim().length === 0) {
  throw new Error("Missing DATABASE_URL environment variable")
}

const dbPath = connectionString.replace("file:", "")
export const database = new Database(dbPath)
