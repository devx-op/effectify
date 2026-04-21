import * as LoomCore from "@effectify/loom-core"
import * as Html from "./html.js"
import * as Slot from "./slot.js"
import * as internal from "./internal/view-node.js"
import * as viewChild from "./internal/view-child.js"

export type Type = internal.Type
export type Node = LoomCore.Ast.Node
export type ViewChild = viewChild.ViewChild
export type Child = ViewChild
export type MaybeChild = ViewChild
export type SlotDefinition = Slot.Definition

export interface LinkOptions {
  readonly href: string
  readonly target?: string
  readonly rel?: string
  readonly download?: true | string
}

export type LinkTarget = string | LinkOptions

const linkTargetModifiers = (target: LinkTarget): ReadonlyArray<Html.AttributeModifier> => {
  const normalized = typeof target === "string" ? { href: target } : target
  const modifiers = [Html.attr("href", normalized.href)]

  if (normalized.target !== undefined) {
    modifiers.push(Html.attr("target", normalized.target))
  }

  if (normalized.rel !== undefined) {
    modifiers.push(Html.attr("rel", normalized.rel))
  }

  if (normalized.download !== undefined) {
    modifiers.push(Html.attr("download", normalized.download === true ? "" : normalized.download))
  }

  return modifiers
}

/** Create a renderer-neutral text node backed by the current Html-first runtime seam. */
export function text(value: string): Type
export function text(render: () => string): Type
export function text(value: string | (() => string)): Type {
  return typeof value === "function"
    ? internal.wrap(LoomCore.Ast.dynamicText(value))
    : internal.wrap({
      _tag: "Text",
      value,
    })
}

/** Create a renderer-neutral fragment. */
export const fragment = (...children: ReadonlyArray<MaybeChild>): Type =>
  internal.wrap({
    _tag: "Fragment",
    children: viewChild.normalizeViewChildren(children),
  })

/** Create a neutral vertical layout primitive. */
export const vstack = (...children: ReadonlyArray<MaybeChild>): Type =>
  internal.wrap(Html.el("div", Html.children(...children)))

/** Create a neutral horizontal layout primitive. */
export const hstack = (...children: ReadonlyArray<MaybeChild>): Type =>
  internal.wrap(Html.el("div", Html.children(...children)))

/** Compatibility alias for the preferred `View.vstack(...)` primitive. */
export const stack = vstack

/** Compatibility alias for the preferred `View.hstack(...)` primitive. */
export const row = hstack

/** Create a button node with broad child content and click handler support. */
export const button = (content: ViewChild, handler: Html.EventHandler): Type =>
  internal.wrap(Html.el("button", Html.on("click", handler), Html.children(content)))

/** Create a router-neutral link node with broad child content. */
export const link = (content: ViewChild, target: LinkTarget): Type =>
  internal.wrap(Html.el("a", ...linkTargetModifiers(target), Html.children(content)))

/** Render content only when a condition is truthy. */
export const when = (condition: unknown, content: MaybeChild): Type => condition ? fragment(content) : fragment()

/** Create a semantic main region. */
export const main = (content: MaybeChild): Type => internal.wrap(Html.el("main", Html.children(content)))

/** Create a semantic aside region. */
export const aside = (content: MaybeChild): Type => internal.wrap(Html.el("aside", Html.children(content)))

/** Create a semantic header region. */
export const header = (content: MaybeChild): Type => internal.wrap(Html.el("header", Html.children(content)))
