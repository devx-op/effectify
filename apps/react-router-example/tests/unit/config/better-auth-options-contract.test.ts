import { readFile } from "node:fs/promises"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { authOptionsConfig } from "../../../app/lib/better-auth-options.server.js"

const withConfig = (values: Record<string, string>) =>
  authOptionsConfig.pipe(
    Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(values))),
  )

describe("Better Auth Effect configuration", () => {
  it("rejects a missing secret without rendering supplied secret material", async () => {
    const suppliedSecret = "missing-secret-must-not-appear"
    const error = await Effect.runPromise(withConfig({}).pipe(Effect.flip))

    expect(String(error)).not.toContain(suppliedSecret)
    expect(JSON.stringify(error)).not.toContain(suppliedSecret)
  })

  it("rejects a whitespace-only secret without rendering it", async () => {
    const suppliedSecret = " \t\n "
    const error = await Effect.runPromise(
      withConfig({ BETTER_AUTH_SECRET: suppliedSecret }).pipe(Effect.flip),
    )

    expect(String(error)).not.toContain(suppliedSecret)
    expect(JSON.stringify(error)).not.toContain(suppliedSecret)
  })

  it("passes a valid secret only to the Better Auth options boundary and preserves the URL", async () => {
    const suppliedSecret = "valid-secret-sentinel"
    const options = await Effect.runPromise(
      withConfig({ BETTER_AUTH_SECRET: suppliedSecret }),
    )

    expect(options.secret).toBe(suppliedSecret)
    expect(options.baseURL).toBe(
      process.env.BETTER_AUTH_URL ?? "http://localhost:4200",
    )
    expect(JSON.stringify({ baseURL: options.baseURL })).not.toContain(
      suppliedSecret,
    )
  })
})

describe("Hatchet run README contract", () => {
  it("documents the required local Better Auth secret setup", async () => {
    const readme = await readFile(
      new URL("../../../README.md", import.meta.url),
      "utf8",
    )

    expect(readme).toContain(
      'export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"',
    )
    expect(readme).toContain("Do not commit the generated value.")
  })

  it("documents the current authenticated asynchronous acceptance route", async () => {
    const readme = await readFile(
      new URL("../../../README.md", import.meta.url),
      "utf8",
    )

    expect(readme).toContain("Sign in first")
    expect(readme).toContain(
      "cookie: better-auth.session_token=<session-cookie>",
    )
    expect(readme).toContain("202 Accepted")
    expect(readme).toContain('{ "ok": true, "runId": "..." }')
    expect(readme).toContain("does not await workflow output")
    expect(readme).toContain("safe `400`")
    expect(readme).not.toContain("awaits the registered worker")
    expect(readme).not.toContain('{ "greeting": "Hello, Ada!" }')
  })
})
