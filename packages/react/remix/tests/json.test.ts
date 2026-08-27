import { describe, expect, it, vi } from "vitest"
import { json } from "../src/index.js"

describe("deprecated bridge-local json compatibility", () => {
  it("uses native JSON serialization and defaults", async () => {
    const response: Response = json({ ok: true, nested: { count: 2 } })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("application/json")
    await expect(response.json()).resolves.toEqual({ ok: true, nested: { count: 2 } })
  })

  it("delegates serialization to native Response.json", () => {
    const nativeJson = vi.spyOn(Response, "json")

    try {
      json({ source: "native" }, { status: 202 })
      expect(nativeJson).toHaveBeenCalledWith({ source: "native" }, { status: 202 })
    } finally {
      nativeJson.mockRestore()
    }
  })

  it("accepts a numeric status", async () => {
    const response = json(["invalid", "missing"], 422)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual(["invalid", "missing"])
  })

  it("preserves object init status, status text, and caller headers", async () => {
    const response = json(
      { created: 7 },
      {
        status: 201,
        statusText: "Created by bridge",
        headers: { "Set-Cookie": "session=rr7", "X-Bridge": "react-router-7" },
      },
    )

    expect(response.status).toBe(201)
    expect(response.statusText).toBe("Created by bridge")
    expect(response.headers.get("set-cookie")).toBe("session=rr7")
    expect(response.headers.get("x-bridge")).toBe("react-router-7")
    expect(response.headers.get("content-type")).toContain("application/json")
    await expect(response.json()).resolves.toEqual({ created: 7 })
  })

  it("retains native serialization failures", () => {
    expect(() => json({ unsupported: 1n })).toThrow(TypeError)
  })
})
