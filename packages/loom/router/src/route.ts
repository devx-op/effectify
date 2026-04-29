import * as Effect from "effect/Effect"
import type * as Context from "effect/Context"
import { dual } from "effect/Function"
import * as Schema from "effect/Schema"
import type * as Decode from "./decode.js"
import type * as Fallback from "./fallback.js"
import type * as Layout from "./layout.js"
import type * as Router from "./router.js"
import type * as SubmissionDecode from "./submission.js"
import type { Annotations } from "./internal/annotations.js"
import { emptyAnnotations, getAnnotation as getAnnotationValue } from "./internal/annotations.js"
import { buildUrl, normalizePathname, validateHrefInput } from "./internal/path.js"
import { reflectRoutes } from "./internal/reflection.js"
import * as internal from "./internal/route-dsl.js"

export type AbsolutePath = "/" | `/${string}`

export type RelativePath = string

export type Path = AbsolutePath | RelativePath | ""

export type Params = Readonly<Record<string, string>>

export type SearchValue = string | ReadonlyArray<string>

export type Search = Readonly<Record<string, SearchValue>>

export type { Annotations } from "./internal/annotations.js"

export interface DecodeOptions<ParamsOutput extends Params = Params, SearchOutput extends Search = Search> {
  readonly params?: Decode.DecoderLike<Params, ParamsOutput>
  readonly search?: Decode.DecoderLike<Search, SearchOutput>
}

export type RouteSchema<Value> = Schema.Decoder<Value>

type DecodeOutputOf<Decoder, Fallback> = Decoder extends Decode.DecoderLike<any, infer Output> ? Output : Fallback

type ParamsOutputOf<Decoder> = DecodeOutputOf<Decoder, Params> extends Params ? DecodeOutputOf<Decoder, Params> : Params

type SearchOutputOf<Decoder> = DecodeOutputOf<Decoder, Search> extends Search ? DecodeOutputOf<Decoder, Search> : Search

type ActionInputOutputOf<Decoder, Fallback> = Decoder extends SubmissionDecode.DecoderLike<infer Output> ? Output
  : Fallback

type SchemaOutputOf<SchemaValue, Fallback> = SchemaValue extends RouteSchema<any> ? Schema.Schema.Type<SchemaValue>
  : Fallback

type BivariantCallback<Args extends ReadonlyArray<any>, Return> = {
  bivarianceHack(...args: Args): Return
}["bivarianceHack"]

type ExecuteEffectSuccessOf<Execute> = Execute extends
  (...args: ReadonlyArray<any>) => Effect.Effect<infer Value, any, never> ? Value
  : never

type ExecuteEffectErrorOf<Execute> = Execute extends
  (...args: ReadonlyArray<any>) => Effect.Effect<any, infer Value, never> ? Value
  : never

type ExecuteInputOf<Execute> = Execute extends (input: infer Input) => Effect.Effect<any, any, never> ? Input : never

type ServicesOfInput<Input> = Input extends { readonly services: infer Services } ? Services : never

type ActionValueOfInput<Input> = Input extends { readonly input: infer Value } ? Value : never

export interface ServiceBinding<Services = never> {
  readonly _tag: "LoomRouterServiceBinding"
  readonly _services?: Services
}

export const services = <Services>(): ServiceBinding<Services> => ({
  _tag: "LoomRouterServiceBinding",
} as ServiceBinding<Services>)

type IsNever<Value> = [Value] extends [never] ? true : false

type ModuleLoaderServicesFromExecute<Execute> = ServicesOfInput<ExecuteInputOf<Execute>>

type ModuleLoaderServicesFromOptions<Options extends ModuleLoaderOptions<any, any, any, any, any>> =
  Options["services"] extends ServiceBinding<infer Services> ? Services : never

type ModuleLoaderInferredServices<Execute, Options extends ModuleLoaderOptions<any, any, any, any, any>> =
  IsNever<ModuleLoaderServicesFromOptions<Options>> extends true ? ModuleLoaderServicesFromExecute<Execute>
    : ModuleLoaderServicesFromOptions<Options>

type ModuleActionInputOfExecute<Execute> = ActionValueOfInput<ExecuteInputOf<Execute>>

type ModuleActionServicesFromExecute<Execute> = ServicesOfInput<ExecuteInputOf<Execute>>

type ModuleActionServicesFromOptions<Options extends ModuleActionOptions<any, any, any, any, any, any>> =
  Options["services"] extends ServiceBinding<infer Services> ? Services : never

type ModuleActionInferredServices<Execute, Options extends ModuleActionOptions<any, any, any, any, any, any>> =
  IsNever<ModuleActionServicesFromOptions<Options>> extends true ? ModuleActionServicesFromExecute<Execute>
    : ModuleActionServicesFromOptions<Options>

export type Awaitable<Value> = Value | PromiseLike<Value>

export interface LoaderInput<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Services = never,
> {
  readonly context: Router.Context<ParamsOutput, SearchOutput>
  readonly services: Services
}

export interface LoaderDescriptor<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Data = unknown,
  Error = unknown,
  Services = never,
> {
  readonly _tag?: "LoomRouterLoaderDescriptor"
  readonly load: BivariantCallback<[input: LoaderInput<ParamsOutput, SearchOutput, Services>], Awaitable<Data>>
  readonly mapError: (cause: unknown) => Error
}

export interface ActionContext<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Input = unknown,
  Services = never,
> {
  readonly context: Router.Context<ParamsOutput, SearchOutput>
  readonly input: Input
  readonly services: Services
}

export type ActionInput<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Input = unknown,
  Services = never,
> = ActionContext<ParamsOutput, SearchOutput, Input, Services>

export interface ActionDescriptor<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Input = unknown,
  Result = unknown,
  Error = unknown,
  Services = never,
> {
  readonly _tag?: "LoomRouterActionDescriptor"
  readonly input?: SubmissionDecode.DecoderLike<Input>
  readonly decodeInput?: SubmissionDecode.DecoderLike<Input>
  readonly handle: BivariantCallback<
    [input: ActionContext<ParamsOutput, SearchOutput, Input, Services>],
    Awaitable<Result>
  >
  readonly mapError: (cause: unknown) => Error
}

export type AnyLoaderDescriptor = LoaderDescriptor<any, any, any, any, any>

export type AnyActionDescriptor = ActionDescriptor<any, any, any, any, any, any>

export interface ModuleLoaderInput<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Services = never,
> {
  readonly context: Router.Context<ParamsOutput, SearchOutput>
  readonly params: ParamsOutput
  readonly search: SearchOutput
  readonly services: Services
}

export interface ModuleLoaderOptions<
  ParamsDecoder extends Decode.DecoderLike<Params, any> | undefined = undefined,
  SearchDecoder extends Decode.DecoderLike<Search, any> | undefined = undefined,
  OutputSchema extends RouteSchema<any> | undefined = undefined,
  ErrorSchema extends RouteSchema<any> | undefined = undefined,
  Services = never,
> {
  readonly params?: ParamsDecoder
  readonly search?: SearchDecoder
  readonly output?: OutputSchema
  readonly error?: ErrorSchema
  readonly services?: ServiceBinding<Services>
}

export interface ModuleLoaderDefinition<
  Services = never,
  ParamsDecoder extends Decode.DecoderLike<Params, any> | undefined = undefined,
  SearchDecoder extends Decode.DecoderLike<Search, any> | undefined = undefined,
  OutputSchema extends RouteSchema<any> | undefined = undefined,
  ErrorSchema extends RouteSchema<any> | undefined = undefined,
> extends ModuleLoaderOptions<ParamsDecoder, SearchDecoder, OutputSchema, ErrorSchema, Services> {
  readonly load: (
    input: ModuleLoaderInput<ParamsOutputOf<ParamsDecoder>, SearchOutputOf<SearchDecoder>, Services>,
  ) => Effect.Effect<any, any, never>
}

export type ModuleLoaderContext<
  Options extends ModuleLoaderOptions<any, any, any, any, any> = ModuleLoaderOptions,
  Services = never,
> = ModuleLoaderInput<
  ParamsOutputOf<Options["params"]>,
  SearchOutputOf<Options["search"]>,
  Services
>

export interface ModuleLoader<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Data = unknown,
  Error = unknown,
  Services = never,
> {
  readonly _tag: "LoomRouterModuleLoader"
  readonly decode: DecodeOptions<ParamsOutput, SearchOutput>
  readonly output?: RouteSchema<Data>
  readonly error?: RouteSchema<Error>
  readonly execute: BivariantCallback<
    [input: ModuleLoaderInput<ParamsOutput, SearchOutput, Services>],
    Effect.Effect<Data, Error, never>
  >
}

export interface ModuleActionInput<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Input = unknown,
  Services = never,
> {
  readonly context: Router.Context<ParamsOutput, SearchOutput>
  readonly input: Input
  readonly params: ParamsOutput
  readonly search: SearchOutput
  readonly services: Services
}

export interface ModuleActionOptions<
  ParamsDecoder extends Decode.DecoderLike<Params, any> | undefined = undefined,
  SearchDecoder extends Decode.DecoderLike<Search, any> | undefined = undefined,
  InputDecoder extends SubmissionDecode.DecoderLike<any> | undefined = undefined,
  OutputSchema extends RouteSchema<any> | undefined = undefined,
  ErrorSchema extends RouteSchema<any> | undefined = undefined,
  Services = never,
> {
  readonly params?: ParamsDecoder
  readonly search?: SearchDecoder
  readonly input?: InputDecoder
  readonly output?: OutputSchema
  readonly error?: ErrorSchema
  readonly services?: ServiceBinding<Services>
}

export interface ModuleActionDefinition<
  Services = never,
  ParamsDecoder extends Decode.DecoderLike<Params, any> | undefined = undefined,
  SearchDecoder extends Decode.DecoderLike<Search, any> | undefined = undefined,
  InputDecoder extends SubmissionDecode.DecoderLike<any> | undefined = undefined,
  OutputSchema extends RouteSchema<any> | undefined = undefined,
  ErrorSchema extends RouteSchema<any> | undefined = undefined,
> extends ModuleActionOptions<ParamsDecoder, SearchDecoder, InputDecoder, OutputSchema, ErrorSchema, Services> {
  readonly handle: (
    input: ModuleActionInput<
      ParamsOutputOf<ParamsDecoder>,
      SearchOutputOf<SearchDecoder>,
      ActionInputOutputOf<InputDecoder, unknown>,
      Services
    >,
  ) => Effect.Effect<any, any, never>
}

export type ModuleActionContext<
  Options extends ModuleActionOptions<any, any, any, any, any, any> = ModuleActionOptions,
  Services = never,
> = ModuleActionInput<
  ParamsOutputOf<Options["params"]>,
  SearchOutputOf<Options["search"]>,
  ActionInputOutputOf<Options["input"], unknown>,
  Services
>

export interface ModuleAction<
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Input = unknown,
  Result = unknown,
  Error = unknown,
  Services = never,
> {
  readonly _tag: "LoomRouterModuleAction"
  readonly decode: DecodeOptions<ParamsOutput, SearchOutput>
  readonly input?: SubmissionDecode.DecoderLike<Input>
  readonly output?: RouteSchema<Result>
  readonly error?: RouteSchema<Error>
  readonly execute: BivariantCallback<
    [input: ModuleActionInput<ParamsOutput, SearchOutput, Input, Services>],
    Effect.Effect<Result, Error, never>
  >
}

export type AnyModuleLoader = ModuleLoader<any, any, any, any, any>

export type AnyModuleAction = ModuleAction<any, any, any, any, any, any>

export interface RouteModule<
  Content = unknown,
  Loader extends AnyModuleLoader | undefined = undefined,
  Action extends AnyModuleAction | undefined = undefined,
> {
  readonly component: Content
  readonly loader?: Loader
  readonly action?: Action
}

export type ModuleLoaderParamsOf<Self extends AnyModuleLoader> = Self extends
  ModuleLoader<infer Value, any, any, any, any> ? Value
  : Params

export type ModuleLoaderSearchOf<Self extends AnyModuleLoader> = Self extends
  ModuleLoader<any, infer Value, any, any, any> ? Value
  : Search

export type ModuleLoaderDataOf<Self extends AnyModuleLoader> = Self extends
  ModuleLoader<any, any, infer Value, any, any> ? Value
  : never

export type ModuleLoaderErrorOf<Self extends AnyModuleLoader> = Self extends
  ModuleLoader<any, any, any, infer Value, any> ? Value
  : never

export type ModuleLoaderServicesOf<Self extends AnyModuleLoader> = Self extends
  ModuleLoader<any, any, any, any, infer Value> ? Value
  : never

export type ModuleActionParamsOf<Self extends AnyModuleAction> = Self extends
  ModuleAction<infer Value, any, any, any, any, any> ? Value
  : Params

export type ModuleActionSearchOf<Self extends AnyModuleAction> = Self extends
  ModuleAction<any, infer Value, any, any, any, any> ? Value
  : Search

export type ModuleActionInputOf<Self extends AnyModuleAction> = Self extends
  ModuleAction<any, any, infer Value, any, any, any> ? Value
  : never

export type ModuleActionContextOf<Self extends AnyModuleAction> = ModuleActionInputOf<Self>

export type ModuleActionResultOf<Self extends AnyModuleAction> = Self extends
  ModuleAction<any, any, any, infer Value, any, any> ? Value
  : never

export type ModuleActionErrorOf<Self extends AnyModuleAction> = Self extends
  ModuleAction<any, any, any, any, infer Value, any> ? Value
  : never

export type ModuleActionServicesOf<Self extends AnyModuleAction> = Self extends
  ModuleAction<any, any, any, any, any, infer Value> ? Value
  : never

export type ModuleParamsOf<Loader extends AnyModuleLoader | undefined, Action extends AnyModuleAction | undefined> =
  Loader extends AnyModuleLoader ? ModuleLoaderParamsOf<Loader>
    : Action extends AnyModuleAction ? ModuleActionParamsOf<Action>
    : Params

export type ModuleSearchOf<Loader extends AnyModuleLoader | undefined, Action extends AnyModuleAction | undefined> =
  Loader extends AnyModuleLoader ? ModuleLoaderSearchOf<Loader>
    : Action extends AnyModuleAction ? ModuleActionSearchOf<Action>
    : Search

const isLoaderDescriptor = (value: unknown): value is AnyLoaderDescriptor =>
  typeof value === "object" && value !== null && "load" in value && "mapError" in value

const isActionDescriptor = (value: unknown): value is AnyActionDescriptor =>
  typeof value === "object" && value !== null && "handle" in value && "mapError" in value

const isModuleLoaderDefinition = (value: unknown): value is ModuleLoaderDefinition =>
  typeof value === "object" && value !== null && "load" in value && typeof value.load === "function"

const isModuleActionDefinition = (value: unknown): value is ModuleActionDefinition =>
  typeof value === "object" && value !== null && "handle" in value && typeof value.handle === "function"

const isRouteDefinition = (value: unknown): value is AnyDefinition =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomRouterRoute"

export type AnyDefinition = Definition<any, any, any, any, any, any, any>

interface CommonOptions<
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
> {
  readonly identifier?: Identifier
  readonly content: Content
  readonly decode?: DecodeOptions<ParamsOutput, SearchOutput>
  readonly children?: Children
  readonly layout?: Layout.Definition
  readonly fallback?: Fallback.Config
}

export interface Options<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Identifier extends string | undefined = undefined,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
> extends CommonOptions<Content, ParamsOutput, SearchOutput, Identifier, Children> {
  readonly path: AbsolutePath
}

export interface ChildOptions<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Identifier extends string | undefined = undefined,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
> extends CommonOptions<Content, ParamsOutput, SearchOutput, Identifier, Children> {
  readonly path: RelativePath
}

export interface IndexOptions<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Identifier extends string | undefined = undefined,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
> extends CommonOptions<Content, ParamsOutput, SearchOutput, Identifier, Children> {}

export class UnsupportedPathError extends Error {
  readonly _tag = "LoomRouterUnsupportedPathError"

  constructor(message: string) {
    super(message)
    this.name = "UnsupportedPathError"
  }
}

/** Public route definition contract for the initial Loom router DSL. */
export type Definition<
  Content = unknown,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Identifier extends string | undefined = undefined,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
  Loader extends AnyLoaderDescriptor | undefined = undefined,
  Action extends AnyActionDescriptor | undefined = undefined,
> = internal.RouteDefinition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>

export interface ReflectOptions {
  readonly predicate?: ((options: { readonly route: Definition; readonly path: AbsolutePath }) => boolean) | undefined
  readonly onRoute: (options: {
    readonly route: Definition<any, any, any, any, any>
    readonly path: AbsolutePath
    readonly parents: ReadonlyArray<Definition<any, any, any, any, any>>
    readonly mergedAnnotations: Annotations
    readonly layouts: ReadonlyArray<Layout.Definition>
    readonly fallback: Fallback.Boundaries
  }) => void
}

export interface HrefOptions<ParamsOutput extends Params = Params, SearchOutput extends Search = Search> {
  readonly params?: ParamsOutput
  readonly query?: SearchOutput
  readonly hash?: string
}

/** Extract the content type stored on a route definition. */
export type Content<Self extends AnyDefinition> = Self extends Definition<
  infer Value,
  any,
  any,
  any,
  any,
  any,
  any
> ? Value
  : never

/** Extract the decoded params type stored on a route definition. */
export type ParamsOf<Self extends AnyDefinition> = Self extends Definition<any, infer Value, any, any, any, any, any>
  ? Value
  : never

/** Extract the decoded search type stored on a route definition. */
export type SearchOf<Self extends AnyDefinition> = Self extends Definition<any, any, infer Value, any, any, any, any>
  ? Value
  : never

/** Extract the identifier type stored on a route definition. */
export type IdentifierOf<Self extends AnyDefinition> = Self extends
  Definition<any, any, any, infer Value, any, any, any> ? Value
  : never

/** Extract the concrete child route tuple stored on a route definition. */
export type ChildrenOf<Self extends AnyDefinition> = Self extends Definition<any, any, any, any, infer Children>
  ? Children
  : never

/** Extract the loader descriptor stored on a route definition. */
export type LoaderOf<Self extends AnyDefinition> = Self extends Definition<any, any, any, any, any, infer Loader, any>
  ? Loader
  : never

/** Extract the action descriptor stored on a route definition. */
export type ActionOf<Self extends AnyDefinition> = Self extends Definition<any, any, any, any, any, any, infer Action>
  ? Action
  : never

/** Extract the loaded data type stored on a route definition. */
export type LoadedDataOf<Self extends AnyDefinition> = LoaderOf<Self> extends
  LoaderDescriptor<any, any, infer Data, any, any> ? Data
  : never

/** Extract the loader error type stored on a route definition. */
export type LoaderErrorOf<Self extends AnyDefinition> = LoaderOf<Self> extends
  LoaderDescriptor<any, any, any, infer Error, any> ? Error
  : never

/** Extract the action input type stored on a route definition. */
export type ActionInputOf<Self extends AnyDefinition> = ActionOf<Self> extends
  ActionDescriptor<any, any, infer Input, any, any, any> ? Input
  : never

/** Alias that keeps route authoring focused on action context rather than transport terminology. */
export type ActionContextOf<Self extends AnyDefinition> = ActionInputOf<Self>

/** Extract the action success type stored on a route definition. */
export type ActionResultOf<Self extends AnyDefinition> = ActionOf<Self> extends
  ActionDescriptor<any, any, any, infer Result, any, any> ? Result
  : never

/** Extract the action error type stored on a route definition. */
export type ActionErrorOf<Self extends AnyDefinition> = ActionOf<Self> extends
  ActionDescriptor<any, any, any, any, infer Error, any> ? Error
  : never

/** Extract the loader services type stored on a route definition. */
export type LoaderServicesOf<Self extends AnyDefinition> = LoaderOf<Self> extends
  LoaderDescriptor<any, any, any, any, infer Services> ? Services
  : never

/** Extract the action services type stored on a route definition. */
export type ActionServicesOf<Self extends AnyDefinition> = ActionOf<Self> extends
  ActionDescriptor<any, any, any, any, any, infer Services> ? Services
  : never

type DescendantsFromChildren<Children extends ReadonlyArray<AnyDefinition>> = Children[number] extends infer Child
  ? Child extends AnyDefinition ? Descendants<Child>
  : never
  : never

/** Extract a route plus all nested descendant routes from a route tree. */
export type Descendants<Self extends AnyDefinition> = Self | DescendantsFromChildren<ChildrenOf<Self>>

/** Create a route definition for the initial Loom router DSL. */
export function make<
  Content,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: Options<Content, ParamsOutput, SearchOutput, undefined, Children>,
): Definition<Content, ParamsOutput, SearchOutput, undefined, Children>
export function make<
  Content,
  Identifier extends string,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: Options<Content, ParamsOutput, SearchOutput, Identifier, Children>,
): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
export function make<
  Content,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: Options<Content, ParamsOutput, SearchOutput, string | undefined, Children>,
): Definition<Content, ParamsOutput, SearchOutput, string | undefined, Children> {
  return internal.makeRoute(options)
}

/** Create a nested child route that contributes a single relative path segment. */
export function child<
  Content,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: ChildOptions<Content, ParamsOutput, SearchOutput, undefined, Children>,
): Definition<Content, ParamsOutput, SearchOutput, undefined, Children>
export function child<
  Content,
  Identifier extends string,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: ChildOptions<Content, ParamsOutput, SearchOutput, Identifier, Children>,
): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
export function child<
  Content,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: ChildOptions<Content, ParamsOutput, SearchOutput, string | undefined, Children>,
): Definition<Content, ParamsOutput, SearchOutput, string | undefined, Children> {
  return internal.makeChildRoute(options)
}

/** Create an index child route that matches the parent path exactly. */
export function index<
  Content,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: IndexOptions<Content, ParamsOutput, SearchOutput, undefined, Children>,
): Definition<Content, ParamsOutput, SearchOutput, undefined, Children>
export function index<
  Content,
  Identifier extends string,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: IndexOptions<Content, ParamsOutput, SearchOutput, Identifier, Children>,
): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
export function index<
  Content,
  ParamsOutput extends Params = Params,
  SearchOutput extends Search = Search,
  Children extends ReadonlyArray<AnyDefinition> = readonly [],
>(
  options: IndexOptions<Content, ParamsOutput, SearchOutput, string | undefined, Children>,
): Definition<Content, ParamsOutput, SearchOutput, string | undefined, Children> {
  return internal.makeIndexRoute(options)
}

/** Prefix a route tree with an absolute pathname. */
export const prefix: {
  (path: AbsolutePath): <
    Content,
    ParamsOutput extends Params,
    SearchOutput extends Search,
    Identifier extends string | undefined,
    Children extends ReadonlyArray<AnyDefinition>,
  >(
    self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  ) => Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
  <
    Content,
    ParamsOutput extends Params,
    SearchOutput extends Search,
    Identifier extends string | undefined,
    Children extends ReadonlyArray<AnyDefinition>,
  >(
    self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
    path: AbsolutePath,
  ): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
} = dual(2, <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  path: AbsolutePath,
): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children> => internal.prefixRoute(self, path))

/** Add a single Effect Context annotation to a route. */
export const annotate: {
  <I, S>(tag: Context.Service<I, S>, value: S): <
    Content,
    ParamsOutput extends Params,
    SearchOutput extends Search,
    Identifier extends string | undefined,
    Children extends ReadonlyArray<AnyDefinition>,
  >(
    self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  ) => Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
  <
    Content,
    ParamsOutput extends Params,
    SearchOutput extends Search,
    Identifier extends string | undefined,
    Children extends ReadonlyArray<AnyDefinition>,
    I,
    S,
  >(
    self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
    tag: Context.Service<I, S>,
    value: S,
  ): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
} = dual(3, <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  I,
  S,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  tag: Context.Service<I, S>,
  value: S,
): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children> => internal.annotateRoute(self, tag, value))

/** Merge multiple Effect Context annotations into a route. */
export const annotateMerge: {
  (annotations: Annotations): <
    Content,
    ParamsOutput extends Params,
    SearchOutput extends Search,
    Identifier extends string | undefined,
    Children extends ReadonlyArray<AnyDefinition>,
  >(
    self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  ) => Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
  <
    Content,
    ParamsOutput extends Params,
    SearchOutput extends Search,
    Identifier extends string | undefined,
    Children extends ReadonlyArray<AnyDefinition>,
  >(
    self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
    annotations: Annotations,
  ): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>
} = dual(2, <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children>,
  annotations: Annotations,
): Definition<Content, ParamsOutput, SearchOutput, Identifier, Children> =>
  internal.annotateRouteMerge(self, annotations))

/** Attach a loader descriptor to a route without executing it during assembly. */
export function loader(): <Data, Error, Services>(
  execute: (input: ModuleLoaderInput<Params, Search, Services>) => Effect.Effect<Data, Error, never>,
) => ModuleLoader<Params, Search, Data, Error, Services>
export function loader<
  Services = never,
  ParamsDecoder extends Decode.DecoderLike<Params, any> | undefined = undefined,
  SearchDecoder extends Decode.DecoderLike<Search, any> | undefined = undefined,
  OutputSchema extends RouteSchema<any> | undefined = undefined,
  ErrorSchema extends RouteSchema<any> | undefined = undefined,
>(
  definition: ModuleLoaderDefinition<Services, ParamsDecoder, SearchDecoder, OutputSchema, ErrorSchema>,
): ModuleLoader<
  ParamsOutputOf<ParamsDecoder>,
  SearchOutputOf<SearchDecoder>,
  SchemaOutputOf<OutputSchema, ExecuteEffectSuccessOf<typeof definition.load>>,
  SchemaOutputOf<ErrorSchema, ExecuteEffectErrorOf<typeof definition.load>>,
  Services
>
export function loader<
  Options extends ModuleLoaderOptions<any, any, any, any, any>,
>(
  options: Options,
): <
  Execute extends (
    input: ModuleLoaderInput<
      ParamsOutputOf<Options["params"]>,
      SearchOutputOf<Options["search"]>,
      ModuleLoaderInferredServices<Execute, Options>
    >,
  ) => Effect.Effect<any, any, never>,
>(
  execute: Execute,
) => ModuleLoader<
  ParamsOutputOf<Options["params"]>,
  SearchOutputOf<Options["search"]>,
  SchemaOutputOf<Options["output"], ExecuteEffectSuccessOf<Execute>>,
  SchemaOutputOf<Options["error"], ExecuteEffectErrorOf<Execute>>,
  ModuleLoaderInferredServices<Execute, Options>
>
export function loader<ParamsOutput extends Params, SearchOutput extends Search, Data, Error, Services>(
  descriptor: LoaderDescriptor<ParamsOutput, SearchOutput, Data, Error, Services>,
): <
  Content,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, any, Action>,
) => Definition<
  Content,
  ParamsOutput,
  SearchOutput,
  Identifier,
  Children,
  LoaderDescriptor<ParamsOutput, SearchOutput, Data, Error, Services>,
  Action
>
export function loader<
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Action extends AnyActionDescriptor | undefined,
  Data,
  Error,
  Services,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, any, Action>,
  descriptor: LoaderDescriptor<ParamsOutput, SearchOutput, Data, Error, Services>,
): Definition<
  Content,
  ParamsOutput,
  SearchOutput,
  Identifier,
  Children,
  LoaderDescriptor<ParamsOutput, SearchOutput, Data, Error, Services>,
  Action
>
export function loader(
  first?: any,
  second?: any,
): any {
  if (isRouteDefinition(first) && second !== undefined) {
    return internal.attachLoader(first, second)
  }

  if (isLoaderDescriptor(first)) {
    return (self: AnyDefinition) => internal.attachLoader(self, first)
  }

  if (isModuleLoaderDefinition(first)) {
    return {
      _tag: "LoomRouterModuleLoader",
      decode: {
        params: first.params,
        search: first.search,
      },
      error: first.error,
      output: first.output,
      execute: first.load,
    }
  }

  const options = isRouteDefinition(first) ? undefined : first

  return <Data, Error, Services>(
    execute: (input: ModuleLoaderInput<any, any, Services>) => Effect.Effect<Data, Error, never>,
  ): ModuleLoader<any, any, Data, Error, Services> => ({
    _tag: "LoomRouterModuleLoader",
    decode: {
      params: options?.params,
      search: options?.search,
    },
    error: options?.error,
    output: options?.output,
    execute,
  })
}

/** Attach an action descriptor to a route without executing it during assembly. */
export function action(): <Result, Error, Services>(
  execute: (input: ModuleActionInput<Params, Search, unknown, Services>) => Effect.Effect<Result, Error, never>,
) => ModuleAction<Params, Search, unknown, Result, Error, Services>
export function action<
  Services = never,
  ParamsDecoder extends Decode.DecoderLike<Params, any> | undefined = undefined,
  SearchDecoder extends Decode.DecoderLike<Search, any> | undefined = undefined,
  InputDecoder extends SubmissionDecode.DecoderLike<any> | undefined = undefined,
  OutputSchema extends RouteSchema<any> | undefined = undefined,
  ErrorSchema extends RouteSchema<any> | undefined = undefined,
>(
  definition: ModuleActionDefinition<
    Services,
    ParamsDecoder,
    SearchDecoder,
    InputDecoder,
    OutputSchema,
    ErrorSchema
  >,
): ModuleAction<
  ParamsOutputOf<ParamsDecoder>,
  SearchOutputOf<SearchDecoder>,
  ActionInputOutputOf<InputDecoder, ModuleActionInputOfExecute<typeof definition.handle>>,
  SchemaOutputOf<OutputSchema, ExecuteEffectSuccessOf<typeof definition.handle>>,
  SchemaOutputOf<ErrorSchema, ExecuteEffectErrorOf<typeof definition.handle>>,
  Services
>
export function action<
  Options extends ModuleActionOptions<any, any, any, any, any, any>,
>(
  options: Options,
): <
  Execute extends (
    input: ModuleActionInput<
      ParamsOutputOf<Options["params"]>,
      SearchOutputOf<Options["search"]>,
      ActionInputOutputOf<Options["input"], unknown>,
      ModuleActionInferredServices<Execute, Options>
    >,
  ) => Effect.Effect<any, any, never>,
>(
  execute: Execute,
) => ModuleAction<
  ParamsOutputOf<Options["params"]>,
  SearchOutputOf<Options["search"]>,
  ActionInputOutputOf<Options["input"], ModuleActionInputOfExecute<Execute>>,
  SchemaOutputOf<Options["output"], ExecuteEffectSuccessOf<Execute>>,
  SchemaOutputOf<Options["error"], ExecuteEffectErrorOf<Execute>>,
  ModuleActionInferredServices<Execute, Options>
>
export function action<ParamsOutput extends Params, SearchOutput extends Search, Input, Result, Error, Services>(
  descriptor: ActionDescriptor<ParamsOutput, SearchOutput, Input, Result, Error, Services>,
): <
  Content,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, any>,
) => Definition<
  Content,
  ParamsOutput,
  SearchOutput,
  Identifier,
  Children,
  Loader,
  ActionDescriptor<ParamsOutput, SearchOutput, Input, Result, Error, Services>
>
export function action<
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Input,
  Result,
  Error,
  Services,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, any>,
  descriptor: ActionDescriptor<ParamsOutput, SearchOutput, Input, Result, Error, Services>,
): Definition<
  Content,
  ParamsOutput,
  SearchOutput,
  Identifier,
  Children,
  Loader,
  ActionDescriptor<ParamsOutput, SearchOutput, Input, Result, Error, Services>
>
export function action(
  first?: any,
  second?: any,
): any {
  if (isRouteDefinition(first) && second !== undefined) {
    return internal.attachAction(first, second)
  }

  if (isActionDescriptor(first)) {
    return (self: AnyDefinition) => internal.attachAction(self, first)
  }

  if (isModuleActionDefinition(first)) {
    return {
      _tag: "LoomRouterModuleAction",
      decode: {
        params: first.params,
        search: first.search,
      },
      error: first.error,
      input: first.input,
      output: first.output,
      execute: first.handle,
    }
  }

  const options = isRouteDefinition(first) ? undefined : first

  return <Result, Error, Services>(
    execute: (input: ModuleActionInput<any, any, any, Services>) => Effect.Effect<Result, Error, never>,
  ): ModuleAction<any, any, any, Result, Error, Services> => ({
    _tag: "LoomRouterModuleAction",
    decode: {
      params: options?.params,
      search: options?.search,
    },
    error: options?.error,
    input: options?.input,
    output: options?.output,
    execute,
  })
}

/** Read the stable route path. */
export const path = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>,
): Path => self.path

/** Read the optional stable route identifier. */
export const identifier = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>): Identifier =>
  self.identifier

/** Read the route content payload. */
export const content = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>,
): Content => self.content

/** Read the route children. */
export const children = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>,
): Children => self.children

/** Read the optional loader descriptor stored on a route. */
export const getLoader = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>,
): Loader => self.loader

/** Read the optional action descriptor stored on a route. */
export const getAction = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>,
): Action => self.action

/** Check whether a route has a loader descriptor attached. */
export const hasLoader = <Self extends AnyDefinition>(
  self: Self,
): self is Self & { readonly loader: Exclude<LoaderOf<Self>, undefined> } => self.loader !== undefined

/** Check whether a route has an action descriptor attached. */
export const hasAction = <Self extends AnyDefinition>(
  self: Self,
): self is Self & { readonly action: Exclude<ActionOf<Self>, undefined> } => self.action !== undefined

/** Read a single annotation value from a merged annotation map. */
export const getAnnotation = <I, S>(annotations: Annotations, tag: Context.Service<I, S>): unknown =>
  getAnnotationValue(annotations, tag)

/** Encode a stable href for an absolute route definition. */
export const href = <
  Content,
  ParamsOutput extends Params,
  SearchOutput extends Search,
  Identifier extends string | undefined,
  Children extends ReadonlyArray<AnyDefinition>,
  Loader extends AnyLoaderDescriptor | undefined,
  Action extends AnyActionDescriptor | undefined,
>(
  self: Definition<Content, ParamsOutput, SearchOutput, Identifier, Children, Loader, Action>,
  options?: HrefOptions<ParamsOutput, SearchOutput>,
  base?: string | URL,
): string => {
  const pathname = self.path

  if (!pathname.startsWith("/")) {
    throw new UnsupportedPathError(
      "Route.href(...) only supports absolute routes. Use Router.href(router, route, ...) for relative child/index routes.",
    )
  }

  validateHrefInput({
    params: options?.params,
    search: options?.query,
    decode: self.decode,
  })

  return buildUrl(
    {
      pathname: normalizePathname(pathname),
      params: options?.params,
      search: options?.query,
      hash: options?.hash,
    },
    base,
  ).toString()
}

/** Reflect a route tree into effective pathnames and merged annotations. */
export const reflect = (self: Definition, options: ReflectOptions): void => {
  const predicate = options.predicate

  reflectRoutes([self], {
    inheritedAnnotations: emptyAnnotations(),
    inheritedFallback: {},
    inheritedLayouts: [],
    predicate: predicate === undefined ? undefined : (route) => predicate({ route: route.route, path: route.path }),
    onRoute: (route) => {
      options.onRoute({
        route: route.route,
        path: route.path,
        parents: route.parents,
        mergedAnnotations: route.mergedAnnotations,
        layouts: route.layouts,
        fallback: route.fallback,
      })
    },
  })
}
