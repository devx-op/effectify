import * as Cause from "effect/Cause"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { Decode, Submission } from "../src/index.js"
import * as RouteErrors from "../src/internal/route-errors.js"

describe("@effectify/loom-router schema-backed decoder contracts", () => {
  it("decodes transformed router inputs through Decode.schema", () => {
    const decoder = Decode.schema(Schema.Struct({ page: Schema.NumberFromString }))

    expect(decoder.decode({ page: "2" })).toEqual(Result.succeed({ page: 2 }))
    expect(decoder.decode({})).toMatchObject({
      _tag: "Failure",
      failure: {
        _tag: "LoomRouterDecodeFailure",
        input: {},
      },
    })
  })

  it("decodes transformed action submissions through Submission.schema", () => {
    const decoder = Submission.schema(
      Schema.Struct({
        page: Schema.NumberFromString,
        title: Schema.String,
      }),
    )

    expect(decoder.decode({ page: "3", title: "draft" })).toEqual(Result.succeed({ page: 3, title: "draft" }))
    expect(decoder.decode({ page: "3" })).toMatchObject({
      _tag: "Failure",
      failure: {
        _tag: "LoomRouterActionInputFailure",
        input: { page: "3" },
      },
    })
  })

  it("decodes transformed route loader contracts through RouteSchema validation", () => {
    const outputSchema = Schema.Struct({ attempts: Schema.NumberFromString, message: Schema.String })
    const errorSchema = Schema.Struct({ message: Schema.String })

    expect(RouteErrors.validateLoaderOutput(outputSchema, { attempts: "4", message: "ok" })).toEqual({
      attempts: 4,
      message: "ok",
    })

    expect(
      RouteErrors.mapLoaderCause(Cause.fail({}), {
        error: errorSchema,
      }),
    ).toEqual(
      new RouteErrors.RouteLoaderDefect({
        defect: new RouteErrors.RouteSchemaContractError({
          issue: expect.anything(),
          phase: "loader-error",
          value: {},
        }),
      }),
    )
  })
})
