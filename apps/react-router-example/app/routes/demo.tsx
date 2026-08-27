import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { Link, useActionData, useLoaderData } from "react-router"
import { withActionEffect, withLoaderEffect } from "../lib/runtime.route.js"

interface DemoData {
  readonly message: string
  readonly outcome: "success"
}

interface DemoScreenProps {
  readonly loaderData: DemoData
  readonly actionData?: DemoData
}

const redirectLocation = "/demo?outcome=success"
const loaderSuccess = {
  message: "Loader helper completed successfully.",
  outcome: "success",
} satisfies DemoData
const actionSuccess = {
  message: "Action helper completed successfully.",
  outcome: "success",
} satisfies DemoData

export const loader = withLoaderEffect(
  Effect.gen(function* () {
    const { request } = yield* LoaderArgsContext
    const outcome = new URL(request.url).searchParams.get("outcome")

    if (outcome === "failure") {
      return yield* httpFailure("Loader helper modeled failure.")
    }
    if (outcome === "redirect") {
      return yield* httpRedirect(redirectLocation, 307)
    }

    return yield* httpSuccess(loaderSuccess)
  }),
)

export const action = withActionEffect(
  Effect.gen(function* () {
    const { request } = yield* ActionArgsContext
    const formData = yield* Effect.tryPromise(() => request.formData())
    const outcome = formData.get("outcome")

    if (outcome === "failure") {
      return yield* httpFailure("Action helper modeled failure.")
    }
    if (outcome === "redirect") {
      return yield* httpRedirect(redirectLocation, 303)
    }

    return yield* httpSuccess(actionSuccess)
  }),
)

export function DemoScreen({ loaderData, actionData }: DemoScreenProps) {
  return (
    <main className="container">
      <article>
        <h1>Effect response helpers</h1>
        <p>Exercise successful, modeled-failure, and redirect outcomes through the React Router 8 Effect runtime.</p>

        <section aria-labelledby="loader-outcomes-heading">
          <h2 id="loader-outcomes-heading">Loader outcomes</h2>
          <p>{loaderData.message}</p>
          <p>Loader outcome: {loaderData.outcome}</p>
          <nav aria-label="Loader response demonstrations">
            <ul>
              <li>
                <Link to="/demo?outcome=success">Loader success</Link>
              </li>
              <li>
                <Link to="/demo?outcome=failure">Loader failure</Link>
              </li>
              <li>
                <Link to="/demo?outcome=redirect">Loader redirect</Link>
              </li>
            </ul>
          </nav>
        </section>

        <section aria-labelledby="action-outcomes-heading">
          <h2 id="action-outcomes-heading">Action outcomes</h2>
          <form method="post">
            <button name="outcome" type="submit" value="success">
              Action success
            </button>
            <button name="outcome" type="submit" value="failure">
              Action failure
            </button>
            <button name="outcome" type="submit" value="redirect">
              Action redirect
            </button>
          </form>
          {actionData ? (
            <output aria-live="polite">
              <strong>{actionData.message}</strong>
              <span>Action outcome: {actionData.outcome}</span>
            </output>
          ) : null}
        </section>
      </article>
    </main>
  )
}

export default function DemoRoute() {
  const loaderData = useLoaderData<{ readonly data: DemoData }>()
  const actionData = useActionData<{
    readonly response: DemoData
  }>()

  return <DemoScreen loaderData={loaderData.data} actionData={actionData?.response} />
}
