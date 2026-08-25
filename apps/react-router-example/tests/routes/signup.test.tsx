// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { handleSignUp } = vi.hoisted(() => ({
  handleSignUp: vi.fn(),
}))

vi.mock("../../app/lib/auth-client.js", () => ({
  handleSignUp,
}))

import SignUp from "../../app/routes/signup.js"

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  if (!valueSetter) throw new Error("HTMLInputElement value setter unavailable")

  act(() => {
    valueSetter.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

const renderSignup = () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/" element={<h1>Account created</h1>} />
        </Routes>
      </MemoryRouter>,
    )
  })

  return { container, root }
}

const submitSignup = async (container: HTMLElement) => {
  const name = container.querySelector<HTMLInputElement>("#name")
  const email = container.querySelector<HTMLInputElement>("#email-address")
  const password = container.querySelector<HTMLInputElement>("#password")
  const form = container.querySelector<HTMLFormElement>("form")
  if (!name || !email || !password || !form) {
    throw new Error("Signup form controls unavailable")
  }

  setInputValue(name, "Example User")
  setInputValue(email, "signup@example.test")
  setInputValue(password, "correct horse battery staple")
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
}

const roots: Root[] = []

beforeEach(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)
  handleSignUp.mockReset()
})

afterEach(() => {
  for (const root of roots.splice(0)) {
    act(() => root.unmount())
  }
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe("/signup", () => {
  it("submits account details and navigates home after successful signup", async () => {
    handleSignUp.mockResolvedValue({ user: { id: "user-1" } })
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { container, root } = renderSignup()
    roots.push(root)

    await submitSignup(container)

    expect(handleSignUp).toHaveBeenCalledOnce()
    expect(handleSignUp).toHaveBeenCalledWith("signup@example.test", "correct horse battery staple", "Example User")
    expect(container.textContent).toContain("Account created")
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it("renders the signup error and remains on the signup form", async () => {
    handleSignUp.mockRejectedValue(new Error("Email is already registered"))
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const { container, root } = renderSignup()
    roots.push(root)

    await submitSignup(container)

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Email is already registered")
    expect(container.textContent).toContain("Create an account")
    expect(container.textContent).not.toContain("Account created")
  })
})
