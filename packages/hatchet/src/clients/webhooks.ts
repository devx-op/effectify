/**
 * @effectify/hatchet - Webhooks Client
 *
 * Effect-first wrappers around the Hatchet SDK webhooks surface.
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetWebhookError } from "../core/error.js"

interface WebhookMetadata {
  readonly id?: string
}

interface HatchetWebhook {
  readonly metadata?: WebhookMetadata
  readonly tenantId?: string
  readonly name?: string
  readonly sourceName?: HatchetWebhookSourceName
  readonly eventKeyExpression?: string
  readonly scopeExpression?: string
  readonly staticPayload?: unknown
  readonly authType?: HatchetWebhookAuthType
}

interface HatchetWebhookList {
  readonly rows?: readonly HatchetWebhook[]
}

export type HatchetWebhookSourceName =
  | "GENERIC"
  | "GITHUB"
  | "STRIPE"
  | "SLACK"
  | "LINEAR"
  | "SVIX"

export type HatchetWebhookAuthType = "BASIC" | "API_KEY" | "HMAC"

export type HatchetWebhookHmacAlgorithm = "SHA1" | "SHA256" | "SHA512" | "MD5"

export type HatchetWebhookHmacEncoding = "HEX" | "BASE64" | "BASE64URL"

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

export interface ListWebhooksOptions {
  readonly limit?: number
  readonly offset?: number
  readonly webhookNames?: readonly string[]
  readonly sourceNames?: readonly HatchetWebhookSourceName[]
}

export interface CreateWebhookOptions {
  readonly name: string
  readonly sourceName: HatchetWebhookSourceName
  readonly eventKeyExpression: string
  readonly scopeExpression?: string
  readonly staticPayload?: Record<string, unknown>
  readonly auth: HatchetWebhookAuth
}

export interface UpdateWebhookOptions {
  readonly eventKeyExpression?: string
  readonly scopeExpression?: string
  readonly staticPayload?: Record<string, unknown>
}

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
      return yield* Effect.fail(failMissingField("metadata.id", context))
    }

    if (!webhook.tenantId) {
      return yield* Effect.fail(failMissingField("tenantId", context))
    }

    if (!webhook.name) {
      return yield* Effect.fail(failMissingField("name", context))
    }

    if (!webhook.sourceName) {
      return yield* Effect.fail(failMissingField("sourceName", context))
    }

    if (!webhook.eventKeyExpression) {
      return yield* Effect.fail(
        failMissingField("eventKeyExpression", context),
      )
    }

    if (!webhook.authType) {
      return yield* Effect.fail(failMissingField("authType", context))
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

const toSdkCreateWebhookOptions = (options: CreateWebhookOptions) => {
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
      }
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
      }
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
      }
  }
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
