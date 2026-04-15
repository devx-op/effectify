import config from "../../vitest.config.js"
import { describe, expect, it } from "vitest"

describe("react-router example vitest config", () => {
  it("keeps dedicated e2e migration tests out of the app stability suite", () => {
    expect(config.test?.exclude).toEqual(
      expect.arrayContaining(["tests/unit/e2e/**"]),
    )
  })
})
