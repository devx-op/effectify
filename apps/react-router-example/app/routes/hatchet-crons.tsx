import type { Route } from "./+types/hatchet-crons.js"
import { CronExpression, type CronRecord, Hatchet } from "@effectify/hatchet"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess } from "@effectify/react-router"
import { withBetterAuthGuard, withBetterAuthGuardAction } from "@effectify/react-router-better-auth"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { Form, useActionData } from "react-router"
import { useState } from "react"
import { greetingInput, greetingTask } from "../lib/hatchet/greeting-task.server.js"
import { withActionEffect, withLoaderEffect } from "../lib/runtime.server.js"

const nonEmptyText = Schema.Trim.check(Schema.isNonEmpty())
const defaultCronSource = "0 9 * * 1-5"

const cronForm = Schema.Struct({
  name: nonEmptyText,
  expression: nonEmptyText,
  greetingName: greetingInput.fields.name,
})

const actionFailureData = Schema.Struct({
  ok: Schema.Literal(false),
  errors: Schema.Array(Schema.String),
})

export const actionErrorFromData = (data: unknown): string | undefined => {
  const decoded = Schema.decodeUnknownResult(actionFailureData)(data)
  if (Result.isFailure(decoded)) return undefined
  return decoded.success.errors[0]
}

export const loader = Effect.gen(function*() {
  const crons = yield* Hatchet.listCrons({ taskName: greetingTask.name })
  return yield* httpSuccess({ crons })
}).pipe(
  withBetterAuthGuard.with({ redirectOnFail: "/login" }),
  withLoaderEffect,
)

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  const formData = yield* Effect.result(
    Effect.tryPromise(() => request.formData()),
  )
  if (Result.isFailure(formData)) {
    return yield* httpFailure("Invalid cron form")
  }

  const decoded = yield* Effect.result(
    Schema.decodeUnknownEffect(cronForm)(
      Object.fromEntries(formData.success.entries()),
    ),
  )
  if (Result.isFailure(decoded)) {
    return yield* httpFailure("Invalid cron form")
  }

  const schedule = yield* Effect.result(
    CronExpression.parse(decoded.success.expression),
  )
  if (Result.isFailure(schedule)) {
    return yield* httpFailure("Invalid cron expression")
  }

  yield* Hatchet.createCron(greetingTask, {
    name: decoded.success.name,
    schedule: schedule.success,
    input: { name: decoded.success.greetingName },
  })
  return yield* httpRedirect("/hatchet-crons")
}).pipe(
  withBetterAuthGuardAction.with({ redirectOnFail: "/login" }),
  withActionEffect,
)

interface HatchetCronsScreenProps {
  readonly crons: ReadonlyArray<CronRecord>
  readonly actionError?: string
}

export function HatchetCronsScreen({
  crons,
  actionError,
}: HatchetCronsScreenProps) {
  const [expression, setExpression] = useState(defaultCronSource)
  const schedule = CronExpression.parseResult(expression)
  const upcoming = Result.isSuccess(schedule)
    ? CronExpression.nextRuns(schedule.success, 3)
    : []

  return (
    <main className="container">
      <article>
        <h2>Hatchet Crons</h2>
        <p>
          Create authenticated cron triggers for the registered greeting task.
        </p>

        <section aria-labelledby="create-cron-heading">
          <h3 id="create-cron-heading">Create cron</h3>
          <Form method="post">
            <fieldset>
              <label htmlFor="cron-name">Cron name</label>
              <input
                id="cron-name"
                name="name"
                type="text"
                required
                placeholder="weekday-greeting"
              />

              <label htmlFor="cron-expression">
                Five-field cron expression
              </label>
              <input
                id="cron-expression"
                name="expression"
                type="text"
                required
                value={expression}
                onChange={(event) => setExpression(event.currentTarget.value)}
              />
              {Result.isFailure(schedule) ?
                (
                  <small role="status">
                    Enter a valid five-field cron expression.
                  </small>
                ) :
                null}

              <label htmlFor="greeting-name">Greeting name</label>
              <input
                id="greeting-name"
                name="greetingName"
                type="text"
                required
                placeholder="Ada"
              />
            </fieldset>

            <section aria-labelledby="cron-preview-heading">
              <h4 id="cron-preview-heading">Next three local occurrences</h4>
              {upcoming.length === 0 ? <p>Enter a valid expression to preview upcoming runs.</p> : (
                <ol>
                  {upcoming.map((date) => (
                    <li key={date.toISOString()}>
                      <time dateTime={date.toISOString()}>
                        {date.toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {actionError ?
              (
                <small
                  role="alert"
                  aria-live="assertive"
                  style={{ color: "var(--pico-color-red-500)" }}
                >
                  {actionError}
                </small>
              ) :
              null}
            <button type="submit" disabled={Result.isFailure(schedule)}>
              Create cron
            </button>
          </Form>
        </section>

        <section aria-labelledby="cron-list-heading">
          <h3 id="cron-list-heading">Cron list</h3>
          {crons.length === 0 ? <p>No crons found.</p> : (
            <ul>
              {crons.map((cron) => (
                <li key={cron.id}>
                  <strong>{cron.name ?? cron.id}</strong>
                  <div>
                    <code>{cron.expression}</code>
                  </div>
                  <small>
                    Task: {cron.taskName} · {cron.enabled ? "Enabled" : "Disabled"}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  )
}

export default function HatchetCrons({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<unknown>()
  const actionError = actionErrorFromData(actionData)

  if (!loaderData.ok) {
    return (
      <main className="container">
        <article>
          <h2>Hatchet Crons</h2>
        </article>
      </main>
    )
  }

  return (
    <HatchetCronsScreen
      crons={loaderData.data.crons}
      actionError={actionError}
    />
  )
}
