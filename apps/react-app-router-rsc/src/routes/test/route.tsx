import { ActionArgsContext, LoaderArgsContext, Ok } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { withActionEffect, withLoaderEffect } from "../../lib/runtime.server"

// Types based on the runtime implementation
type LoaderResult<T> = { ok: true; data: T } | { ok: false; errors: string[] }

type ActionResult<T> = { ok: true; response: T } | { ok: false; errors: unknown }

export const loader = withLoaderEffect(
  Effect.gen(function*() {
    const { request } = yield* LoaderArgsContext
    yield* Effect.log("request", request)
    return yield* Effect.succeed(new Ok<{ message: string }>({ data: { message: "Test route works!" } }))
  }),
)

export const action = withActionEffect(
  Effect.gen(function*() {
    const { request } = yield* ActionArgsContext

    // Get form data
    const formData = yield* Effect.tryPromise(() => request.formData())
    const inputValue = formData.get("inputValue") as string

    yield* Effect.log("Form value received:", inputValue)

    // Return processed value
    return yield* Effect.succeed(
      new Ok<{ message: string; inputValue: string }>({
        data: {
          message: "Received successfully!",
          inputValue: inputValue || "No value",
        },
      }),
    )
  }),
)

export default function Test({
  loaderData,
  actionData,
}: {
  loaderData?: LoaderResult<{ message: string }>
  actionData?: ActionResult<{ message: string; inputValue: string }>
}) {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 lg:py-12">
      <article className="prose mx-auto">
        <h1>Test Route - Form with Effect</h1>

        {/* Show loader data */}
        {loaderData ?
          (
            loaderData.ok ?
              (
                <div className="mb-5 rounded bg-green-100 p-3">
                  <h3>Loader Data:</h3>
                  <p>{loaderData.data.message}</p>
                </div>
              ) :
              (
                <div className="mb-5 rounded bg-red-100 p-3">
                  <h3>Loader Error:</h3>
                  <p>{loaderData.errors.join(", ")}</p>
                </div>
              )
          ) :
          (
            <div className="mb-5 rounded bg-yellow-100 p-3">
              <h3>Loading...</h3>
              <p>Loader data is not available yet</p>
            </div>
          )}

        {/* Form */}
        <form className="mb-5" method="post">
          <div className="mb-3">
            <label className="mb-2 block font-bold" htmlFor="inputValue">
              Write something:
            </label>
            <input
              className="w-full rounded border border-gray-300 p-2 text-base"
              id="inputValue"
              name="inputValue"
              placeholder="Enter a value..."
              type="text"
            />
          </div>
          <button
            className="cursor-pointer rounded border-none bg-blue-600 px-5 py-2 text-base text-white hover:bg-blue-700"
            type="submit"
          >
            Submit
          </button>
        </form>

        {/* Show action result */}
        {actionData && (
          <div className="rounded bg-blue-50 p-3">
            <h3>Action Result:</h3>
            {actionData?.ok ?
              (
                <div>
                  <p>
                    <strong>Message:</strong> {actionData.response.message}
                  </p>
                  <p>
                    <strong>Sent value:</strong> "{actionData.response.inputValue}"
                  </p>
                </div>
              ) :
              <p className="text-red-600">Error: {String(actionData?.errors)}</p>}
          </div>
        )}
      </article>
    </main>
  )
}
