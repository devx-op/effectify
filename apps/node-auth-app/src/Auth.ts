import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

export const handler = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: new Database('./sqlite.db') as any,
})
