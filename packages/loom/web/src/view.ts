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
type ReactiveInput<Value> = Value | (() => Value)

export interface ForOptions<Item, Key extends PropertyKey = PropertyKey> {
  readonly key: (item: Item, index: number) => Key
  readonly render: (item: Item, index: number) => MaybeChild
  readonly empty?: MaybeChild
}

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

const textChildNode = (value: string | (() => string)): LoomCore.Ast.Node =>
  typeof value === "function"
    ? LoomCore.Ast.dynamicText(value)
    : LoomCore.Ast.text(value)

const normalizeNode = (child: MaybeChild): LoomCore.Ast.Node => {
  const normalized = viewChild.normalizeViewChild(child)

  if (normalized.length === 0) {
    return LoomCore.Ast.fragment([])
  }

  return normalized.length === 1 ? normalized[0] : LoomCore.Ast.fragment(normalized)
}

const renderSnapshotForItems = <Item>(
  items: ReadonlyArray<Item>,
  options: ForOptions<Item>,
): Type =>
  items.length === 0
    ? fragment(options.empty)
    : fragment(...items.map((item, index) => options.render(item, index)))

/** Create a renderer-neutral text view backed by an inline element root. */
export function text(value: string): Type
export function text(render: () => string): Type
export function text(value: string | (() => string)): Type {
  return internal.wrap(Html.el("span", Html.children(textChildNode(value))))
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

const renderIf = (condition: ReactiveInput<boolean>, content: MaybeChild, otherwise?: MaybeChild): Type => {
  if (typeof condition === "function") {
    return internal.wrap(
      LoomCore.Ast.ifNode(
        condition,
        normalizeNode(content),
        otherwise === undefined ? undefined : normalizeNode(otherwise),
      ),
    )
  }

  return condition ? fragment(content) : fragment(otherwise)
}

/** Render exactly one branch from an explicit boolean condition. */
export function ifView(condition: boolean, content: MaybeChild, otherwise?: MaybeChild): Type
export function ifView(condition: () => boolean, content: MaybeChild, otherwise?: MaybeChild): Type
export function ifView(condition: ReactiveInput<boolean>, content: MaybeChild, otherwise?: MaybeChild): Type {
  return renderIf(condition, content, otherwise)
}

const renderWhen = (condition: unknown | (() => unknown), content: MaybeChild, otherwise?: MaybeChild): Type =>
  typeof condition === "function"
    ? renderIf(() => Boolean(condition()), content, otherwise)
    : renderIf(Boolean(condition), content, otherwise)

/** Render content only when a condition is truthy. */
export function whenView(condition: unknown, content: MaybeChild, otherwise?: MaybeChild): Type
export function whenView(condition: () => unknown, content: MaybeChild, otherwise?: MaybeChild): Type
export function whenView(condition: unknown | (() => unknown), content: MaybeChild, otherwise?: MaybeChild): Type {
  return renderWhen(condition, content, otherwise)
}

const forViewImpl = <Item, Key extends PropertyKey>(
  items: ReactiveInput<ReadonlyArray<Item>>,
  options: ForOptions<Item, Key>,
): Type => {
  if (typeof items === "function") {
    return internal.wrap(
      LoomCore.Ast.forEach(() => items(), {
        key: options.key,
        render: (item, index) => normalizeNode(options.render(item, index)),
        fallback: options.empty === undefined ? undefined : normalizeNode(options.empty),
      }),
    )
  }

  return renderSnapshotForItems(items, options)
}

/** Render a keyed list with explicit snapshot vs tracked collection semantics. */
export function forView<Item, Key extends PropertyKey>(items: ReadonlyArray<Item>, options: ForOptions<Item, Key>): Type
export function forView<Item, Key extends PropertyKey>(
  items: () => ReadonlyArray<Item>,
  options: ForOptions<Item, Key>,
): Type
export function forView<Item, Key extends PropertyKey>(
  items: ReactiveInput<ReadonlyArray<Item>>,
  options: ForOptions<Item, Key>,
): Type {
  return forViewImpl(items, options)
}

export { forView as for, ifView as if, whenView as when }

/** Create a semantic main region. */
export const main = (content: MaybeChild): Type => internal.wrap(Html.el("main", Html.children(content)))

/** Create a semantic aside region. */
export const aside = (content: MaybeChild): Type => internal.wrap(Html.el("aside", Html.children(content)))

/** Create a semantic header region. */
export const header = (content: MaybeChild): Type => internal.wrap(Html.el("header", Html.children(content)))
