import { betterAuth } from "better-auth"
import { database } from "./database.js"

export const auth = betterAuth({
  baseURL: "http://localhost:3001",
  emailAndPassword: {
    enabled: true,
  },
  database: database as any,
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001"],
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
          domain: undefined, // dejar que el browser maneje el dominio
        },
      },
    },
  },
})
