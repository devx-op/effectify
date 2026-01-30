// import { dirname, join } from 'node:path'
// import { fileURLToPath } from 'node:url'

import { betterAuth } from "better-auth"
import { openAPI } from "better-auth/plugins"
import type { BetterAuthOptions } from "better-auth/types"
// import Database from 'better-sqlite3'
import { pool } from "./prisma.js"

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = dirname(__filename)

export const authOptions = {
  baseURL: "http://localhost:3000",
  secret: "hola",
  emailAndPassword: {
    enabled: true,
  },
  // database: new Database(join(__dirname, '../sqlite.db')),
  database: pool,

  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax" as const,
      secure: false,
      path: "/",
    },
    cookies: {
      session_token: {
        attributes: {
          sameSite: "lax" as const,
          secure: false,
          path: "/",
        },
      },
    },
  },
  plugins: [openAPI()],
} satisfies BetterAuthOptions

export const auth = betterAuth(authOptions)
