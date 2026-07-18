import type {
  ActionArgsContext as ActionArgsContextService,
  HttpResponse,
  LoaderArgsContext as LoaderArgsContextService,
} from "@effectify/react-router"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { renderToStaticMarkup } from "react-dom/server"
import { createMemoryRouter, RouterContextProvider, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const hatchet = vi.hoisted(() => ({
  createCron: vi.fn(),
  listCrons: vi.fn(),
}))

vi.mock("@effectify/hatchet", async () => {
  const actual = await vi.importActual<typeof import("@effectify/hatchet")>(
    "@effectify/hatchet",
  )
  const Effect = await import("effect/Effect")
  const CronExpression = await import(
    "../../../../packages/hatchet/src/CronExpression.js"
  )
  return {
    ...actual,
    CronExpression,
    Hatchet: {
      ...actual.Hatchet,
      createCron: (...args: ReadonlyArray<unknown>) => Effect.suspend(() => hatchet.createCron(...args)),
      listCrons: (...args: ReadonlyArray<unknown>) => Effect.suspend(() => hatchet.listCrons(...args)),
    },
  }
})

vi.mock("../../app/lib/runtime.server.js", async () => {
  const {
    ActionArgsContext,
    HttpResponseFailure,
    HttpResponseRedirect,
    HttpResponseSuccess,
    LoaderArgsContext,
  } = await import("@effectify/react-router")
  const Effect = await import("effect/Effect")

  const redirectResponse = (to: string) => new Response(null, { status: 302, headers: { Location: to } })

  return {
    withLoaderEffect: <A, E>(
      self: Effect.Effect<
        HttpResponse<A> | Response,
        E,
        LoaderArgsContextService
      >,
    ) =>
    (args: LoaderFunctionArgs) =>
      Effect.runPromise(
        self.pipe(Effect.provideService(LoaderArgsContext, args)),
      ).then((result) => {
        if (result instanceof Response) return result
        if (result instanceof HttpResponseSuccess) {
          return { ok: true as const, data: result.data }
        }
        if (result instanceof HttpResponseFailure) {
          return Response.json(
            { ok: false, errors: [String(result.cause)] },
            { status: 500 },
          )
        }
        if (result instanceof HttpResponseRedirect) {
          return redirectResponse(result.to)
        }
        throw new Error("unexpected loader response")
      }),
    withActionEffect: <A, E>(
      self: Effect.Effect<
        HttpResponse<A> | Response,
        E,
        ActionArgsContextService
      >,
    ) =>
    (args: ActionFunctionArgs) =>
      Effect.runPromise(
        self.pipe(Effect.provideService(ActionArgsContext, args)),
      ).then((result) => {
        if (result instanceof Response) return result
        if (result instanceof HttpResponseSuccess) {
          return { ok: true as const, response: result.data }
        }
        if (result instanceof HttpResponseFailure) {
          return Response.json(
            { ok: false, errors: [String(result.cause)] },
            { status: 400 },
          )
        }
        if (result instanceof HttpResponseRedirect) {
          return redirectResponse(result.to)
        }
        throw new Error("unexpected action response")
      }),
  }
})

import { type CreateCronOptions, CronExpression, makeCronId } from "@effectify/hatchet"
import * as Effect from "effect/Effect"
import { greetingTask } from "../../app/lib/hatchet/greeting-task.server.js"
import { action, actionErrorFromData, HatchetCronsScreen, loader } from "../../app/routes/hatchet-crons.js"

const authenticatedSession = {
  session: { id: "session-1" },
  user: { id: "user-1", email: "user@example.test" },
}

const routeUrl = () => new URL("http://localhost/hatchet-crons")

const loaderArgs = (): LoaderFunctionArgs => {
  const url = routeUrl()
  return {
    context: new RouterContextProvider(),
    params: {},
    pattern: "/hatchet-crons",
    request: new Request(url),
    url,
  }
}

const actionArgs = (
  fields: Readonly<Record<string, string>>,
): ActionFunctionArgs => {
  const url = routeUrl()
  return {
    context: new RouterContextProvider(),
    params: {},
    pattern: "/hatchet-crons",
    request: new Request(url, {
      method: "POST",
      body: new URLSearchParams(fields),
    }),
    url,
  }
}

const expectResponse = (value: unknown): Response => {
  expect(value).toBeInstanceOf(Response)
  if (!(value instanceof Response)) throw new Error("expected Response")
  return value
}

const cron = {
  id: makeCronId("cron-1"),
  taskName: greetingTask.name,
  name: "weekday-greeting",
  expression: "0 9 * * 1-5",
  input: { name: "Ada" },
  enabled: true,
  method: "API" as const,
}

const validForm = {
  name: "weekday-greeting",
  expression: "0 9 * * 1-5",
  greetingName: "Ada",
}

describe("/hatchet-crons", () => {
  beforeEach(() => {
    hatchet.createCron.mockReset().mockReturnValue(Effect.succeed(cron))
    hatchet.listCrons.mockReset().mockReturnValue(Effect.succeed([cron]))
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() => Promise.resolve(Response.json(authenticatedSession))),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("redirects unauthenticated loaders before listing crons", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ session: null, user: null }),
    )

    const response = expectResponse(await loader(loaderArgs()))

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/login")
    expect(hatchet.listCrons).not.toHaveBeenCalled()
  })

  it("redirects unauthenticated create actions before mutation", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ session: null, user: null }),
    )

    const response = expectResponse(await action(actionArgs(validForm)))

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/login")
    expect(hatchet.createCron).not.toHaveBeenCalled()
  })

  it("lists greeting crons for an authenticated user", async () => {
    await expect(loader(loaderArgs())).resolves.toEqual({
      ok: true,
      data: { crons: [cron] },
    })
    expect(hatchet.listCrons).toHaveBeenCalledExactlyOnceWith({
      taskName: greetingTask.name,
    })
  })

  it("creates a greeting cron with the package CronExpression value", async () => {
    hatchet.createCron.mockImplementationOnce(
      (_task: unknown, options: CreateCronOptions) => {
        expect(CronExpression.source(options.schedule)).toBe("0 9 * * 1-5")
        return Effect.succeed(cron)
      },
    )

    const response = expectResponse(await action(actionArgs(validForm)))

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/hatchet-crons")
    expect(hatchet.createCron).toHaveBeenCalledExactlyOnceWith(greetingTask, {
      name: "weekday-greeting",
      schedule: expect.any(Object),
      input: { name: "Ada" },
    })
  })

  it("returns clear feedback for a semantically invalid expression", async () => {
    const response = expectResponse(
      await action(actionArgs({ ...validForm, expression: "61 9 * * *" })),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      errors: ["Invalid cron expression"],
    })
    expect(hatchet.createCron).not.toHaveBeenCalled()
  })

  it.each([
    { ...validForm, name: "" },
    { ...validForm, expression: "" },
    { ...validForm, greetingName: "" },
  ])("rejects invalid string form data before creation", async (fields) => {
    const response = expectResponse(await action(actionArgs(fields)))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      errors: ["Invalid cron form"],
    })
    expect(hatchet.createCron).not.toHaveBeenCalled()
  })

  it("decodes the runtime failure response as visible action feedback", () => {
    expect(
      actionErrorFromData({
        ok: false,
        errors: ["Invalid cron expression"],
      }),
    ).toBe("Invalid cron expression")
    expect(
      actionErrorFromData({ ok: true, response: undefined }),
    ).toBeUndefined()
  })

  it("renders create, list, and next-three preview without delete or ownership controls", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-03T10:00:00.000Z"))
    const router = createMemoryRouter(
      [{ path: "/", element: <HatchetCronsScreen crons={[cron]} /> }],
      { initialEntries: ["/"] },
    )
    const markup = renderToStaticMarkup(<RouterProvider router={router} />)

    expect(markup).toContain("Hatchet Crons")
    expect(markup).toContain('name="expression"')
    expect(markup).toContain("Next three local occurrences")
    expect(markup.match(/<time/g)).toHaveLength(3)
    expect(markup).toContain("weekday-greeting")
    expect(markup).not.toContain("Delete")
    expect(markup).not.toContain("owner")
    expect(markup).not.toContain('name="intent"')
  })
})
