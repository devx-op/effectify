import { expect, it } from "@effect/vitest"
import { parseArguments } from "../demo/main.js"

it("parses only an explicit dedicated workspace and approval flag", () => {
  expect(parseArguments(["--workspace", "/tmp/effectify-workspace", "--approve"])).toEqual({
    workspace: "/tmp/effectify-workspace",
    approve: true,
  })
  expect(parseArguments(["--workspace", "/tmp/effectify-workspace"])).toEqual({
    workspace: "/tmp/effectify-workspace",
    approve: false,
  })
  expect(parseArguments(["--approve"])).toBeUndefined()
})
