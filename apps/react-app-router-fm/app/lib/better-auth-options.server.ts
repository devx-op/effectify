import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BetterAuthOptions } from 'better-auth/types'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const authOptions = {
  baseURL: 'http://localhost:3000',
  secret: 'hola',
  emailAndPassword: {
    enabled: true,
  },
  database: new Database(join(__dirname, '../sqlite.db')),

  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax' as const,
      secure: false,
      path: '/',
    },
    cookies: {
      session_token: {
        attributes: {
          sameSite: 'lax' as const,
          secure: false,
          path: '/',
        },
      },
    },
  },
} satisfies BetterAuthOptions
