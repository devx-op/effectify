import { openAPI } from "better-auth/plugins"
import type { BetterAuthOptions } from "better-auth/types"
import type Database from "better-sqlite3"
import * as Config from "effect/Config"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { database } from "./prisma.js"

const defaultBetterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:4200"

export const authOptionsConfig = Config.redacted("BETTER_AUTH_SECRET").pipe(
  Effect.filterOrFail(
    (secret) => Redacted.value(secret).trim().length > 0,
    () =>
      new Config.ConfigError(
        new ConfigProvider.SourceError({
          message: "BETTER_AUTH_SECRET must be non-blank",
        }),
      ),
  ),
  Effect.map(
    (secret) =>
      ({
        baseURL: defaultBetterAuthUrl,
        secret: Redacted.value(secret),
        emailAndPassword: { enabled: true },
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
      }) satisfies BetterAuthOptions,
  ),
)
