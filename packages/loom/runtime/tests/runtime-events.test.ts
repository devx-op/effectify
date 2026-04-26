import { JSDOM } from "jsdom"
import * as LoomCore from "@effectify/loom-core"
import { describe, expect, it } from "vitest"
import * as Hydration from "../src/hydration.js"
import * as Runtime from "../src/runtime.js"

const readTagName = (value: EventTarget): string =>
  typeof value === "object" && value !== null && "tagName" in value && typeof value.tagName === "string"
    ? value.tagName
    : "unknown"

const visibleBoundary = (children: ReadonlyArray<LoomCore.Ast.Node>) =>
  LoomCore.Ast.element("section", {
    attributes: {
      [Hydration.attributeName]: "visible",
    },
    hydration: LoomCore.Ast.hydrationMetadata("visible", {
      [Hydration.attributeName]: "visible",
    }),
    events: [],
    children,
  })

describe("@effectify/loom-runtime event context", () => {
  it("exposes currentTarget separately from nested click targets during hydration activation", () => {
    const seen: Array<{ target: string; currentTarget: string }> = []
    const render = Runtime.renderToHtml(
      visibleBoundary([
        LoomCore.Ast.element("button", {
          attributes: { type: "button" },
          events: [
            Runtime.eventBinding("click", ({ currentTarget, target }: Runtime.EventContext<HTMLButtonElement>) => {
              seen.push({
                target: readTagName(target),
                currentTarget: readTagName(currentTarget),
              })

              return { _tag: "CurrentTargetObserved" }
            }),
          ],
          children: [
            LoomCore.Ast.element("span", {
              attributes: {},
              events: [],
              children: [LoomCore.Ast.text("open")],
            }),
          ],
        }),
      ]),
    )
    const dom = new JSDOM(`<div id="loom-root">${render.html}</div>`)
    const root = dom.window.document.getElementById("loom-root")
    const span = dom.window.document.querySelector("span")

    if (root === null || span === null) {
      throw new Error("expected hydration fixtures")
    }

    const activation = Runtime.activateHydration(root, render)

    expect(activation.boundaries[0]?.eventBindings).toHaveLength(1)

    span.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }))

    expect(activation.issues).toEqual([])
    expect(seen).toEqual([
      {
        target: "SPAN",
        currentTarget: "BUTTON",
      },
    ])
  })
})
