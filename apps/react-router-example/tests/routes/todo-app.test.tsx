// @vitest-environment jsdom

import { AuthService } from "@effectify/node-better-auth"
import { Runtime } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { RouterContextProvider, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

const repository = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}))

const makeRepository = vi.hoisted(() => vi.fn())

vi.mock("../../prisma/generated/effect/index.js", async () => {
  const Schema = await import("effect/Schema")
  return {
    TodoId: Schema.String,
    TodoModel: {},
  }
})

vi.mock("../../prisma/generated/effect/prisma-repository.js", () => ({
  make: makeRepository,
}))

vi.mock("@effectify/react-router-better-auth", async () => {
  const { AuthService } = await import("@effectify/node-better-auth")
  const withoutGuard = {
    with:
      () =>
      <A,>(effect: A): A =>
        effect,
  }

  return {
    AuthService,
    withBetterAuthGuard: withoutGuard,
    withBetterAuthGuardAction: withoutGuard,
  }
})

vi.mock("../../app/lib/runtime.server.js", () =>
  Runtime.make(
    Layer.succeed(AuthService.AuthContext, {
      session: { id: "session-1" },
      user: { id: "user-1", email: "todo@example.test" },
    }),
  ),
)

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()

  return {
    ...actual,
    Form: ({ children, ...props }: React.ComponentProps<"form">) => <form {...props}>{children}</form>,
    useActionData: () => undefined,
    useSubmit: () => vi.fn(),
  }
})

import TodoApp, { action, loader } from "../../app/routes/todo-app.js"

const todoUrl = new URL("https://example.test/todo-app")

const actionArgs = (fields: Record<string, string>): ActionFunctionArgs => ({
  context: new RouterContextProvider(),
  params: {},
  pattern: "/todo-app",
  request: new Request(todoUrl, {
    method: "POST",
    body: new URLSearchParams(fields),
  }),
  url: todoUrl,
})

const loaderArgs = (): LoaderFunctionArgs => ({
  context: new RouterContextProvider(),
  params: {},
  pattern: "/todo-app",
  request: new Request(todoUrl),
  url: todoUrl,
})

const expectResponse = async (result: Promise<unknown>) => {
  const response = await result.catch((error) => error)
  expect(response).toBeInstanceOf(Response)
  if (!(response instanceof Response)) throw new Error("Expected a Response")
  return response
}

const expectTodoRedirect = async (result: Promise<unknown>) => {
  const response = await expectResponse(result)
  expect(response.status).toBe(302)
  expect(response.headers.get("Location")).toBe("/todo-app")
}

const expectValidationFailure = async (result: Promise<unknown>, message: string) => {
  const response = await expectResponse(result)
  expect(response.status).toBe(400)
  await expect(response.json()).resolves.toEqual({
    ok: false,
    errors: [message],
  })
}

beforeEach(() => {
  makeRepository.mockReset()
  for (const operation of Object.values(repository)) operation.mockReset()

  repository.findMany.mockReturnValue(Effect.succeed([]))
  repository.create.mockReturnValue(Effect.void)
  repository.update.mockReturnValue(Effect.void)
  repository.delete.mockReturnValue(Effect.void)
  makeRepository.mockReturnValue(Effect.succeed(repository))
})

describe("/todo-app intent evidence", () => {
  it("creates a pending todo for the authenticated user and redirects", async () => {
    await expectTodoRedirect(
      action(
        actionArgs({
          intent: "create",
          title: "Write focused evidence",
          content: "Prove the repository mutation",
        }),
      ),
    )

    expect(repository.create).toHaveBeenCalledOnce()
    expect(repository.create).toHaveBeenCalledWith({
      data: {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        title: "Write focused evidence",
        content: "Prove the repository mutation",
        status: "PENDING",
        published: false,
      },
    })
    expect(repository.update).not.toHaveBeenCalled()
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it("updates only the identified todo fields and redirects", async () => {
    await expectTodoRedirect(
      action(
        actionArgs({
          intent: "update",
          id: "todo-update-1",
          title: "Updated title",
          content: "Updated content",
        }),
      ),
    )

    expect(repository.update).toHaveBeenCalledOnce()
    expect(repository.update).toHaveBeenCalledWith({
      where: { id: "todo-update-1" },
      data: { title: "Updated title", content: "Updated content" },
    })
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it("deletes the identified todo and redirects", async () => {
    await expectTodoRedirect(
      action(
        actionArgs({
          intent: "delete",
          id: "todo-delete-1",
        }),
      ),
    )

    expect(repository.delete).toHaveBeenCalledOnce()
    expect(repository.delete).toHaveBeenCalledWith({ where: { id: "todo-delete-1" } })
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it.each([
    ["COMPLETED", "COMPLETED"],
    ["PENDING", "PENDING"],
  ] as const)("toggles the identified todo to %s and redirects", async (submittedStatus, expectedStatus) => {
    await expectTodoRedirect(
      action(
        actionArgs({
          intent: "toggle-status",
          id: "todo-toggle-1",
          status: submittedStatus,
        }),
      ),
    )

    expect(repository.update).toHaveBeenCalledOnce()
    expect(repository.update).toHaveBeenCalledWith({
      where: { id: "todo-toggle-1" },
      data: { status: expectedStatus },
    })
    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it("returns repository todos and renders their count, content, and completion state", async () => {
    const todos = [
      {
        id: "todo-render-1",
        title: "Pending evidence",
        content: "Still in progress",
        status: "PENDING",
      },
      {
        id: "todo-render-2",
        title: "Completed evidence",
        content: null,
        status: "COMPLETED",
      },
    ]
    repository.findMany.mockReturnValue(Effect.succeed(todos))

    const result = await loader(loaderArgs())

    expect(repository.findMany).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true, data: { todos } })

    const markup = renderToStaticMarkup(<TodoApp loaderData={result} actionData={undefined} params={{}} matches={[]} />)
    expect(markup).toContain("2 items")
    expect(markup).toContain("Pending evidence")
    expect(markup).toContain("Still in progress")
    expect(markup).toContain("Completed evidence")
    expect(markup.match(/type="checkbox"/g)).toHaveLength(2)
    expect(markup.match(/checked=""/g)).toHaveLength(1)
  })
})

describe("/todo-app validation evidence", () => {
  it.each([
    ["create", {}],
    ["update", { id: "todo-update-1" }],
  ])("rejects a blank title for the %s intent without mutating the repository", async (intent, fields) => {
    await expectValidationFailure(
      action(
        actionArgs({
          intent,
          title: "   ",
          ...fields,
        }),
      ),
      "Title is required",
    )

    expect(repository.create).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it.each(["delete", "update", "toggle-status"])(
    "rejects a missing identifier for the %s intent without mutating the repository",
    async (intent) => {
      await expectValidationFailure(
        action(
          actionArgs({
            intent,
            title: "Valid title",
            status: "COMPLETED",
          }),
        ),
        "Missing id",
      )

      expect(repository.create).not.toHaveBeenCalled()
      expect(repository.update).not.toHaveBeenCalled()
      expect(repository.delete).not.toHaveBeenCalled()
    },
  )
})
