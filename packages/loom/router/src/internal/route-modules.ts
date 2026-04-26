import * as Effect from "effect/Effect"
import * as Route from "../route.js"
import * as RouteErrors from "./route-errors.js"

type CompiledLoader<Loader extends Route.AnyModuleLoader | undefined> = Loader extends Route.AnyModuleLoader
  ? Route.LoaderDescriptor<
    Route.ModuleLoaderParamsOf<Loader>,
    Route.ModuleLoaderSearchOf<Loader>,
    Route.ModuleLoaderDataOf<Loader>,
    RouteErrors.RouteLoaderFailure<Route.ModuleLoaderErrorOf<Loader>> | RouteErrors.RouteLoaderDefect,
    Route.ModuleLoaderServicesOf<Loader>
  >
  : undefined

type CompiledAction<Action extends Route.AnyModuleAction | undefined> = Action extends Route.AnyModuleAction
  ? Route.ActionDescriptor<
    Route.ModuleActionParamsOf<Action>,
    Route.ModuleActionSearchOf<Action>,
    Route.ModuleActionInputOf<Action>,
    Route.ModuleActionResultOf<Action>,
    RouteErrors.RouteActionFailure<Route.ModuleActionErrorOf<Action>> | RouteErrors.RouteActionDefect,
    Route.ModuleActionServicesOf<Action>
  >
  : undefined

type CompiledRouteModule<
  Content,
  Loader extends Route.AnyModuleLoader | undefined,
  Action extends Route.AnyModuleAction | undefined,
  Identifier extends string | undefined,
> = Route.Definition<
  Content,
  Route.ModuleParamsOf<Loader, Action>,
  Route.ModuleSearchOf<Loader, Action>,
  Identifier,
  readonly [],
  CompiledLoader<Loader>,
  CompiledAction<Action>
>

const isModuleLoader = (value: unknown): value is Route.AnyModuleLoader =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomRouterModuleLoader"

const isModuleAction = (value: unknown): value is Route.AnyModuleAction =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "LoomRouterModuleAction"

const executeModuleLoader = <
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Data,
  Error,
  Services,
>(
  execute: (
    input: Route.ModuleLoaderInput<ParamsOutput, SearchOutput, Services>,
  ) => Effect.Effect<Data, Error, never>,
  input: Route.ModuleLoaderInput<ParamsOutput, SearchOutput, Services>,
): Effect.Effect<Data, Error, never> => execute(input)

const executeModuleAction = <
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Input,
  Result,
  Error,
  Services,
>(
  execute: (
    input: Route.ModuleActionInput<ParamsOutput, SearchOutput, Input, Services>,
  ) => Effect.Effect<Result, Error, never>,
  input: Route.ModuleActionInput<ParamsOutput, SearchOutput, Input, Services>,
): Effect.Effect<Result, Error, never> => execute(input)

const compileLoader = <
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Data,
  Error,
  Services,
>(loader: Route.ModuleLoader<ParamsOutput, SearchOutput, Data, Error, Services>): Route.LoaderDescriptor<
  ParamsOutput,
  SearchOutput,
  Data,
  RouteErrors.RouteLoaderFailure<Error> | RouteErrors.RouteLoaderDefect,
  Services
> => ({
  load: async ({ context, services }) => {
    const program = executeModuleLoader(loader.execute, {
      context,
      params: context.params,
      search: context.query,
      services,
    })

    const exit = await Effect.runPromiseExit(
      program,
    )

    if (exit._tag === "Success") {
      return loader.output === undefined ? exit.value : RouteErrors.validateLoaderOutput(loader.output, exit.value)
    }

    throw RouteErrors.mapLoaderCause(exit.cause, { error: loader.error })
  },
  mapError: (cause) =>
    cause instanceof RouteErrors.RouteLoaderFailure || cause instanceof RouteErrors.RouteLoaderDefect
      ? cause
      : new RouteErrors.RouteLoaderDefect({ defect: cause }),
})

const compileAction = <
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Input,
  Result,
  Error,
  Services,
>(action: Route.ModuleAction<ParamsOutput, SearchOutput, Input, Result, Error, Services>): Route.ActionDescriptor<
  ParamsOutput,
  SearchOutput,
  Input,
  Result,
  RouteErrors.RouteActionFailure<Error> | RouteErrors.RouteActionDefect,
  Services
> => ({
  input: action.input,
  handle: async ({ context, input, services }) => {
    const program = executeModuleAction(action.execute, {
      context,
      input,
      params: context.params,
      search: context.query,
      services,
    })

    const exit = await Effect.runPromiseExit(
      program,
    )

    if (exit._tag === "Success") {
      return action.output === undefined ? exit.value : RouteErrors.validateActionOutput(action.output, exit.value)
    }

    throw RouteErrors.mapActionCause(exit.cause, { error: action.error })
  },
  mapError: (cause) =>
    cause instanceof RouteErrors.RouteActionFailure || cause instanceof RouteErrors.RouteActionDefect
      ? cause
      : new RouteErrors.RouteActionDefect({ defect: cause }),
})

export function extractRouteModule<
  Content,
  Loader extends Route.AnyModuleLoader | undefined = undefined,
  Action extends Route.AnyModuleAction | undefined = undefined,
>(exports: {
  readonly component: Content
  readonly loader?: Loader
  readonly action?: Action
}): Route.RouteModule<Content, Loader, Action>
export function extractRouteModule<Content>(exports: {
  readonly component?: Content
  readonly loader?: unknown
  readonly action?: unknown
}): Route.RouteModule<Content, Route.AnyModuleLoader | undefined, Route.AnyModuleAction | undefined>
export function extractRouteModule<Content>(exports: {
  readonly component?: Content
  readonly loader?: unknown
  readonly action?: unknown
}): Route.RouteModule<Content, Route.AnyModuleLoader | undefined, Route.AnyModuleAction | undefined> {
  if (!("component" in exports) || exports.component === undefined) {
    throw new RouteErrors.RouteModuleExportError({
      exportName: "component",
      input: exports,
      message: "Route modules must export `component` alongside optional `loader` and `action` helpers.",
    })
  }

  if (exports.loader !== undefined && !isModuleLoader(exports.loader)) {
    throw new RouteErrors.RouteModuleExportError({
      exportName: "loader",
      input: exports.loader,
      message: "Route module `loader` exports must be created with Route.loader(...).",
    })
  }

  if (exports.action !== undefined && !isModuleAction(exports.action)) {
    throw new RouteErrors.RouteModuleExportError({
      exportName: "action",
      input: exports.action,
      message: "Route module `action` exports must be created with Route.action(...).",
    })
  }

  const loader = exports.loader
  const action = exports.action

  return {
    component: exports.component,
    loader,
    action,
  }
}

export function compileRouteModule<
  Content,
  Loader extends Route.AnyModuleLoader | undefined,
  Action extends Route.AnyModuleAction | undefined,
  Identifier extends string | undefined = undefined,
>(options: {
  readonly path: Route.AbsolutePath
  readonly identifier?: Identifier
  readonly module: Route.RouteModule<Content, Loader, Action>
}): CompiledRouteModule<Content, Loader, Action, Identifier>
export function compileRouteModule<
  Content,
  Identifier extends string | undefined = undefined,
>(options: {
  readonly path: Route.AbsolutePath
  readonly identifier?: Identifier
  readonly module: Route.RouteModule<Content, Route.AnyModuleLoader | undefined, Route.AnyModuleAction | undefined>
}): Route.AnyDefinition
export function compileRouteModule<
  Content,
  Identifier extends string | undefined = undefined,
>(options: {
  readonly path: Route.AbsolutePath
  readonly identifier?: Identifier
  readonly module: Route.RouteModule<Content, Route.AnyModuleLoader | undefined, Route.AnyModuleAction | undefined>
}): Route.AnyDefinition {
  const route = Route.make({
    identifier: options.identifier,
    path: options.path,
    content: options.module.component,
    decode: {
      params: options.module.loader?.decode.params ?? options.module.action?.decode.params,
      search: options.module.loader?.decode.search ?? options.module.action?.decode.search,
    },
  })

  if (options.module.loader !== undefined && options.module.action !== undefined) {
    return Route.action(Route.loader(route, compileLoader(options.module.loader)), compileAction(options.module.action))
  }

  if (options.module.loader !== undefined) {
    return Route.loader(route, compileLoader(options.module.loader))
  }

  if (options.module.action !== undefined) {
    return Route.action(route, compileAction(options.module.action))
  }

  return route
}
