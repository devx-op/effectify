import { type HatchetRateLimitRecord } from "@effectify/hatchet"
import { rateLimitDurationOptions } from "./hatchet-demo.shared.js"

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
        <form method="post">
          <fieldset>
            <label htmlFor="rateLimitKey">Rate Limit Key</label>
            <input
              id="rateLimitKey"
              name="rateLimitKey"
              type="text"
              required
              placeholder="e.g., email:send"
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
          {actionError ?
            (
              <small
                role="alert"
                aria-live="assertive"
                style={{ color: "var(--pico-color-red-500)" }}
              >
                {actionError}
              </small>
            ) :
            null}
          <button type="submit">Upsert Rate Limit</button>
        </form>
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
                  <form method="get">
                    <input
                      type="hidden"
                      name="rateLimitKey"
                      value={ratelimit.key}
                    />
                    <button type="submit">View</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
