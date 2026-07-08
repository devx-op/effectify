import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Schema from "effect/Schema"

export type RouteSchemaPhase = "loader-output" | "loader-error" | "action-output" | "action-error"

type RouteSchema<Value> = Schema.Decoder<Value>

export class RouteModuleExportError extends Data.TaggedError("LoomRouterRouteModuleExportError")<{
  readonly exportName: "component" | "loader" | "action"
  readonly input: unknown
  readonly message: string
}> {}

export class RouteLoaderFailure<Error> extends Data.TaggedError("LoomRouterRouteLoaderFailure")<{
  readonly error: Error
}> {}

export class RouteLoaderDefect extends Data.TaggedError("LoomRouterRouteLoaderDefect")<{
  readonly defect: unknown
}> {}

export class RouteActionFailure<Error> extends Data.TaggedError("LoomRouterRouteActionFailure")<{
  readonly error: Error
}> {}

export class RouteActionDefect extends Data.TaggedError("LoomRouterRouteActionDefect")<{
  readonly defect: unknown
}> {}

export class RouteSchemaContractError extends Data.TaggedError("LoomRouterRouteSchemaContractError")<{
  readonly issue: unknown
  readonly phase: RouteSchemaPhase
  readonly value: unknown
}> {}

const decodeSchema = <Value>(options: {
  readonly phase: RouteSchemaPhase
  readonly schema: RouteSchema<Value>
  readonly value: unknown
}): Value => {
  try {
    return Schema.decodeUnknownSync(options.schema)(options.value)
  } catch (issue) {
    throw new RouteSchemaContractError({
      issue,
      phase: options.phase,
      value: options.value,
    })
  }
}

export const validateLoaderOutput = <Value>(schema: RouteSchema<Value>, value: unknown): Value =>
  decodeSchema({ phase: "loader-output", schema, value })

export const validateActionOutput = <Value>(schema: RouteSchema<Value>, value: unknown): Value =>
  decodeSchema({ phase: "action-output", schema, value })

export const mapLoaderCause = <Error>(
  cause: Cause.Cause<Error>,
  options?: { readonly error?: RouteSchema<Error> },
): RouteLoaderFailure<Error> | RouteLoaderDefect => {
  for (const reason of cause.reasons) {
    if (Cause.isFailReason(reason)) {
      try {
        return new RouteLoaderFailure({
          error: options?.error === undefined ? reason.error : decodeSchema({
            phase: "loader-error",
            schema: options.error,
            value: reason.error,
          }),
        })
      } catch (contractError) {
        return new RouteLoaderDefect({ defect: contractError })
      }
    }

    if (Cause.isDieReason(reason)) {
      return new RouteLoaderDefect({ defect: reason.defect })
    }
  }

  return new RouteLoaderDefect({ defect: Cause.squash(cause) })
}

export const mapActionCause = <Error>(
  cause: Cause.Cause<Error>,
  options?: { readonly error?: RouteSchema<Error> },
): RouteActionFailure<Error> | RouteActionDefect => {
  for (const reason of cause.reasons) {
    if (Cause.isFailReason(reason)) {
      try {
        return new RouteActionFailure({
          error: options?.error === undefined ? reason.error : decodeSchema({
            phase: "action-error",
            schema: options.error,
            value: reason.error,
          }),
        })
      } catch (contractError) {
        return new RouteActionDefect({ defect: contractError })
      }
    }

    if (Cause.isDieReason(reason)) {
      return new RouteActionDefect({ defect: reason.defect })
    }
  }

  return new RouteActionDefect({ defect: Cause.squash(cause) })
}
