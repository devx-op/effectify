import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as HttpApi from "effect/unstable/httpapi/HttpApi"
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder"
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint"
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup"
import { RouterContextProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { HttpApiHandler } from "../src/index.js"

const TestApi = HttpApi.make("RouterTestApi").add(
  HttpApiGroup.make("test")
    .add(HttpApiEndpoint.get("getMessage", "/hello", { success: Schema.String }))
    .add(HttpApiEndpoint.post("postMessage", "/submit", { success: Schema.String })),
)

class AdapterProbe extends Context.Service<
  AdapterProbe,
  {
    readonly getMessage: string
    readonly postMessage: string
  }
>()("@effectify/react-router/test/AdapterProbe") {}

type Counters = {
  acquired: number
  finalized: number
}

const makeApiLive = (counters: Counters = { acquired: 0, finalized: 0 }) => {
  const ProbeLive = Layer.effect(
    AdapterProbe,
    Effect.gen(function* () {
      counters.acquired += 1
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          counters.finalized += 1
        }),
      )
      return AdapterProbe.of({
        getMessage: "hello from loader",
        postMessage: "hello from action",
      })
    }),
  )
  const HandlersLive = HttpApiBuilder.group(TestApi, "test", (handlers) =>
    handlers
      .handle("getMessage", () => Effect.map(AdapterProbe, (probe) => probe.getMessage))
      .handle("postMessage", () => Effect.map(AdapterProbe, (probe) => probe.postMessage)),
  )

  return HandlersLive.pipe(Layer.provide(ProbeLive))
}

const routeArgs = (url: string, init?: RequestInit) => ({
  context: new RouterContextProvider(),
  params: {},
  request: new Request(url, init),
  url: new URL(url),
  pattern: new URL(url).pathname,
})

const expectJson = async (response: Response, expected: unknown) => {
  expect(response).toBeInstanceOf(Response)
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual(expected)
}

describe("React Router HTTP API handler", () => {
  it("dispatches loader and action requests through the Effect HTTP API", async () => {
    const adapter = HttpApiHandler.make({
      api: TestApi,
      apiLive: makeApiLive(),
    })

    try {
      await expectJson(await adapter(routeArgs("https://effectify.dev/hello")), "hello from loader")
      await expectJson(
        await adapter(routeArgs("https://effectify.dev/submit", { method: "POST" })),
        "hello from action",
      )
    } finally {
      await adapter.dispose()
    }
  })

  it("registers API and Scalar routes on a prefixed HttpRouter", async () => {
    const adapter = HttpApiHandler.make({
      api: TestApi,
      apiLive: makeApiLive(),
      pathPrefix: "/service/",
      scalar: { theme: "purple" },
    })

    try {
      await expectJson(await adapter(routeArgs("https://effectify.dev/service/hello")), "hello from loader")
      expect((await adapter(routeArgs("https://effectify.dev/hello"))).status).toBe(404)

      const docs = await adapter(routeArgs("https://effectify.dev/service/docs"))
      expect(docs.status).toBe(200)
      const html = await docs.text()
      expect(html).toContain('"baseServerURL":"https://effectify.dev"')
      expect(html).toContain('"theme":"purple"')
      expect((await adapter(routeArgs("https://effectify.dev/api/docs"))).status).toBe(404)
    } finally {
      await adapter.dispose()
    }
  })

  it("mounts optional Scalar docs at the historical default path with v4 options", async () => {
    const withoutScalar = HttpApiHandler.make({
      api: TestApi,
      apiLive: makeApiLive(),
    })
    const withScalar = HttpApiHandler.make({
      api: TestApi,
      apiLive: makeApiLive(),
      scalar: {
        baseServerURL: "https://configured.example",
        theme: "moon",
      },
    })

    try {
      expect((await withoutScalar(routeArgs("https://effectify.dev/api/docs"))).status).toBe(404)

      const docs = await withScalar(routeArgs("https://effectify.dev/api/docs"))
      expect(docs.status).toBe(200)
      const html = await docs.text()
      expect(html).toContain('"baseServerURL":"https://configured.example"')
      expect(html).not.toContain('"baseServerURL":"https://effectify.dev"')
      expect(html).toContain('"theme":"moon"')
    } finally {
      await Promise.all([withoutScalar.dispose(), withScalar.dispose()])
    }
  })

  it("reuses one web handler and disposes its finalizers exactly once", async () => {
    const counters = { acquired: 0, finalized: 0 }
    const adapter = HttpApiHandler.make({
      api: TestApi,
      apiLive: makeApiLive(counters),
    })

    await adapter(routeArgs("https://effectify.dev/hello"))
    await adapter(routeArgs("https://effectify.dev/hello"))
    expect(counters).toEqual({ acquired: 1, finalized: 0 })

    await Promise.all([adapter.dispose(), adapter.dispose()])
    await adapter.dispose()
    expect(counters).toEqual({ acquired: 1, finalized: 1 })
  })
})
