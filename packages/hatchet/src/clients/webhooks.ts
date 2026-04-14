/**
 * @effectify/hatchet - Webhooks Client
 *
 * Effect-first wrappers around the Hatchet SDK webhooks surface.
 */

import * as Effect from "effect/Effect"
import type { WebhooksClient } from "@hatchet-dev/typescript-sdk"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetWebhookError } from "../core/error.js"

/**
 * Type audit:
 * - Webhook enum/string unions are derived from SDK enums to avoid local shadow values.
 * - `ListWebhooksOptions` and `UpdateWebhookOptions` derive from SDK request contracts.
 * - `CreateWebhookOptions` / `HatchetWebhookAuth` stay custom because they hide the nested transport `auth` payload behind a flatter public boundary.
 * - `HatchetWebhookRecord` stays custom because normalization guarantees required fields.
 */

type HatchetWebhook = Awaited<ReturnType<WebhooksClient["get"]>>
type HatchetWebhookList = Awaited<ReturnType<WebhooksClient["list"]>>
type SdkCreateWebhookRequest = Parameters<WebhooksClient["create"]>[0]
type SdkWebhookAuth = SdkCreateWebhookRequest["auth"]
type SdkWebhookHmacAuth = Extract<
  SdkWebhookAuth,
  { readonly algorithm: unknown; readonly encoding: unknown }
>

export type HatchetWebhookSourceName = NonNullable<
  HatchetWebhook["sourceName"]
>

export type HatchetWebhookAuthType = NonNullable<HatchetWebhook["authType"]>

export type HatchetWebhookHmacAlgorithm = SdkWebhookHmacAuth["algorithm"]

export type HatchetWebhookHmacEncoding = SdkWebhookHmacAuth["encoding"]

export type HatchetWebhookAuth =
  | {
    readonly authType: "BASIC"
    readonly username: string
    readonly password: string
  }
  | {
    readonly authType: "API_KEY"
    readonly headerName: string
    readonly apiKey: string
  }
  | {
    readonly authType: "HMAC"
    readonly algorithm: HatchetWebhookHmacAlgorithm
    readonly encoding: HatchetWebhookHmacEncoding
    readonly signatureHeaderName: string
    readonly signingSecret: string
  }

export interface HatchetWebhookRecord {
  readonly webhookId: string
  readonly tenantId: string
  readonly name: string
  readonly sourceName: HatchetWebhookSourceName
  readonly eventKeyExpression: string
  readonly scopeExpression?: string
  readonly staticPayload?: Record<string, unknown>
  readonly authType: HatchetWebhookAuthType
}

type SdkListWebhooksOptions = NonNullable<
  Parameters<WebhooksClient["list"]>[0]
>

export type ListWebhooksOptions =
  & Omit<
    SdkListWebhooksOptions,
    "sourceNames"
  >
  & {
    readonly sourceNames?: readonly HatchetWebhookSourceName[]
  }

export type CreateWebhookOptions =
  & Omit<
    SdkCreateWebhookRequest,
    "authType" | "auth" | "sourceName"
  >
  & {
    readonly sourceName: HatchetWebhookSourceName
    readonly auth: HatchetWebhookAuth
  }

export type UpdateWebhookOptions = NonNullable<
  Parameters<WebhooksClient["update"]>[1]
>

type WebhookOperation = "list" | "get" | "create" | "update" | "delete"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const failMissingField = (
  field: string,
  context: {
    readonly operation: WebhookOperation
    readonly webhookName?: string
  },
) =>
  new HatchetWebhookError({
    message: `Webhook response did not include ${field}`,
    operation: context.operation,
    webhookName: context.webhookName,
  })

const normalizeWebhook = (
  webhook: HatchetWebhook,
  context: {
    readonly operation: WebhookOperation
    readonly webhookName?: string
  },
): Effect.Effect<HatchetWebhookRecord, HatchetWebhookError> =>
  Effect.gen(function*() {
    const webhookId = webhook.metadata?.id

    if (!webhookId) {
      return yield* failMissingField("metadata.id", context)
    }

    if (!webhook.tenantId) {
      return yield* failMissingField("tenantId", context)
    }

    if (!webhook.name) {
      return yield* failMissingField("name", context)
    }

    if (!webhook.sourceName) {
      return yield* failMissingField("sourceName", context)
    }

    if (!webhook.eventKeyExpression) {
      return yield* failMissingField("eventKeyExpression", context)
    }

    if (!webhook.authType) {
      return yield* failMissingField("authType", context)
    }

    return {
      webhookId,
      tenantId: webhook.tenantId,
      name: webhook.name,
      sourceName: webhook.sourceName,
      eventKeyExpression: webhook.eventKeyExpression,
      scopeExpression: webhook.scopeExpression,
      staticPayload: isRecord(webhook.staticPayload)
        ? webhook.staticPayload
        : undefined,
      authType: webhook.authType,
    }
  })

const toSdkCreateWebhookOptions = (
  options: CreateWebhookOptions,
): SdkCreateWebhookRequest => {
  switch (options.auth.authType) {
    case "BASIC":
      return {
        name: options.name,
        sourceName: options.sourceName,
        eventKeyExpression: options.eventKeyExpression,
        scopeExpression: options.scopeExpression,
        staticPayload: options.staticPayload,
        authType: options.auth.authType,
        auth: {
          username: options.auth.username,
          password: options.auth.password,
        },
      } as SdkCreateWebhookRequest
    case "API_KEY":
      return {
        name: options.name,
        sourceName: options.sourceName,
        eventKeyExpression: options.eventKeyExpression,
        scopeExpression: options.scopeExpression,
        staticPayload: options.staticPayload,
        authType: options.auth.authType,
        auth: {
          headerName: options.auth.headerName,
          apiKey: options.auth.apiKey,
        },
      } as SdkCreateWebhookRequest
    case "HMAC":
      return {
        name: options.name,
        sourceName: options.sourceName,
        eventKeyExpression: options.eventKeyExpression,
        scopeExpression: options.scopeExpression,
        staticPayload: options.staticPayload,
        authType: options.auth.authType,
        auth: {
          algorithm: options.auth.algorithm,
          encoding: options.auth.encoding,
          signatureHeaderName: options.auth.signatureHeaderName,
          signingSecret: options.auth.signingSecret,
        },
      } as SdkCreateWebhookRequest
  }

  return options as never
}

export const listWebhooks = (
  options?: ListWebhooksOptions,
): Effect.Effect<
  readonly HatchetWebhookRecord[],
  HatchetWebhookError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const query = options
      ? ({
        limit: options.limit,
        offset: options.offset,
        webhookNames: options.webhookNames
          ? [...options.webhookNames]
          : undefined,
        sourceNames: options.sourceNames
          ? [...options.sourceNames]
          : undefined,
      } as Parameters<typeof client.webhooks.list>[0])
      : undefined
    const response = yield* Effect.tryPromise({
      try: () => client.webhooks.list(query),
      catch: (cause) =>
        new HatchetWebhookError({
          message: "Failed to list webhooks",
          operation: "list",
          cause,
        }),
    })

    return yield* Effect.forEach(
      (response as HatchetWebhookList).rows ?? [],
      (webhook) =>
        normalizeWebhook(webhook, {
          operation: "list",
          webhookName: webhook.name,
        }),
    )
  })

export const getWebhook = (
  webhookName: string,
): Effect.Effect<
  HatchetWebhookRecord,
  HatchetWebhookError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const webhook = yield* Effect.tryPromise({
      try: () => client.webhooks.get(webhookName),
      catch: (cause) =>
        new HatchetWebhookError({
          message: `Failed to get webhook "${webhookName}"`,
          operation: "get",
          webhookName,
          cause,
        }),
    })

    return yield* normalizeWebhook(webhook as HatchetWebhook, {
      operation: "get",
      webhookName,
    })
  })

export const createWebhook = (
  options: CreateWebhookOptions,
): Effect.Effect<
  HatchetWebhookRecord,
  HatchetWebhookError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const request = toSdkCreateWebhookOptions(options) as Parameters<
      typeof client.webhooks.create
    >[0]
    const webhook = yield* Effect.tryPromise({
      try: () => client.webhooks.create(request),
      catch: (cause) =>
        new HatchetWebhookError({
          message: `Failed to create webhook "${options.name}"`,
          operation: "create",
          webhookName: options.name,
          cause,
        }),
    })

    return yield* normalizeWebhook(webhook as HatchetWebhook, {
      operation: "create",
      webhookName: options.name,
    })
  })

export const updateWebhook = (
  webhookName: string,
  options: UpdateWebhookOptions,
): Effect.Effect<
  HatchetWebhookRecord,
  HatchetWebhookError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const webhook = yield* Effect.tryPromise({
      try: () => client.webhooks.update(webhookName, options),
      catch: (cause) =>
        new HatchetWebhookError({
          message: `Failed to update webhook "${webhookName}"`,
          operation: "update",
          webhookName,
          cause,
        }),
    })

    return yield* normalizeWebhook(webhook as HatchetWebhook, {
      operation: "update",
      webhookName,
    })
  })

export const deleteWebhook = (
  webhookName: string,
): Effect.Effect<void, HatchetWebhookError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    yield* Effect.tryPromise({
      try: () => client.webhooks.delete(webhookName),
      catch: (cause) =>
        new HatchetWebhookError({
          message: `Failed to delete webhook "${webhookName}"`,
          operation: "delete",
          webhookName,
          cause,
        }),
    })
  })
