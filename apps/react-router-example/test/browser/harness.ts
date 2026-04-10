import { commands } from "vitest/browser"

declare const __BROWSER_TEST_BASE_URL__: string

const routeSelectors: Record<string, string> = {
  "/": 'a[href="/"]',
  "/chat": 'a[href="/chat"]',
  "/login": 'a[href="/login"]',
  "/signup": 'a[href="/signup"]',
  "/todo-app": 'a[href="/todo-app"]',
}

export async function open(path: string) {
  await commands.openUrl(new URL(path, __BROWSER_TEST_BASE_URL__).toString())
}

export async function navigateTo(route: string) {
  const linkSelector = routeSelectors[route]

  if (!linkSelector) {
    await open(route)
    return
  }

  await commands.clickSelector(linkSelector)
}

export async function expectElement(selector: string, timeout = 5000) {
  await commands.waitForSelector(selector, timeout)
}

export async function currentUrl() {
  return commands.currentUrl()
}

export async function typeInto(selector: string, value: string) {
  await commands.fillSelector(selector, value)
}

export async function readValue(selector: string) {
  return commands.readValue(selector)
}

declare module "vitest/browser" {
  interface BrowserCommands {
    clickSelector(selector: string): Promise<void>
    currentUrl(): Promise<string>
    fillSelector(selector: string, value: string): Promise<void>
    openUrl(target: string): Promise<void>
    readValue(selector: string): Promise<string>
    waitForSelector(selector: string, timeout?: number): Promise<void>
  }
}
