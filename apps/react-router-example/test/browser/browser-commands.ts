import type { BrowserCommand } from "vitest/node"

type WebdriverElement = {
  click(): Promise<void>
  getValue(): Promise<string>
  setValue(value: string): Promise<void>
  waitForExist(options: { timeout: number }): Promise<boolean>
}

type WebdriverBrowser = {
  $(selector: string): Promise<WebdriverElement>
  getWindowHandles(): Promise<string[]>
  getUrl(): Promise<string>
  newWindow(target: string): Promise<void>
  switchToWindow(handle: string): Promise<void>
  url(target: string): Promise<void>
}

type BrowserCommandContext = {
  browser: WebdriverBrowser
}

const asBrowserContext = (context: unknown) => context as BrowserCommandContext

const switchToAppWindow = async (browser: WebdriverBrowser) => {
  const handles = await browser.getWindowHandles()
  const appHandle = handles.at(-1)

  if (!appHandle || handles.length < 2) {
    throw new Error(
      "No app browser window is open. Call open(path) before interacting with the app.",
    )
  }

  await browser.switchToWindow(appHandle)
}

export const openUrl: BrowserCommand<[target: string]> = async (
  context,
  target,
) => {
  const browser = asBrowserContext(context).browser
  const handles = await browser.getWindowHandles()

  if (handles.length > 1) {
    await switchToAppWindow(browser)
    await browser.url(target)
    return
  }

  await browser.newWindow(target)
}

export const clickSelector: BrowserCommand<[selector: string]> = async (
  context,
  selector,
) => {
  const browser = asBrowserContext(context).browser
  await switchToAppWindow(browser)
  const element = await browser.$(selector)

  await element.click()
}

export const waitForSelector: BrowserCommand<
  [selector: string, timeout?: number]
> = async (context, selector, timeout = 5000) => {
  const browser = asBrowserContext(context).browser
  await switchToAppWindow(browser)
  const element = await browser.$(selector)
  const exists = await element.waitForExist({ timeout })

  if (!exists) {
    throw new Error(
      `Expected element '${selector}' to exist within ${timeout}ms.`,
    )
  }
}

export const currentUrlCommand: BrowserCommand<[]> = async (context) => {
  const browser = asBrowserContext(context).browser
  await switchToAppWindow(browser)
  return browser.getUrl()
}

export const fillSelector: BrowserCommand<
  [selector: string, value: string]
> = async (context, selector, value) => {
  const browser = asBrowserContext(context).browser
  await switchToAppWindow(browser)
  const element = await browser.$(selector)

  await element.setValue(value)
}

export const readValueCommand: BrowserCommand<[selector: string]> = async (
  context,
  selector,
) => {
  const browser = asBrowserContext(context).browser
  await switchToAppWindow(browser)
  const element = await browser.$(selector)

  return element.getValue()
}

export const browserCommands = {
  clickSelector,
  currentUrl: currentUrlCommand,
  fillSelector,
  openUrl,
  readValue: readValueCommand,
  waitForSelector,
}
