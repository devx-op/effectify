import { expect, test } from "vitest"

import { currentUrl, expectElement, navigateTo, open, readValue, typeInto } from "./support/harness.js"

test("browser harness boots the app and exercises the login route", async () => {
  await open("/")

  await expectElement("nav")
  await expectElement('a[href="/"]')
  await expectElement('a[href="/login"]')

  await navigateTo("/login")

  expect(await currentUrl()).toContain("/login")

  const emailInput = "#email-address"

  await expectElement(emailInput)
  await typeInto(emailInput, "browser@example.com")
  expect(await readValue(emailInput)).toBe("browser@example.com")
})
