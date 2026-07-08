import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import type { HatchetRateLimitRecord } from "@effectify/hatchet"
import { Form, useActionData, useLoaderData } from "react-router"
import { loadHatchetModule } from "../../../lib/hatchet/module.js"
import { parseRateLimitDuration, rateLimitDurationOptions, readRequestFormData } from "../../../lib/hatchet/parsers.js"
import { readSelectedRateLimitKey } from "../../../lib/hatchet/params.js"
import { buildRateLimitRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.route.js"

export interface HatchetDemoRateLimitsSectionProps {
  readonly actionError?: string
  readonly selectedRateLimitKey?: string
  readonly ratelimits: readonly HatchetRateLimitRecord[]
}

export const HatchetDemoRateLimitsSection = ({
  actionError,
  selectedRateLimitKey,
  ratelimits,
}: HatchetDemoRateLimitsSectionProps) => {
  const selectedRateLimit = selectedRateLimitKey
    ? ratelimits.find((ratelimit) => ratelimit.key === selectedRateLimitKey)
    : undefined

  return (
    <>
      <section>
        <h3>Upsert Rate Limit</h3>
        <Form method="post">
          <fieldset>
            <label htmlFor="rateLimitKey">Rate Limit Key</label>
            <input
              id="rateLimitKey"
              name="rateLimitKey"
              type="text"
              required
              defaultValue="email:send"
            />
            <label htmlFor="rateLimitLimit">Limit</label>
            <input
              id="rateLimitLimit"
              name="rateLimitLimit"
              type="number"
              required
              min={1}
              defaultValue={15}
            />
            <label htmlFor="rateLimitDuration">Duration</label>
            <select
              id="rateLimitDuration"
              name="rateLimitDuration"
              defaultValue={rateLimitDurationOptions[1].value}
            >
              {rateLimitDurationOptions.map((duration) => (
                <option key={duration.label} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </fieldset>
          <input type="hidden" name="intent" value="upsert-ratelimit" />
          {actionError ? <small role="alert">{actionError}</small> : null}
          <button type="submit">Upsert Rate Limit</button>
        </Form>
      </section>

      <section>
        <h3>Selected Rate Limit</h3>
        {selectedRateLimit ?
          (
            <div>
              <p>
                <strong>Key:</strong> {selectedRateLimit.key}
              </p>
              <p>
                <strong>Window:</strong> {selectedRateLimit.window}
              </p>
              <p>
                <strong>Usage:</strong> {selectedRateLimit.value} / {selectedRateLimit.limitValue}
              </p>
              <p>
                <strong>Last Refill:</strong> {selectedRateLimit.lastRefill}
              </p>
            </div>
          ) :
          <p>Upsert a rate limit to inspect it here.</p>}
      </section>

      <section>
        <h3>Current Rate Limits</h3>
        {ratelimits.length === 0 ? <p>No rate limits found. Upsert one to see it here.</p> : (
          <ul>
            {ratelimits.map((ratelimit) => (
              <li key={ratelimit.key}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{ratelimit.key}</strong>
                    <span>—</span>
                    <span>{ratelimit.window}</span>
                    <span>—</span>
                    <span>
                      {ratelimit.value} / {ratelimit.limitValue}
                    </span>
                  </div>
                  <Form method="get">
                    <input
                      type="hidden"
                      name="rateLimitKey"
                      value={ratelimit.key}
                    />
                    <button type="submit">View</button>
                  </Form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

const getActionError = (actionData: unknown): string | undefined => {
  if (
    actionData &&
    typeof actionData === "object" &&
    "ok" in actionData &&
    actionData.ok === false &&
    "errors" in actionData &&
    Array.isArray(actionData.errors) &&
    actionData.errors.length > 0
  ) {
    return String(actionData.errors[0])
  }
  return undefined
}

export const loadRateLimits = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const selectedRateLimitKey = readSelectedRateLimitKey(request.url)
    const ratelimits = yield* hatchet.listRateLimits()
    return yield* httpSuccess({ ratelimits, selectedRateLimitKey })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadRateLimits(request)
}).pipe(withLoaderEffect)

export const handleRateLimitsAction = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")
    if (intent !== "upsert-ratelimit") {
      return yield* httpFailure("Unknown intent")
    }

    const rateLimitKey = String(formData.get("rateLimitKey") ?? "").trim()
    const limitInput = String(formData.get("rateLimitLimit") ?? "").trim()
    const durationInput = String(
      formData.get("rateLimitDuration") ?? "",
    ).trim()
    if (!rateLimitKey) return yield* httpFailure("Rate limit key is required")

    const limit = Number(limitInput)
    if (!Number.isInteger(limit) || limit < 1) {
      return yield* httpFailure("Rate limit limit must be a positive integer")
    }

    let duration: ReturnType<typeof parseRateLimitDuration> | undefined
    try {
      duration = durationInput
        ? parseRateLimitDuration(durationInput)
        : undefined
    } catch (error) {
      return yield* httpFailure(
        error instanceof Error ? error.message : "Invalid rate limit duration",
      )
    }

    const key = yield* hatchet.upsertRateLimit({ key: rateLimitKey, limit, duration })
    return yield* httpRedirect(buildRateLimitRedirect(key))
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleRateLimitsAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoRateLimitsRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if (!loaderData.ok) return <p>Loading...</p>
  return (
    <HatchetDemoRateLimitsSection
      actionError={getActionError(actionData)}
      selectedRateLimitKey={loaderData.data.selectedRateLimitKey}
      ratelimits={loaderData.data.ratelimits}
    />
  )
}
