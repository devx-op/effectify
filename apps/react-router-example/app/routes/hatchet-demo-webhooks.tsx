import { type HatchetWebhookRecord } from "@effectify/hatchet"

export interface HatchetDemoWebhooksSectionProps {
  readonly actionError?: string
  readonly webhook?: HatchetWebhookRecord
  readonly webhooks: readonly HatchetWebhookRecord[]
}

export const HatchetDemoWebhooksSection = ({
  actionError,
  webhook,
  webhooks,
}: HatchetDemoWebhooksSectionProps) => (
  <>
    <section>
      <h3>Create Webhook</h3>
      <form method="post">
        <fieldset>
          <label htmlFor="webhookName">Webhook Name</label>
          <input
            id="webhookName"
            name="webhookName"
            type="text"
            required
            placeholder="e.g., github-prs"
            defaultValue="github-prs"
          />
          <label htmlFor="webhookSourceName">Source</label>
          <select
            id="webhookSourceName"
            name="webhookSourceName"
            defaultValue="GITHUB"
          >
            <option value="GENERIC">GENERIC</option>
            <option value="GITHUB">GITHUB</option>
            <option value="STRIPE">STRIPE</option>
            <option value="SLACK">SLACK</option>
            <option value="LINEAR">LINEAR</option>
            <option value="SVIX">SVIX</option>
          </select>
          <label htmlFor="webhookEventKeyExpression">
            Event Key Expression
          </label>
          <input
            id="webhookEventKeyExpression"
            name="webhookEventKeyExpression"
            type="text"
            required
            placeholder="body.action"
            defaultValue="body.action"
          />
          <label htmlFor="webhookScopeExpression">Scope Expression</label>
          <input
            id="webhookScopeExpression"
            name="webhookScopeExpression"
            type="text"
            placeholder="body.repository.full_name"
            defaultValue="body.repository.full_name"
          />
          <label htmlFor="webhookStaticPayload">
            Static Payload (JSON object)
          </label>
          <textarea
            id="webhookStaticPayload"
            name="webhookStaticPayload"
            placeholder='{"issue": "opened"}'
            defaultValue='{"issue": "opened"}'
            rows={3}
          />
          <label htmlFor="webhookAuthType">Auth Type</label>
          <select
            id="webhookAuthType"
            name="webhookAuthType"
            defaultValue="HMAC"
          >
            <option value="BASIC">BASIC</option>
            <option value="API_KEY">API_KEY</option>
            <option value="HMAC">HMAC</option>
          </select>
          <label htmlFor="webhookUsername">Basic Username</label>
          <input
            id="webhookUsername"
            name="webhookUsername"
            type="text"
            placeholder="demo-user"
          />
          <label htmlFor="webhookPassword">Basic Password</label>
          <input
            id="webhookPassword"
            name="webhookPassword"
            type="password"
            placeholder="demo-pass"
          />
          <label htmlFor="webhookHeaderName">API Key Header</label>
          <input
            id="webhookHeaderName"
            name="webhookHeaderName"
            type="text"
            placeholder="x-api-key"
          />
          <label htmlFor="webhookApiKey">API Key</label>
          <input
            id="webhookApiKey"
            name="webhookApiKey"
            type="password"
            placeholder="key-123"
          />
          <label htmlFor="webhookHmacAlgorithm">HMAC Algorithm</label>
          <select
            id="webhookHmacAlgorithm"
            name="webhookHmacAlgorithm"
            defaultValue="SHA256"
          >
            <option value="SHA1">SHA1</option>
            <option value="SHA256">SHA256</option>
            <option value="SHA512">SHA512</option>
            <option value="MD5">MD5</option>
          </select>
          <label htmlFor="webhookHmacEncoding">HMAC Encoding</label>
          <select
            id="webhookHmacEncoding"
            name="webhookHmacEncoding"
            defaultValue="HEX"
          >
            <option value="HEX">HEX</option>
            <option value="BASE64">BASE64</option>
            <option value="BASE64URL">BASE64URL</option>
          </select>
          <label htmlFor="webhookSignatureHeaderName">Signature Header</label>
          <input
            id="webhookSignatureHeaderName"
            name="webhookSignatureHeaderName"
            type="text"
            placeholder="x-hub-signature-256"
            defaultValue="x-hub-signature-256"
          />
          <label htmlFor="webhookSigningSecret">Signing Secret</label>
          <input
            id="webhookSigningSecret"
            name="webhookSigningSecret"
            type="password"
            placeholder="secret-123"
            defaultValue="secret-123"
          />
        </fieldset>
        <input type="hidden" name="intent" value="create-webhook" />
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
        <button type="submit">Create Webhook</button>
      </form>
    </section>

    <section>
      <h3>Selected Webhook</h3>
      {webhook ?
        (
          <div>
            <p>
              <strong>Webhook ID:</strong> {webhook.webhookId}
            </p>
            <p>
              <strong>Name:</strong> {webhook.name}
            </p>
            <p>
              <strong>Source:</strong> {webhook.sourceName}
            </p>
            <p>
              <strong>Auth Type:</strong> {webhook.authType}
            </p>
            <p>
              <strong>Event Key:</strong> {webhook.eventKeyExpression}
            </p>
            <p>
              <strong>Scope:</strong> {webhook.scopeExpression ?? "—"}
            </p>
            <pre>{JSON.stringify(webhook.staticPayload ?? {}, null, 2)}</pre>
          </div>
        ) :
        <p>Create a webhook to inspect it here.</p>}
    </section>

    <section>
      <h3>Incoming Webhooks</h3>
      {webhooks.length === 0 ? <p>No webhooks found. Create one to see it here.</p> : (
        <ul>
          {webhooks.map((listedWebhook) => (
            <li key={listedWebhook.webhookId}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>{listedWebhook.name}</strong>
                  <span>—</span>
                  <span>{listedWebhook.sourceName}</span>
                </div>
                <form method="get">
                  <input
                    type="hidden"
                    name="webhookName"
                    value={listedWebhook.name}
                  />
                  <button type="submit">View</button>
                </form>
                <form method="post">
                  <input type="hidden" name="intent" value="delete-webhook" />
                  <input
                    type="hidden"
                    name="webhookName"
                    value={listedWebhook.name}
                  />
                  <button
                    type="submit"
                    aria-label={`Delete webhook ${listedWebhook.name}`}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
)
