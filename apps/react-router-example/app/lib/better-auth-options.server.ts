import { betterAuth } from "better-auth"
import { openAPI } from "better-auth/plugins"
import type { BetterAuthOptions } from "better-auth/types"
import type Database from "better-sqlite3"
import { database } from "./prisma.js"

const defaultBetterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:4200"

export const authOptions = {
  baseURL: defaultBetterAuthUrl,
  secret: "hola",
  emailAndPassword: {
    enabled: true,
  },
  database: database as Database.Database,

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
