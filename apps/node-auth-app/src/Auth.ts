import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: new Database(path.join(__dirname, '../sqlite.db')) as any,
  trustedOrigins: ['http://localhost:3000'],
})
