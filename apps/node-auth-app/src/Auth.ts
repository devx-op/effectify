import path from 'node:path'
import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: new Database(path.join(process.cwd(), 'sqlite.db')) as any,
  trustedOrigins: ['http://localhost:3000'],
})
