import * as Schema from "effect/Schema"
import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import { Decode, Link, Navigation, Route, Router } from "../src/index.js"

const effectifyOrigin = "https://effectify.dev"

type BrowserListener = (event: Event) => void

const makeFakeWindow = <State>(initialHref: string, initialState?: State) => {
  let currentUrl = new URL(initialHref)
  let currentState = initialState
  const entries = [{ url: new URL(currentUrl), state: currentState }]
  let index = 0
  const listeners = new Set<BrowserListener>()

  const emitPopState = () => {
    const event = new Event("popstate")

    for (const listener of listeners) {
      listener(event)
    }
  }

  const update = (nextUrl: URL, nextState: State | undefined, mode: "push" | "replace") => {
    currentUrl = nextUrl
    currentState = nextState

    if (mode === "push") {
      entries.splice(index + 1)
      entries.push({ url: new URL(nextUrl), state: nextState })
      index = entries.length - 1
      return
    }

    entries[index] = { url: new URL(nextUrl), state: nextState }
  }

  return {
    get location() {
      return {
        href: currentUrl.toString(),
        origin: currentUrl.origin,
      }
    },
    history: {
      get state() {
        return currentState
      },
      pushState: (state: State | undefined, _unused: string, url?: string | URL | null) => {
        update(new URL(url ?? currentUrl, currentUrl), state, "push")
      },
      replaceState: (state: State | undefined, _unused: string, url?: string | URL | null) => {
        update(new URL(url ?? currentUrl, currentUrl), state, "replace")
      },
      back: () => {
        if (index === 0) {
          return
        }

        index -= 1
        currentUrl = new URL(entries[index]!.url)
        currentState = entries[index]!.state
        emitPopState()
      },
    },
    addEventListener: (_event: string, listener: BrowserListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: BrowserListener) => {
      listeners.delete(listener)
    },
  }
}

describe("@effectify/loom-router navigation", () => {
  it("tracks browser location snapshots and push/replace/back history semantics", () => {
    const browserWindow = makeFakeWindow<{ readonly from: string } | undefined>(`${effectifyOrigin}/app?tab=overview`, {
      from: "server",
    })
    const navigation = Navigation.browser<{ readonly from: string } | undefined>(browserWindow)
    const seen: Array<{ pathname: string; search: string; state: { readonly from: string } | undefined }> = []
    const unsubscribe = navigation.subscribe((snapshot) => {
      seen.push({
        pathname: snapshot.pathname,
        search: snapshot.url.search,
        state: snapshot.state,
      })
    })

    expect(navigation.current()).toMatchObject({
      pathname: "/app",
      hash: "",
      state: { from: "server" },
    })

    navigation.push("/app/users?page=2", { state: { from: "push" } })
    navigation.replace("/app/users/42?tab=activity", { state: { from: "replace" } })
    navigation.back()
    unsubscribe()

    expect(seen).toEqual([
      {
        pathname: "/app/users",
        search: "?page=2",
        state: { from: "push" },
      },
      {
        pathname: "/app/users/42",
        search: "?tab=activity",
        state: { from: "replace" },
      },
      {
        pathname: "/app",
        search: "?tab=overview",
        state: { from: "server" },
      },
    ])
  })

  it("composes memory navigation snapshots with the existing pure router resolve path", () => {
    const router = Router.make({
      routes: [
        Route.make({
          path: "/users/:userId",
          content: (context: Router.Context) => `${context.params.userId}:${String(context.query.tab ?? "overview")}`,
        }),
      ],
    })
    const navigation = Navigation.memory(`${effectifyOrigin}/users/1?tab=overview`)

    navigation.push("/users/42?tab=activity")

    const resolved = Router.resolve(router, navigation.current().url)

    expect(resolved._tag).toBe("LoomRouterResolveSuccess")

    if (resolved._tag !== "LoomRouterResolveSuccess") {
      throw new Error("expected a resolved route from navigation snapshot")
    }

    expect(resolved.context.pathname).toBe("/users/42")
    expect(resolved.context.query).toEqual({ tab: "activity" })
    expect(resolved.route.path).toBe("/users/:userId")
  })

  it("round-trips schema-typed params/query hrefs through the router runtime and rejects invalid encoded input", () => {
    const postRoute = Route.make({
      path: "/posts/:postId",
      decode: {
        params: Decode.schema(Schema.Struct({ postId: Schema.Literal("42") })),
        search: Decode.schema(Schema.Struct({ page: Schema.Literal("2"), tab: Schema.Literal("activity") })),
      },
      content: (context: Router.Context) => `${context.params.postId}:${context.query.page}:${context.query.tab}`,
    })
    const router = Router.make({ routes: [postRoute] })

    const href = Route.href(postRoute, {
      params: { postId: "42" },
      query: { page: "2", tab: "activity" },
    })
    const runtimeRoute: Route.Definition = postRoute
    const invalidQuery: Route.Search = { page: "2", tab: "activity", extra: "ignored" }
    const success = Router.resolve(router, href)

    expect(href).toBe("https://effectify.dev/posts/42?page=2&tab=activity")
    expect(success._tag).toBe("LoomRouterResolveSuccess")

    if (success._tag !== "LoomRouterResolveSuccess") {
      throw new Error("expected a resolved route from href round-trip")
    }

    expect(success.context.params).toEqual({ postId: "42" })
    expect(success.context.query).toEqual({ page: "2", tab: "activity" })

    const invalid = Router.resolve(
      router,
      Route.href(postRoute, {
        params: { postId: "24" },
        query: { page: "9", tab: "draft" },
      }),
    )

    expect(invalid._tag).toBe("LoomRouterResolveInvalidInput")

    if (invalid._tag !== "LoomRouterResolveInvalidInput") {
      throw new Error("expected invalid input from encoded href")
    }

    expect(invalid.issues.map((issue) => issue.phase)).toEqual(["params", "search"])

    expect(() =>
      Route.href(runtimeRoute, {
        params: { postId: "42" },
        query: invalidQuery,
      })
    ).toThrowError(/Unknown search keys: extra/)
  })

  it("keeps link and navigation helpers compatible with router-generated hrefs", () => {
    const postDetail = Route.child({
      identifier: "posts.detail",
      path: ":postId",
      decode: {
        params: Decode.schema(Schema.Struct({ postId: Schema.Literal("42") })),
        search: Decode.schema(Schema.Struct({ tab: Schema.Literal("activity") })),
      },
      content: (context: Router.Context) => `${context.params.postId}:${context.query.tab}`,
    })
    const router = Router.make({
      routes: [Route.make({ path: "/posts", content: "posts-home", children: [postDetail] })],
    })
    const navigation = Navigation.memory(`${effectifyOrigin}/home`)
    const href = Router.href(router, "posts.detail", {
      params: { postId: "42" },
      query: { tab: "activity" },
    })

    expect(Link.href(href, navigation.current().url)).toBe(`${effectifyOrigin}/posts/42?tab=activity`)

    Link.navigate(navigation, href)

    expect(navigation.current().pathname).toBe("/posts/42")
    expect(navigation.current().query.get("tab")).toBe("activity")

    const modifiers = Link.modifiers({
      navigation,
      to: href,
    })

    expect(modifiers.href).toBe(`${effectifyOrigin}/posts/42?tab=activity`)
  })

  it("intercepts same-origin self-navigation links and skips ineligible clicks", () => {
    const dom = new JSDOM(
      `
      <main>
        <a id="eligible" href="/posts/42?tab=activity"><span>open</span></a>
        <a id="external" href="https://example.com/posts/42">external</a>
        <a id="download" href="/report.csv" download>download</a>
        <a id="blank" href="/blank" target="_blank">blank</a>
      </main>
    `,
      { url: `${effectifyOrigin}/home` },
    )
    const eligible = dom.window.document.getElementById("eligible")
    const external = dom.window.document.getElementById("external")
    const download = dom.window.document.getElementById("download")
    const blank = dom.window.document.getElementById("blank")
    const child = eligible?.querySelector("span")

    if (
      !(eligible instanceof dom.window.HTMLAnchorElement) ||
      !(external instanceof dom.window.HTMLAnchorElement) ||
      !(download instanceof dom.window.HTMLAnchorElement) ||
      !(blank instanceof dom.window.HTMLAnchorElement) ||
      !(child instanceof dom.window.HTMLSpanElement)
    ) {
      throw new Error("expected anchor fixtures")
    }

    const navigation = Navigation.memory(`${effectifyOrigin}/home`)
    const clicked = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })
    const alreadyPrevented = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })

    alreadyPrevented.preventDefault()

    expect(Link.href("/posts/42?tab=activity", `${effectifyOrigin}/home`)).toBe(
      `${effectifyOrigin}/posts/42?tab=activity`,
    )
    expect(
      Link.intercept({
        event: clicked,
        currentTarget: eligible,
        navigation,
      }),
    ).toBe(true)
    expect(clicked.defaultPrevented).toBe(true)
    expect(navigation.current().pathname).toBe("/posts/42")
    expect(navigation.current().query.get("tab")).toBe("activity")

    const intercept = Link.modifiers({
      navigation,
      to: "/posts/99?tab=preview",
    })
    const modifierClick = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })

    expect(intercept.href).toBe(`${effectifyOrigin}/posts/99?tab=preview`)
    expect(intercept.onClick({ event: modifierClick, currentTarget: eligible })).toBe(true)
    expect(navigation.current().pathname).toBe("/posts/42")

    const modifiedClick = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true })

    expect(Link.intercept({ event: modifiedClick, currentTarget: eligible, navigation })).toBe(false)
    expect(Link.intercept({ event: alreadyPrevented, currentTarget: eligible, navigation })).toBe(false)
    expect(
      Link.intercept({
        event: new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }),
        currentTarget: external,
        navigation,
      }),
    ).toBe(false)
    expect(
      Link.intercept({
        event: new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }),
        currentTarget: download,
        navigation,
      }),
    ).toBe(false)
    expect(
      Link.intercept({
        event: new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }),
        currentTarget: blank,
        navigation,
      }),
    ).toBe(false)

    Link.navigate(navigation, "/posts/7", { replace: true })

    expect(navigation.current().pathname).toBe("/posts/7")
    expect(child.tagName).toBe("SPAN")
  })
})
