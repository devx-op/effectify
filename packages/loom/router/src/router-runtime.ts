import * as Result from "effect/Result"
import * as ActionInput from "./action-input.js"
import * as internal from "./internal/router-runtime.js"
import type * as Route from "./route.js"
import type * as Router from "./router.js"

type AnyLoaderRoute = Route.Definition<any, any, any, any, any, Route.AnyLoaderDescriptor, any>
type AnyActionRoute = Route.Definition<any, any, any, any, any, any, Route.AnyActionDescriptor>
type Resolved<Self extends Route.AnyDefinition> = Router.ResolveSuccess<Route.ParamsOf<Self>, Route.SearchOf<Self>> & {
  readonly route: Self
}

export type LoaderState<Self extends AnyLoaderRoute> =
  | { readonly _tag: "idle"; readonly route: Self }
  | { readonly _tag: "loading"; readonly route: Self }
  | { readonly _tag: "success"; readonly route: Self; readonly data: Route.LoadedDataOf<Self> }
  | { readonly _tag: "revalidating"; readonly route: Self; readonly data: Route.LoadedDataOf<Self> }
  | {
    readonly _tag: "failure"
    readonly route: Self
    readonly error: Route.LoaderErrorOf<Self>
    readonly data?: Route.LoadedDataOf<Self>
  }

export type ActionState<Self extends AnyActionRoute> =
  | { readonly _tag: "idle"; readonly route: Self }
  | { readonly _tag: "submitting"; readonly route: Self; readonly input: Route.ActionInputOf<Self> }
  | {
    readonly _tag: "success"
    readonly route: Self
    readonly result: Route.ActionResultOf<Self>
    readonly revalidated: boolean
  }
  | {
    readonly _tag: "invalid-input"
    readonly route: Self
    readonly issues: readonly [ActionInput.Failure, ...ReadonlyArray<ActionInput.Failure>]
    readonly submission: ActionInput.Normalized
  }
  | { readonly _tag: "failure"; readonly route: Self; readonly error: Route.ActionErrorOf<Self> }

export const idle = <Self extends AnyLoaderRoute>(route: Self): LoaderState<Self> => ({
  _tag: "idle",
  route,
})

export const loading = <Self extends AnyLoaderRoute>(route: Self): LoaderState<Self> => ({
  _tag: "loading",
  route,
})

export const success = <Self extends AnyLoaderRoute>(
  route: Self,
  data: Route.LoadedDataOf<Self>,
): LoaderState<Self> => ({
  _tag: "success",
  data,
  route,
})

export const revalidating = <Self extends AnyLoaderRoute>(
  route: Self,
  data: Route.LoadedDataOf<Self>,
): LoaderState<Self> => ({
  _tag: "revalidating",
  data,
  route,
})

export const failure = <Self extends AnyLoaderRoute>(
  route: Self,
  error: Route.LoaderErrorOf<Self>,
  data?: Route.LoadedDataOf<Self>,
): LoaderState<Self> => ({
  _tag: "failure",
  data,
  error,
  route,
})

export const actionIdle = <Self extends AnyActionRoute>(route: Self): ActionState<Self> => ({
  _tag: "idle",
  route,
})

export const submitting = <Self extends AnyActionRoute>(
  route: Self,
  input: Route.ActionInputOf<Self>,
): ActionState<Self> => ({
  _tag: "submitting",
  input,
  route,
})

export const actionSuccess = <Self extends AnyActionRoute>(
  route: Self,
  result: Route.ActionResultOf<Self>,
  revalidated: boolean,
): ActionState<Self> => ({
  _tag: "success",
  result,
  revalidated,
  route,
})

export const actionFailure = <Self extends AnyActionRoute>(
  route: Self,
  error: Route.ActionErrorOf<Self>,
): ActionState<Self> => ({
  _tag: "failure",
  error,
  route,
})

export const invalidInput = <Self extends AnyActionRoute>(
  route: Self,
  submission: ActionInput.Normalized,
  issues: readonly [ActionInput.Failure, ...ReadonlyArray<ActionInput.Failure>],
): ActionState<Self> => ({
  _tag: "invalid-input",
  issues,
  route,
  submission,
})

export const load = async <Self extends AnyLoaderRoute>(options: {
  readonly resolved: Resolved<Self>
  readonly services: Route.LoaderServicesOf<Self>
}): Promise<LoaderState<Self>> => {
  const descriptor: Route.LoaderDescriptor<
    Route.ParamsOf<Self>,
    Route.SearchOf<Self>,
    Route.LoadedDataOf<Self>,
    Route.LoaderErrorOf<Self>,
    Route.LoaderServicesOf<Self>
  > = options.resolved.route.loader

  return internal.executeLoader({
    descriptor,
    input: {
      context: options.resolved.context,
      services: options.services,
    },
    onFailure: (error) => failure(options.resolved.route, error),
    onSuccess: (data) => success(options.resolved.route, data),
  })
}

export const revalidate = async <Self extends AnyLoaderRoute>(options: {
  readonly previous: Route.LoadedDataOf<Self>
  readonly resolved: Resolved<Self>
  readonly services: Route.LoaderServicesOf<Self>
}): Promise<LoaderState<Self>> => {
  const descriptor: Route.LoaderDescriptor<
    Route.ParamsOf<Self>,
    Route.SearchOf<Self>,
    Route.LoadedDataOf<Self>,
    Route.LoaderErrorOf<Self>,
    Route.LoaderServicesOf<Self>
  > = options.resolved.route.loader

  return internal.executeLoader({
    descriptor,
    input: {
      context: options.resolved.context,
      services: options.services,
    },
    onFailure: (error) => failure(options.resolved.route, error, options.previous),
    onSuccess: (data) => success(options.resolved.route, data),
  })
}

export const submit = async <Self extends AnyActionRoute>(options: {
  readonly input?: Route.ActionInputOf<Self>
  readonly revalidated?: boolean
  readonly resolved: Resolved<Self>
  readonly submission?: ActionInput.Submission
  readonly services: Route.ActionServicesOf<Self>
}): Promise<ActionState<Self>> => {
  const descriptor: Route.ActionDescriptor<
    Route.ParamsOf<Self>,
    Route.SearchOf<Self>,
    Route.ActionInputOf<Self>,
    Route.ActionResultOf<Self>,
    Route.ActionErrorOf<Self>,
    Route.ActionServicesOf<Self>
  > = options.resolved.route.action

  const decodedInput = (() => {
    if (options.input !== undefined) {
      return Result.succeed(options.input)
    }

    if (options.submission === undefined) {
      return Result.fail(ActionInput.missingDecoderFailure({}))
    }

    if (descriptor.decodeInput === undefined) {
      return Result.fail(ActionInput.missingDecoderFailure(options.submission))
    }

    return ActionInput.decode({
      decoder: descriptor.decodeInput,
      submission: options.submission,
    })
  })()

  if (Result.isFailure(decodedInput)) {
    const normalizedSubmission = ActionInput.normalize(options.submission ?? {})

    return invalidInput(
      options.resolved.route,
      Result.isSuccess(normalizedSubmission) ? normalizedSubmission.success : {},
      [decodedInput.failure],
    )
  }

  return internal.executeAction({
    descriptor,
    input: {
      context: options.resolved.context,
      input: decodedInput.success,
      services: options.services,
    },
    onFailure: (error) => actionFailure(options.resolved.route, error),
    onSuccess: (result) => actionSuccess(options.resolved.route, result, options.revalidated ?? false),
  })
}
