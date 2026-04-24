import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import React, { act, StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { JSDOM } from "jsdom"
import { afterEach, describe, expect, it, vi } from "vitest"

type RootLinkDescriptor = {
  rel: string
  href: string
  integrity?: string
  crossOrigin?: string
}

let mockedLinks: RootLinkDescriptor[] = []

vi.mock("../../app/app-nav.js", () => ({
  AppNav: () => React.createElement("nav", { "data-app-nav": "stub" }, "AppNav"),
}))

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")

  return {
    ...actual,
    Meta: () => React.createElement("meta", { name: "vitest-meta", content: "stub" }),
    Links: () =>
      React.createElement(
        React.Fragment,
        null,
        ...mockedLinks.map((link, index) =>
          React.createElement("link", {
            key: `${link.rel}-${link.href}-${index}`,
            ...link,
          })
        ),
      ),
    Outlet: () => React.createElement("main", null, "route-content"),
    ScrollRestoration: () => null,
    Scripts: () => null,
  }
})

const rootModule = await import("../../app/root.js")
const { Layout } = rootModule

const normalizeHtml = (value: string) => value.replace(/\s+/g, " ").trim()

const renderExpectedHeadMarkup = (links: RootLinkDescriptor[]) => {
  const expectedHeadMarkup = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement("meta", { charSet: "utf-8" }),
      React.createElement("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      }),
      React.createElement("meta", { name: "vitest-meta", content: "stub" }),
      ...links.map((link, index) =>
        React.createElement("link", {
          key: `${link.rel}-${link.href}-${index}`,
          ...link,
        })
      ),
    ),
  )

  return normalizeHtml(
    new JSDOM(`<!DOCTYPE html><head>${expectedHeadMarkup}</head>`).window
      .document.head.innerHTML,
  )
}

const getRootLinks = (): RootLinkDescriptor[] => {
  const maybeLinks = (rootModule as { links?: () => RootLinkDescriptor[] })
    .links

  expect(maybeLinks).toBeTypeOf("function")

  return maybeLinks!()
}

const renderLayoutMarkup = () =>
  renderToStaticMarkup(
    React.createElement(Layout, {
      children: React.createElement("main", null, "route-content"),
    }),
  )

const summarizeHeadChildren = (head: HTMLHeadElement) =>
  Array.from(head.children).map((element) => ({
    tag: element.tagName.toLowerCase(),
    rel: element.getAttribute("rel"),
    href: element.getAttribute("href"),
    name: element.getAttribute("name"),
    content: element.getAttribute("content"),
    integrity: element.getAttribute("integrity"),
    crossOrigin: element.getAttribute("crossorigin"),
    charSet: element.getAttribute("charset"),
  }))

const injectFrameworkModulePreloads = (head: HTMLHeadElement) => {
  const firstStylesheet = head.querySelector('link[rel="stylesheet"]')

  expect(firstStylesheet).not.toBeNull()

  for (
    const href of [
      "/app/entry.client.tsx",
      "/app/root.tsx",
      "/app/app.tsx",
    ]
  ) {
    const link = head.ownerDocument.createElement("link")
    link.setAttribute("rel", "modulepreload")
    link.setAttribute("href", href)
    head.insertBefore(link, firstStylesheet)
  }
}

const setDomGlobals = (window: Window) => {
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    HTMLLinkElement: window.HTMLLinkElement,
    HTMLMetaElement: window.HTMLMetaElement,
    Node: window.Node,
    Text: window.Text,
    requestAnimationFrame: window.requestAnimationFrame?.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame?.bind(window),
  })
}

const clearDomGlobals = () => {
  for (
    const key of [
      "window",
      "document",
      "navigator",
      "HTMLElement",
      "HTMLLinkElement",
      "HTMLMetaElement",
      "Node",
      "Text",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ]
  ) {
    Reflect.deleteProperty(globalThis, key)
  }
}

afterEach(() => {
  mockedLinks = []
  vi.restoreAllMocks()
  clearDomGlobals()
})

describe("root document shell", () => {
  it("declares external asset descriptors through the root links export", () => {
    expect(getRootLinks()).toEqual([
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css",
        integrity: "sha384-NZhm4G1I7BpEGdjDKnzEfy3d78xvy7ECKUwwnKTYi036z42IyF056PbHfpQLIYgL",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ])
  })

  it("renders the head from Meta plus Links without duplicate hardcoded assets", () => {
    mockedLinks = getRootLinks()

    const documentMarkup = renderLayoutMarkup()
    const dom = new JSDOM(`<!DOCTYPE html>${documentMarkup}`)

    const expectedDom = new JSDOM(
      `<!DOCTYPE html><head>${renderExpectedHeadMarkup(mockedLinks)}</head>`,
    )

    expect(summarizeHeadChildren(dom.window.document.head)).toEqual(
      summarizeHeadChildren(expectedDom.window.document.head),
    )
    expect(
      dom.window.document.head.querySelectorAll('link[rel="preconnect"]')
        .length,
    ).toBe(2)
    expect(
      dom.window.document.head.querySelectorAll('link[rel="stylesheet"]')
        .length,
    ).toBe(2)
  })

  it("hydrates the server document without head drift or hydration mismatch warnings", async () => {
    mockedLinks = getRootLinks()

    const serverMarkup = renderLayoutMarkup()
    const dom = new JSDOM(`<!DOCTYPE html>${serverMarkup}`, {
      url: "https://example.test/",
    })
    const serverHeadMarkup = normalizeHtml(dom.window.document.head.innerHTML)
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    setDomGlobals(dom.window)

    let hydratedRoot: ReturnType<typeof hydrateRoot> | undefined

    await act(async () => {
      hydratedRoot = hydrateRoot(
        dom.window.document,
        React.createElement(
          StrictMode,
          null,
          React.createElement(Layout, {
            children: React.createElement("main", null, "route-content"),
          }),
        ),
      )

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    })

    expect(normalizeHtml(dom.window.document.head.innerHTML)).toBe(
      serverHeadMarkup,
    )
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringMatching(/hydration|did not match/i),
    )
    expect(
      consoleError.mock.calls
        .flat()
        .some((value) => /hydration|did not match/i.test(String(value))),
    ).toBe(false)

    await act(async () => {
      hydratedRoot?.unmount()
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    })
  })

  it("tolerates framework-injected modulepreloads in head without re-triggering hydration errors", async () => {
    mockedLinks = getRootLinks()

    const serverMarkup = renderLayoutMarkup()
    const dom = new JSDOM(`<!DOCTYPE html>${serverMarkup}`, {
      url: "https://example.test/",
    })
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    injectFrameworkModulePreloads(dom.window.document.head)
    setDomGlobals(dom.window)

    let hydratedRoot: ReturnType<typeof hydrateRoot> | undefined

    await act(async () => {
      hydratedRoot = hydrateRoot(
        dom.window.document,
        React.createElement(
          StrictMode,
          null,
          React.createElement(Layout, {
            children: React.createElement("main", null, "route-content"),
          }),
        ),
      )

      await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    })

    expect(
      consoleError.mock.calls
        .flat()
        .some((value) => /hydration|did not match/i.test(String(value))),
    ).toBe(false)
    expect(
      dom.window.document.head.querySelector(
        'link[href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css"]',
      ),
    ).not.toBeNull()

    await act(async () => {
      hydratedRoot?.unmount()
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0))
    })
  })

  it("keeps entry.client aligned with the default HydratedRouter bootstrap", () => {
    const testFileDirectory = dirname(new URL(import.meta.url).pathname)
    const entryClientSource = readFileSync(
      resolve(testFileDirectory, "../../app/entry.client.tsx"),
      "utf8",
    )

    expect(entryClientSource).toContain("hydrateRoot(")
    expect(entryClientSource).toContain("<HydratedRouter />")
    expect(entryClientSource).not.toContain("suppressHydrationWarning")
  })
})
