// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { handleSignIn } = vi.hoisted(() => ({
  handleSignIn: vi.fn(),
}))

vi.mock("../../app/lib/auth-client.js", () => ({
  handleSignIn,
}))

import Login from "../../app/routes/login.js"

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  if (!valueSetter) throw new Error("HTMLInputElement value setter unavailable")

  act(() => {
    valueSetter.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

const renderLogin = () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<h1>Signed in</h1>} />
        </Routes>
      </MemoryRouter>,
    )
  })

  return { container, root }
}

const submitLogin = async (container: HTMLElement) => {
  const email = container.querySelector<HTMLInputElement>("#email-address")
  const password = container.querySelector<HTMLInputElement>("#password")
  const form = container.querySelector<HTMLFormElement>("form")
  if (!email || !password || !form) throw new Error("Login form controls unavailable")

  setInputValue(email, "login@example.test")
  setInputValue(password, "correct horse battery staple")
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
}

const roots: Root[] = []

beforeEach(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)
  handleSignIn.mockReset()
})

afterEach(() => {
  for (const root of roots.splice(0)) {
    act(() => root.unmount())
  }
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe("/login", () => {
  it("submits credentials and navigates home after successful authentication", async () => {
    handleSignIn.mockResolvedValue({ user: { id: "user-1" } })
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { container, root } = renderLogin()
    roots.push(root)

    await submitLogin(container)

    expect(handleSignIn).toHaveBeenCalledOnce()
    expect(handleSignIn).toHaveBeenCalledWith("login@example.test", "correct horse battery staple")
    expect(container.textContent).toContain("Signed in")
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it("renders the authentication error and remains on the login form", async () => {
    handleSignIn.mockRejectedValue(new Error("Invalid email or password"))
    const { container, root } = renderLogin()
    roots.push(root)

    await submitLogin(container)

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Invalid email or password")
    expect(container.textContent).toContain("Sign in to your account")
    expect(container.textContent).not.toContain("Signed in")
  })
})
