import { JSDOM } from "jsdom"
import * as LoomCore from "@effectify/loom-core"
import { describe, expect, it } from "vitest"
import {
  MismatchedMountedRangeParentError,
  MissingMountedRangeParentError,
} from "../../web/src/internal/control-flow-error.js"
import { makeMountedRange } from "../../web/src/internal/mounted-range.js"
import * as Runtime from "../src/runtime.js"

describe("@effectify/loom-runtime control-flow foundations", () => {
  it("serializes structural If and For nodes through the runtime render plan", () => {
    let visible = false
    let items = ["alpha", "beta"]

    const tree = LoomCore.Ast.fragment([
      LoomCore.Ast.ifNode(
        () => visible,
        LoomCore.Ast.element("strong", {
          attributes: {},
          children: [LoomCore.Ast.text("visible")],
          events: [],
        }),
        LoomCore.Ast.text("hidden"),
      ),
      LoomCore.Ast.forEach(
        () => items,
        (item, index) =>
          LoomCore.Ast.element("span", {
            attributes: { "data-index": String(index) },
            children: [LoomCore.Ast.text(item)],
            events: [],
          }),
        LoomCore.Ast.text("empty"),
      ),
    ])

    expect(Runtime.renderToHtml(tree).html).toBe(
      'hidden<span data-index="0">alpha</span><span data-index="1">beta</span>',
    )

    visible = true
    items = []

    expect(Runtime.renderToHtml(tree).html).toBe("<strong>visible</strong>empty")
  })

  it("mounts internal DOM ranges with ownership guardrails for control-flow updates", () => {
    const document = new JSDOM("<div></div>").window.document
    const range = makeMountedRange("if", document)

    expect(() => range.replace([document.createTextNode("orphan")])).toThrowError(MissingMountedRangeParentError)

    const first = document.createElement("div")
    const second = document.createElement("div")

    first.append(range.start)
    second.append(range.end)

    expect(() => range.replace([document.createTextNode("split")])).toThrowError(MismatchedMountedRangeParentError)
  })

  it("creates typed structural node contracts for conditional and iterable renderers", () => {
    let visible = true
    let items = ["alpha"]

    const ifNode: LoomCore.Ast.IfNode = LoomCore.Ast.ifNode(
      () => visible,
      LoomCore.Ast.text("ready"),
      LoomCore.Ast.text("waiting"),
    )
    const forNode: LoomCore.Ast.ForNode<string> = LoomCore.Ast.forEach(
      () => items,
      (item, index) => LoomCore.Ast.text(`${index}:${item}`),
      LoomCore.Ast.text("empty"),
    )

    expect(ifNode._tag).toBe("If")
    expect(forNode._tag).toBe("For")
  })

  it("keeps deferred and static branch composition observable through runtime render output", () => {
    let items = ["alpha"]
    let visible = false

    const tree = LoomCore.Ast.fragment([
      LoomCore.Ast.element("section", {
        attributes: { "data-shell": "true" },
        events: [],
        children: [
          LoomCore.Ast.text("before"),
          LoomCore.Ast.ifNode(
            () => visible,
            LoomCore.Ast.element("strong", {
              attributes: { "data-branch": "visible" },
              children: [LoomCore.Ast.text("visible")],
              events: [],
            }),
            LoomCore.Ast.element("em", {
              attributes: { "data-branch": "fallback" },
              children: [LoomCore.Ast.text("fallback")],
              events: [],
            }),
          ),
          LoomCore.Ast.forEach(
            () => items,
            (item, index) =>
              LoomCore.Ast.element("span", {
                attributes: { "data-item": `${index}` },
                children: [LoomCore.Ast.text(item)],
                events: [],
              }),
            LoomCore.Ast.element("p", {
              attributes: { "data-empty": "true" },
              children: [LoomCore.Ast.text("empty")],
              events: [],
            }),
          ),
          LoomCore.Ast.text("after"),
        ],
      }),
    ])

    expect(Runtime.renderToHtml(tree).html).toBe(
      '<section data-shell="true">before<em data-branch="fallback">fallback</em><span data-item="0">alpha</span>after</section>',
    )

    visible = true
    items = []

    expect(Runtime.renderToHtml(tree).html).toBe(
      '<section data-shell="true">before<strong data-branch="visible">visible</strong><p data-empty="true">empty</p>after</section>',
    )
  })
})
