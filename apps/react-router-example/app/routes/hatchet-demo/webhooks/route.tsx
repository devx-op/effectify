import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import type { HatchetWebhookRecord } from "@effectify/hatchet"
import { Form, useActionData, useLoaderData } from "react-router"
import {
  parseWebhookAuth,
  parseWebhookSourceName,
  parseWebhookStaticPayload,
  readRequestFormData,
} from "../../../lib/hatchet/parsers.js"
import { loadHatchetModule } from "../../../lib/hatchet/module.js"
import { readSelectedWebhookName } from "../../../lib/hatchet/params.js"
import { buildWebhookRedirect } from "../../../lib/hatchet/redirects.js"
import { withActionEffect, withLoaderEffect } from "../../../lib/runtime.route.js"

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
      <Form method="post">
        <fieldset>
          <label htmlFor="webhookName">Webhook Name</label>
          <input
            id="webhookName"
            name="webhookName"
            type="text"
            required
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
            defaultValue="body.action"
          />
          <label htmlFor="webhookScopeExpression">Scope Expression</label>
          <input
            id="webhookScopeExpression"
            name="webhookScopeExpression"
            type="text"
            defaultValue="body.repository.full_name"
          />
          <label htmlFor="webhookStaticPayload">
            Static Payload (JSON object)
          </label>
          <textarea
            id="webhookStaticPayload"
            name="webhookStaticPayload"
            rows={3}
            defaultValue='{"issue": "opened"}'
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
          <input id="webhookUsername" name="webhookUsername" type="text" />
          <label htmlFor="webhookPassword">Basic Password</label>
          <input id="webhookPassword" name="webhookPassword" type="password" />
          <label htmlFor="webhookHeaderName">API Key Header</label>
          <input id="webhookHeaderName" name="webhookHeaderName" type="text" />
          <label htmlFor="webhookApiKey">API Key</label>
          <input id="webhookApiKey" name="webhookApiKey" type="password" />
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
            defaultValue="x-hub-signature-256"
          />
          <label htmlFor="webhookSigningSecret">Signing Secret</label>
          <input
            id="webhookSigningSecret"
            name="webhookSigningSecret"
            type="password"
            defaultValue="secret-123"
          />
        </fieldset>
        <input type="hidden" name="intent" value="create-webhook" />
        {actionError ? <small role="alert">{actionError}</small> : null}
        <button type="submit">Create Webhook</button>
      </Form>
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
                <Form method="get">
                  <input
                    type="hidden"
                    name="webhookName"
                    value={listedWebhook.name}
                  />
                  <button type="submit">View</button>
                </Form>
                <Form method="post">
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
                </Form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
)

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

export const loadWebhooks = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const selectedWebhookName = readSelectedWebhookName(request.url)
    const webhooks = yield* hatchet.listWebhooks()
    const webhook = selectedWebhookName
      ? yield* hatchet.getWebhook(selectedWebhookName)
      : undefined
    return yield* httpSuccess({ webhooks, webhook })
  })

export const loader = Effect.gen(function*() {
  const { request } = yield* LoaderArgsContext
  return yield* loadWebhooks(request)
}).pipe(withLoaderEffect)

export const handleWebhooksAction = (request: Request) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const formData = yield* readRequestFormData(request)
    const intent = String(formData.get("intent") ?? "")

    if (intent === "create-webhook") {
      const webhookName = String(formData.get("webhookName") ?? "").trim()
      const eventKeyExpression = String(
        formData.get("webhookEventKeyExpression") ?? "",
      ).trim()
      const scopeExpression = String(
        formData.get("webhookScopeExpression") ?? "",
      ).trim()
      const staticPayloadInput = String(
        formData.get("webhookStaticPayload") ?? "",
      )
      if (!webhookName) return yield* httpFailure("Webhook name is required")
      if (!eventKeyExpression) {
        return yield* httpFailure("Webhook event key expression is required")
      }

      let sourceName: ReturnType<typeof parseWebhookSourceName>
      let auth: ReturnType<typeof parseWebhookAuth>
      let staticPayload: ReturnType<typeof parseWebhookStaticPayload>
      try {
        sourceName = parseWebhookSourceName(
          String(formData.get("webhookSourceName") ?? ""),
        )
        auth = parseWebhookAuth(formData)
        staticPayload = parseWebhookStaticPayload(staticPayloadInput)
      } catch (error) {
        return yield* httpFailure(
          error instanceof Error ? error.message : "Invalid webhook form",
        )
      }

      const webhook = yield* hatchet.createWebhook({
        name: webhookName,
        sourceName,
        eventKeyExpression,
        scopeExpression: scopeExpression || undefined,
        staticPayload,
        auth,
      })
      return yield* httpRedirect(buildWebhookRedirect(webhook.name))
    }

    if (intent === "delete-webhook") {
      const webhookName = String(formData.get("webhookName") ?? "").trim()
      if (!webhookName) return yield* httpFailure("Webhook name is required")
      yield* hatchet.deleteWebhook(webhookName)
      return yield* httpRedirect("/hatchet-demo/webhooks")
    }

    return yield* httpFailure("Unknown intent")
  })

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  return yield* handleWebhooksAction(request)
}).pipe(withActionEffect)

export default function HatchetDemoWebhooksRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if (!loaderData.ok) return <p>Loading...</p>
  return (
    <HatchetDemoWebhooksSection
      actionError={getActionError(actionData)}
      webhook={loaderData.data.webhook}
      webhooks={loaderData.data.webhooks}
    />
  )
}
