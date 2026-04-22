import type * as Route from "../route.js"

export const executeLoader = async <
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Data,
  Error,
  Services,
  Result,
>(options: {
  readonly descriptor: Route.LoaderDescriptor<ParamsOutput, SearchOutput, Data, Error, Services>
  readonly input: Route.LoaderInput<ParamsOutput, SearchOutput, Services>
  readonly onSuccess: (data: Data) => Result
  readonly onFailure: (error: Error) => Result
}): Promise<Result> => {
  try {
    return options.onSuccess(await options.descriptor.load(options.input))
  } catch (cause) {
    return options.onFailure(options.descriptor.mapError(cause))
  }
}

export const executeAction = async <
  ParamsOutput extends Route.Params,
  SearchOutput extends Route.Search,
  Input,
  ActionResult,
  Error,
  Services,
  Result,
>(options: {
  readonly descriptor: Route.ActionDescriptor<ParamsOutput, SearchOutput, Input, ActionResult, Error, Services>
  readonly input: Route.ActionContext<ParamsOutput, SearchOutput, Input, Services>
  readonly onSuccess: (result: ActionResult) => Result
  readonly onFailure: (error: Error) => Result
}): Promise<Result> => {
  try {
    return options.onSuccess(await options.descriptor.handle(options.input))
  } catch (cause) {
    return options.onFailure(options.descriptor.mapError(cause))
  }
}
