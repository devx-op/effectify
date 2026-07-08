/**
 * @effectify/hatchet - Webhooks Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  type HatchetWebhookRecord,
  listWebhooks,
  updateWebhook,
} from "../../../src/clients/webhooks.js"
import * as publicApi from "../../../src/index.js"
import { HatchetWebhookError } from "../../../src/core/error.js"
import {
  createMockHatchetClient,
  createMockHatchetClientLayer,
  TestHatchetConfigLayer,
} from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Webhooks Client", () => {
  it("createWebhook normalizes SDK webhook responses through the public API", async () => {
    const staticPayload = { issue: "opened" }

    const result = await publicApi
      .createWebhook({
        name: "github-prs",
        sourceName: "GITHUB",
        eventKeyExpression: "body.action",
        scopeExpression: "body.repository.full_name",
        staticPayload,
        auth: {
          authType: "HMAC",
          algorithm: "SHA256",
          encoding: "HEX",
          signatureHeaderName: "x-hub-signature-256",
          signingSecret: "secret-123",
        },
      })
      .pipe(
        provideHatchet(
          createMockHatchetClientLayer({
            webhooks: {
              create: async (options) => {
                expect(options).toEqual({
                  name: "github-prs",
                  sourceName: "GITHUB",
                  eventKeyExpression: "body.action",
                  scopeExpression: "body.repository.full_name",
                  staticPayload,
                  authType: "HMAC",
                  auth: {
                    algorithm: "SHA256",
                    encoding: "HEX",
                    signatureHeaderName: "x-hub-signature-256",
                    signingSecret: "secret-123",
                  },
                })

                return {
                  metadata: { id: "webhook-123" },
                  tenantId: "tenant-1",
                  name: "github-prs",
                  sourceName: "GITHUB",
                  eventKeyExpression: "body.action",
                  scopeExpression: "body.repository.full_name",
                  staticPayload,
                  authType: "HMAC",
                }
              },
            },
          }),
        ),
        Effect.runPromise,
      )

    expect(result).toEqual<HatchetWebhookRecord>({
      webhookId: "webhook-123",
      tenantId: "tenant-1",
      name: "github-prs",
      sourceName: "GITHUB",
      eventKeyExpression: "body.action",
      scopeExpression: "body.repository.full_name",
      staticPayload,
      authType: "HMAC",
    })
  })

  it("listWebhooks forwards filters and normalizes rows", async () => {
    const result = await listWebhooks({
      limit: 10,
      offset: 20,
      webhookNames: ["github-prs"],
      sourceNames: ["GITHUB"],
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            list: async (query) => {
              expect(query).toEqual({
                limit: 10,
                offset: 20,
                webhookNames: ["github-prs"],
                sourceNames: ["GITHUB"],
              })

              return {
                rows: [
                  {
                    metadata: { id: "webhook-1" },
                    tenantId: "tenant-1",
                    name: "github-prs",
                    sourceName: "GITHUB",
                    eventKeyExpression: "body.action",
                    scopeExpression: "body.repository.full_name",
                    staticPayload: { issue: "opened" },
                    authType: "HMAC",
                  },
                ],
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual([
      {
        webhookId: "webhook-1",
        tenantId: "tenant-1",
        name: "github-prs",
        sourceName: "GITHUB",
        eventKeyExpression: "body.action",
        scopeExpression: "body.repository.full_name",
        staticPayload: { issue: "opened" },
        authType: "HMAC",
      },
    ])
  })

  it("getWebhook and updateWebhook normalize details by webhook name", async () => {
    const created = await getWebhook("github-prs").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async (name) => {
              expect(name).toBe("github-prs")

              return {
                metadata: { id: "webhook-123" },
                tenantId: "tenant-1",
                name,
                sourceName: "GITHUB",
                eventKeyExpression: "body.action",
                authType: "HMAC",
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    const updated = await updateWebhook("github-prs", {
      eventKeyExpression: "body.issue.action",
      scopeExpression: "body.repository.full_name",
      staticPayload: { issue: "updated" },
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            update: async (name, options) => {
              expect(name).toBe("github-prs")
              expect(options).toEqual({
                eventKeyExpression: "body.issue.action",
                scopeExpression: "body.repository.full_name",
                staticPayload: { issue: "updated" },
              })

              return {
                metadata: { id: "webhook-123" },
                tenantId: "tenant-1",
                name,
                sourceName: "GITHUB",
                eventKeyExpression: "body.issue.action",
                scopeExpression: "body.repository.full_name",
                staticPayload: { issue: "updated" },
                authType: "HMAC",
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(created).toEqual({
      webhookId: "webhook-123",
      tenantId: "tenant-1",
      name: "github-prs",
      sourceName: "GITHUB",
      eventKeyExpression: "body.action",
      authType: "HMAC",
    })
    expect(updated).toEqual({
      webhookId: "webhook-123",
      tenantId: "tenant-1",
      name: "github-prs",
      sourceName: "GITHUB",
      eventKeyExpression: "body.issue.action",
      scopeExpression: "body.repository.full_name",
      staticPayload: { issue: "updated" },
      authType: "HMAC",
    })
  })

  it("deleteWebhook ignores the SDK response body and forwards the webhook name", async () => {
    await deleteWebhook("github-prs").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            delete: async (name) => {
              expect(name).toBe("github-prs")

              return {
                metadata: { id: "webhook-123" },
                tenantId: "tenant-1",
                name,
                sourceName: "GITHUB",
                eventKeyExpression: "body.action",
                authType: "HMAC",
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )
  })

  it("fails when normalization misses required webhook fields", async () => {
    const missingId = await createWebhook({
      name: "github-prs",
      sourceName: "GITHUB",
      eventKeyExpression: "body.action",
      auth: {
        authType: "API_KEY",
        headerName: "x-api-key",
        apiKey: "key-123",
      },
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            create: async () => ({
              metadata: {},
              tenantId: "tenant-1",
              name: "github-prs",
              sourceName: "GITHUB",
              eventKeyExpression: "body.action",
              authType: "API_KEY",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const missingTenant = await getWebhook("missing-tenant").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async () => ({
              metadata: { id: "webhook-tenant" },
              name: "missing-tenant",
              sourceName: "GITHUB",
              eventKeyExpression: "body.action",
              authType: "BASIC",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const missingName = await getWebhook("missing-name").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async () => ({
              metadata: { id: "webhook-name" },
              tenantId: "tenant-1",
              sourceName: "GITHUB",
              eventKeyExpression: "body.action",
              authType: "BASIC",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const missingSource = await getWebhook("missing-source").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async () => ({
              metadata: { id: "webhook-source" },
              tenantId: "tenant-1",
              name: "missing-source",
              eventKeyExpression: "body.action",
              authType: "BASIC",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const missingExpression = await getWebhook("missing-expression").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async () => ({
              metadata: { id: "webhook-expression" },
              tenantId: "tenant-1",
              name: "missing-expression",
              sourceName: "GITHUB",
              authType: "BASIC",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const missingAuthType = await getWebhook("missing-auth").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async () => ({
              metadata: { id: "webhook-auth" },
              tenantId: "tenant-1",
              name: "missing-auth",
              sourceName: "GITHUB",
              eventKeyExpression: "body.action",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(missingId._tag).toBe("Failure")
    expect(missingTenant._tag).toBe("Failure")
    expect(missingName._tag).toBe("Failure")
    expect(missingSource._tag).toBe("Failure")
    expect(missingExpression._tag).toBe("Failure")
    expect(missingAuthType._tag).toBe("Failure")

    if (missingId._tag === "Failure") {
      expect(Cause.squash(missingId.cause)).toMatchObject({
        _tag: "HatchetWebhookError",
        operation: "create",
        webhookName: "github-prs",
      })
    }

    if (missingTenant._tag === "Failure") {
      expect(Cause.squash(missingTenant.cause)).toMatchObject({
        _tag: "HatchetWebhookError",
        operation: "get",
        webhookName: "missing-tenant",
      })
    }
  })

  it("wraps SDK webhook failures with typed operation context", async () => {
    const createCause = new Error("create unavailable")
    const listCause = new Error("list unavailable")
    const getCause = new Error("get unavailable")
    const updateCause = new Error("update unavailable")
    const deleteCause = new Error("delete unavailable")

    const createExit = await createWebhook({
      name: "github-prs",
      sourceName: "GITHUB",
      eventKeyExpression: "body.action",
      auth: {
        authType: "BASIC",
        username: "user",
        password: "pass",
      },
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            create: async () => {
              throw createCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const listExit = await listWebhooks().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            list: async () => {
              throw listCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const getExit = await getWebhook("github-prs").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            get: async () => {
              throw getCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const updateExit = await updateWebhook("github-prs", {
      eventKeyExpression: "body.issue.action",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            update: async () => {
              throw updateCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const deleteExit = await deleteWebhook("github-prs").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          webhooks: {
            delete: async () => {
              throw deleteCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(createExit._tag).toBe("Failure")
    expect(listExit._tag).toBe("Failure")
    expect(getExit._tag).toBe("Failure")
    expect(updateExit._tag).toBe("Failure")
    expect(deleteExit._tag).toBe("Failure")

    if (createExit._tag === "Failure") {
      const error = Cause.squash(createExit.cause)
      expect(error).toBeInstanceOf(HatchetWebhookError)
      expect(error).toMatchObject({
        _tag: "HatchetWebhookError",
        operation: "create",
        webhookName: "github-prs",
        cause: createCause,
      })
    }

    if (updateExit._tag === "Failure") {
      expect(Cause.squash(updateExit.cause)).toMatchObject({
        _tag: "HatchetWebhookError",
        operation: "update",
        webhookName: "github-prs",
        cause: updateCause,
      })
    }
  })

  it("extends createMockHatchetClient with webhook overrides", async () => {
    const client = createMockHatchetClient({
      webhooks: {
        list: async () => ({ rows: [{ name: "github-prs" }] }),
        get: async (name) => ({ name }),
        create: async (options) => ({
          ...options,
          metadata: { id: "webhook-1" },
        }),
        update: async (name, options) => ({ name, ...options }),
        delete: async (name) => ({ name }),
      },
    })

    await expect(client.webhooks.list()).resolves.toEqual({
      rows: [{ name: "github-prs" }],
    })
    await expect(client.webhooks.get("github-prs")).resolves.toEqual({
      name: "github-prs",
    })
    await expect(
      client.webhooks.create({
        name: "github-prs",
        sourceName: "GITHUB",
        eventKeyExpression: "body.action",
        authType: "BASIC",
        auth: { username: "user", password: "pass" },
      }),
    ).resolves.toMatchObject({
      metadata: { id: "webhook-1" },
      name: "github-prs",
    })
    await expect(
      client.webhooks.update("github-prs", {
        scopeExpression: "body.repository.full_name",
      }),
    ).resolves.toEqual({
      name: "github-prs",
      scopeExpression: "body.repository.full_name",
    })
    await expect(client.webhooks.delete("github-prs")).resolves.toEqual({
      name: "github-prs",
    })
  })
})
