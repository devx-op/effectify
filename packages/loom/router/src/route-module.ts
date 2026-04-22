import type * as Route from "./route.js"
import * as InternalRouteModules from "./internal/route-modules.js"
import type * as RouteErrors from "./internal/route-errors.js"

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

export type Exports<
  Content = unknown,
  Loader extends Route.AnyModuleLoader | undefined = undefined,
  Action extends Route.AnyModuleAction | undefined = undefined,
> = {
  readonly component: Content
  readonly loader?: Loader
  readonly action?: Action
}

export const extract = InternalRouteModules.extractRouteModule

export function compile<
  Content,
  Loader extends Route.AnyModuleLoader | undefined = undefined,
  Action extends Route.AnyModuleAction | undefined = undefined,
  Identifier extends string | undefined = undefined,
>(options: {
  readonly path: Route.AbsolutePath
  readonly identifier?: Identifier
  readonly module: Exports<Content, Loader, Action>
}): CompiledRouteModule<Content, Loader, Action, Identifier>
export function compile<Content, Identifier extends string | undefined = undefined>(options: {
  readonly path: Route.AbsolutePath
  readonly identifier?: Identifier
  readonly module: Exports<Content, Route.AnyModuleLoader | undefined, Route.AnyModuleAction | undefined>
}): Route.AnyDefinition
export function compile<Content, Identifier extends string | undefined = undefined>(options: {
  readonly path: Route.AbsolutePath
  readonly identifier?: Identifier
  readonly module: Exports<Content, Route.AnyModuleLoader | undefined, Route.AnyModuleAction | undefined>
}): Route.AnyDefinition {
  return InternalRouteModules.compileRouteModule({
    ...options,
    module: InternalRouteModules.extractRouteModule(options.module),
  })
}
