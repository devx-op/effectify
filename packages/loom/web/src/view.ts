import * as LoomCore from "@effectify/loom-core"
import * as Result from "effect/Result"
import * as Component from "./component.js"
import * as Html from "./html.js"
import * as Slot from "./slot.js"
import * as Template from "./template.js"
import * as viewChild from "./internal/view-child.js"

export type Type<E = never, R = never> = Template.Renderable<E, R>
export type Node = LoomCore.Ast.Node
export type Renderable<E = never, R = never> = Template.Renderable<E, R>
export type ViewChild = viewChild.ViewChild
export type Child = ViewChild
export type MaybeChild = ViewChild
export type SlotDefinition = Slot.Definition
type ReactiveInput<Value> = Value | (() => Value)
type HandlerRenderable = Template.Renderable<any, any>
type TaggedUnion = { readonly _tag: string }
type MatchSource<Value> = Value | (() => Value)
type ErrorOf<Value> = Template.ErrorOfRenderable<Value>
type RequirementsOf<Value> = Template.RequirementsOfRenderable<Value>
type HandlerOutput = (...args: ReadonlyArray<any>) => HandlerRenderable
type ErrorOfHandler<Handler> = Handler extends HandlerOutput ? ErrorOf<ReturnType<Handler>> : never
type RequirementsOfHandler<Handler> = Handler extends HandlerOutput ? RequirementsOf<ReturnType<Handler>> : never
type ErrorOfHandlers<Handlers> = {
  readonly [Key in keyof Handlers]: ErrorOfHandler<Handlers[Key]>
}[keyof Handlers]
type RequirementsOfHandlers<Handlers> = {
  readonly [Key in keyof Handlers]: RequirementsOfHandler<Handlers[Key]>
}[keyof Handlers]
type RequiredPropKeys<Props> = [Props] extends [never] ? never
  : [NonNullable<Props>] extends [never] ? never
  : NonNullable<Props> extends object ? {
      readonly [Key in keyof NonNullable<Props>]-?: undefined extends NonNullable<Props>[Key] ? never : Key
    }[keyof NonNullable<Props>]
  : never
type NoRequiredProps<Props> = [RequiredPropKeys<Props>] extends [never] ? true : false
type ChildShorthandComponent<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
> = NoRequiredProps<Props> extends true ? Component.Type<Props, Err, Requirements, Model, Actions, {}, true> : never
type SlotShorthandComponent<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
  Slots extends Component.SlotShape,
> = NoRequiredProps<Props> extends true ? Component.Type<Props, Err, Requirements, Model, Actions, Slots, false> : never

export type AsyncResult<Success, Failure = never, Error = never> =
  | { readonly _tag: "Waiting" }
  | { readonly _tag: "Success"; readonly success: Success }
  | { readonly _tag: "Failure"; readonly failure: Failure }
  | { readonly _tag: "Error"; readonly error: Error }
  | { readonly _tag: "Defect"; readonly defect: unknown }

export interface ResultMatchHandlers<Success, Failure> {
  readonly onSuccess: (value: Success) => HandlerRenderable
  readonly onFailure: (error: Failure) => HandlerRenderable
}

export interface AsyncResultMatchHandlers<Success, Failure, Error> extends ResultMatchHandlers<Success, Failure> {
  readonly onWaiting?: () => HandlerRenderable
  readonly onError?: (error: Error) => HandlerRenderable
  readonly onDefect?: (defect: unknown) => HandlerRenderable
}

type TaggedMatchHandlers<Value extends TaggedUnion> = Readonly<
  & {
    readonly [Key in Value["_tag"]]?: (value: Extract<Value, { readonly _tag: Key }>) => HandlerRenderable
  }
  & {
    readonly orElse?: (value: Value) => HandlerRenderable
  }
>

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

const asRenderable = <E = never, R = never>(node: LoomCore.Ast.Node): Renderable<E, R> => Template.renderable(node)

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
): Renderable =>
  items.length === 0
    ? fragment(options.empty)
    : fragment(...items.map((item, index) => options.render(item, index)))

/** Create a renderer-neutral text view backed by an inline element root. */
export function text(value: string): Renderable
export function text(render: () => string): Renderable
export function text(value: string | (() => string)): Renderable {
  return asRenderable(Html.el("span", Html.children(textChildNode(value))))
}

/** Create a renderer-neutral fragment. */
export const fragment = (...children: ReadonlyArray<MaybeChild>): Renderable =>
  asRenderable({
    _tag: "Fragment",
    children: viewChild.normalizeViewChildren(children),
  })

/** Create a neutral vertical layout primitive. */
export const vstack = (...children: ReadonlyArray<MaybeChild>): Renderable =>
  asRenderable(Html.el("div", Html.children(...children)))

/** Create a neutral horizontal layout primitive. */
export const hstack = (...children: ReadonlyArray<MaybeChild>): Renderable =>
  asRenderable(Html.el("div", Html.children(...children)))

/** Compatibility alias for the preferred `View.vstack(...)` primitive. */
export const stack = vstack

/** Compatibility alias for the preferred `View.hstack(...)` primitive. */
export const row = hstack

/** Create a button node with broad child content and click handler support. */
export const button = (content: ViewChild, handler: Html.EventHandler): Renderable =>
  asRenderable(Html.el("button", Html.on("click", handler), Html.children(content)))

/** Create the first text-input primitive backed by a text input element. */
export const input = (): Renderable => asRenderable(Html.el("input", Html.attr("type", "text")))

/** Create a router-neutral link node with broad child content. */
export const link = (content: ViewChild, target: LinkTarget): Renderable =>
  asRenderable(Html.el("a", ...linkTargetModifiers(target), Html.children(content)))

const renderIf = (condition: ReactiveInput<boolean>, content: MaybeChild, otherwise?: MaybeChild): Renderable => {
  if (typeof condition === "function") {
    return asRenderable(
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
export function ifView(condition: boolean, content: MaybeChild, otherwise?: MaybeChild): Renderable
export function ifView(condition: () => boolean, content: MaybeChild, otherwise?: MaybeChild): Renderable
export function ifView(condition: ReactiveInput<boolean>, content: MaybeChild, otherwise?: MaybeChild): Renderable {
  return renderIf(condition, content, otherwise)
}

const renderWhen = (condition: unknown | (() => unknown), content: MaybeChild, otherwise?: MaybeChild): Renderable =>
  typeof condition === "function"
    ? renderIf(() => Boolean(condition()), content, otherwise)
    : renderIf(Boolean(condition), content, otherwise)

/** Render content only when a condition is truthy. */
export function whenView(condition: unknown, content: MaybeChild, otherwise?: MaybeChild): Renderable
export function whenView(condition: () => unknown, content: MaybeChild, otherwise?: MaybeChild): Renderable
export function whenView(
  condition: unknown | (() => unknown),
  content: MaybeChild,
  otherwise?: MaybeChild,
): Renderable {
  return renderWhen(condition, content, otherwise)
}

const forViewImpl = <Item, Key extends PropertyKey>(
  items: ReactiveInput<ReadonlyArray<Item>>,
  options: ForOptions<Item, Key>,
): Renderable => {
  if (typeof items === "function") {
    return asRenderable(
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
export function forView<Item, Key extends PropertyKey>(
  items: ReadonlyArray<Item>,
  options: ForOptions<Item, Key>,
): Renderable
export function forView<Item, Key extends PropertyKey>(
  items: () => ReadonlyArray<Item>,
  options: ForOptions<Item, Key>,
): Renderable
export function forView<Item, Key extends PropertyKey>(
  items: ReactiveInput<ReadonlyArray<Item>>,
  options: ForOptions<Item, Key>,
): Renderable {
  return forViewImpl(items, options)
}

export { forView as for, ifView as if, whenView as when }

const isAsyncResult = (value: unknown): value is AsyncResult<unknown, unknown, unknown> =>
  typeof value === "object" && value !== null && "_tag" in value
  && ["Waiting", "Success", "Failure", "Error", "Defect"].includes((value as { readonly _tag: string })._tag)

const isTaggedUnion = (value: unknown): value is TaggedUnion =>
  typeof value === "object" && value !== null && "_tag" in value &&
  typeof (value as { readonly _tag: unknown })._tag === "string"

const matchResultLike = <Success, Failure>(
  source: Result.Result<Success, Failure>,
  handlers: ResultMatchHandlers<Success, Failure>,
): HandlerRenderable =>
  Result.isSuccess(source) ? handlers.onSuccess(source.success) : handlers.onFailure(source.failure)

const matchAsyncResultLike = <Success, Failure, Error>(
  source: AsyncResult<Success, Failure, Error>,
  handlers: AsyncResultMatchHandlers<Success, Failure, Error>,
): HandlerRenderable => {
  switch (source._tag) {
    case "Waiting":
      return handlers.onWaiting?.() ?? fragment()
    case "Success":
      return handlers.onSuccess(source.success)
    case "Failure":
      return handlers.onFailure(source.failure)
    case "Error":
      return handlers.onError?.(source.error) ?? fragment()
    case "Defect":
      return handlers.onDefect?.(source.defect) ?? fragment()
  }
}

const matchTaggedUnion = <Value extends TaggedUnion>(
  source: Value,
  handlers: TaggedMatchHandlers<Value>,
): HandlerRenderable => {
  const handler = handlers[source._tag as Value["_tag"]]
  return handler === undefined ? handlers.orElse?.(source) ?? fragment() : handler(source as never)
}

const matchStatic = (source: unknown, handlers: MatchHandlers): HandlerRenderable => {
  if (Result.isResult(source)) {
    return matchResultLike(source, handlers as ResultMatchHandlers<unknown, unknown>)
  }

  if (isAsyncResult(source)) {
    return matchAsyncResultLike(source, handlers as AsyncResultMatchHandlers<unknown, unknown, unknown>)
  }

  if (isTaggedUnion(source)) {
    return matchTaggedUnion(source, handlers as TaggedMatchHandlers<TaggedUnion>)
  }

  return fragment()
}

type MatchHandlers =
  | ResultMatchHandlers<unknown, unknown>
  | AsyncResultMatchHandlers<unknown, unknown, unknown>
  | TaggedMatchHandlers<TaggedUnion>

export function match<Success, Failure, Handlers extends ResultMatchHandlers<Success, Failure>>(
  source: MatchSource<Result.Result<Success, Failure>>,
  handlers: Handlers,
): Renderable<ErrorOfHandlers<Handlers>, RequirementsOfHandlers<Handlers>>
export function match<Success, Failure, Error, Handlers extends AsyncResultMatchHandlers<Success, Failure, Error>>(
  source: MatchSource<AsyncResult<Success, Failure, Error>>,
  handlers: Handlers,
): Renderable<ErrorOfHandlers<Handlers>, RequirementsOfHandlers<Handlers>>
export function match<Value extends TaggedUnion, Handlers extends TaggedMatchHandlers<Value>>(
  source: MatchSource<Value>,
  handlers: Handlers,
): Renderable<ErrorOfHandlers<Handlers>, RequirementsOfHandlers<Handlers>>
export function match(source: MatchSource<unknown>, handlers: MatchHandlers): Renderable {
  if (typeof handlers !== "object" || handlers === null) {
    return fragment()
  }

  if (typeof source === "function") {
    return asRenderable(LoomCore.Ast.computed(() => normalizeNode(matchStatic(source(), handlers))))
  }

  return matchStatic(source, handlers)
}

const wrapBoundary = <E, R, NextError = E, NextRequirements = R>(
  renderable: Renderable<E, R>,
  scope: LoomCore.Ast.BoundaryNode["scope"],
): Renderable<NextError, NextRequirements> =>
  asRenderable(LoomCore.Ast.boundary(renderable, scope)) as Renderable<NextError, NextRequirements>

export const catchTag = <Tag extends string, Fallback extends HandlerRenderable>(
  tag: Tag,
  _handler: (error: Extract<{ readonly _tag: Tag }, { readonly _tag: Tag }>) => Fallback,
): <E, R>(
  self: Renderable<E, R>,
) => Renderable<Exclude<E, Extract<E, { readonly _tag: Tag }>> | ErrorOf<Fallback>, R | RequirementsOf<Fallback>> => (<
  E,
  R,
>(self: Renderable<E, R>) =>
  wrapBoundary(self, { errors: [tag] }) as Renderable<
    Exclude<E, Extract<E, { readonly _tag: Tag }>> | ErrorOf<Fallback>,
    R | RequirementsOf<Fallback>
  >)

export const catchAll = <Fallback extends HandlerRenderable>(
  _handler: (error: never) => Fallback,
): <E, R>(
  self: Renderable<E, R>,
) => Renderable<ErrorOf<Fallback>, R | RequirementsOf<Fallback>> => (<E, R>(self: Renderable<E, R>) =>
  wrapBoundary(self, { errors: "all" }) as Renderable<ErrorOf<Fallback>, R | RequirementsOf<Fallback>>)

export const provide = (
  _provided: unknown,
): <E, R>(
  self: Renderable<E, R>,
) => Renderable<E, never> => (<E, R>(self: Renderable<E, R>) =>
  wrapBoundary(self, { requirementsHandled: true }) as Renderable<E, never>)

export const provideService = (
  _service: unknown,
): <E, R>(
  self: Renderable<E, R>,
) => Renderable<E, never> => (<E, R>(self: Renderable<E, R>) =>
  wrapBoundary(self, { requirementsHandled: true }) as Renderable<E, never>)

export function use<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
>(
  component: ChildShorthandComponent<Props, Err, Requirements, Model, Actions>,
): Renderable<Err, Requirements>
export function use<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
>(
  component: ChildShorthandComponent<Props, Err, Requirements, Model, Actions>,
  children: ViewChild,
): Renderable<Err, Requirements>
export function use<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
>(
  component: Component.Type<Props, Err, Requirements, Model, Actions, {}, true>,
  props: Props,
  children: ViewChild,
): Renderable<Err, Requirements>
export function use<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
  Slots extends Component.SlotShape,
>(
  component: SlotShorthandComponent<Props, Err, Requirements, Model, Actions, Slots>,
  slots: Component.SlotInput<Slots>,
): Renderable<Err, Requirements>
export function use<
  Props,
  Err,
  Requirements,
  Model extends Component.ModelShape,
  Actions extends Component.ActionShape,
  Slots extends Component.SlotShape,
>(
  component: Component.Type<Props, Err, Requirements, Model, Actions, Slots, false>,
  props: Props,
  slots: Component.SlotInput<Slots>,
): Renderable<Err, Requirements>
export function use(component: Component.Type, propsOrComposition?: unknown, composition?: unknown): Renderable {
  return Component.use(component as never, propsOrComposition as never, composition as never) as Renderable
}

/** Create a semantic main region. */
export const main = (content: MaybeChild): Renderable => asRenderable(Html.el("main", Html.children(content)))

/** Create a semantic aside region. */
export const aside = (content: MaybeChild): Renderable => asRenderable(Html.el("aside", Html.children(content)))

/** Create a semantic header region. */
export const header = (content: MaybeChild): Renderable => asRenderable(Html.el("header", Html.children(content)))
