import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"
import path from "node:path"

const dbPath = path.join(__dirname, "../prisma/dev.db")
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`
})

export const prisma = new PrismaClient({ adapter })
