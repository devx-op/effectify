import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: new Database('./sqlite.db') as any,
  trustedOrigins: ['http://localhost:3000'],
})
