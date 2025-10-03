import { ActionArgsContext, LoaderArgsContext, Ok } from '@effectify/react-remix'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import * as Effect from 'effect/Effect'
import { withActionEffect, withLoaderEffect } from '~/lib/runtime.server'

export const loader = withLoaderEffect(
  Effect.gen(function* () {
    const { request } = yield* LoaderArgsContext
    yield* Effect.log('request', request)
    return yield* Effect.succeed(new Ok<{ message: string }>({ data: { message: 'Test route works!' } }))
  }),
)

export const action = withActionEffect(
  Effect.gen(function* () {
    const { request } = yield* ActionArgsContext

    // Get form data
    const formData = yield* Effect.tryPromise(() => request.formData())
    const inputValue = formData.get('inputValue') as string

    yield* Effect.log('Form value received:', inputValue)

    // Return processed value
    return yield* Effect.succeed(
      new Ok<{ message: string; inputValue: string }>({
        data: {
          message: 'Received successfully!',
          inputValue: inputValue || 'No value',
        },
      }),
    )
  }),
)

export default function TestRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Test Route - Form with Effect</h2>

      {/* Show loader data */}
      {loaderData.ok ? (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          <h3>Loader Data:</h3>
          <p>{loaderData.data.message}</p>
        </div>
      ) : (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5e8e8', borderRadius: '4px' }}>
          <h3>Loader Error:</h3>
          <p>{loaderData.errors.join(', ')}</p>
        </div>
      )}

      {/* Form */}
      <Form method="post" style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="inputValue" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Write something:
          </label>
          <input
            id="inputValue"
            name="inputValue"
            placeholder="Enter a value..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
            }}
            type="text"
          />
        </div>
        <button
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          type="submit"
        >
          Submit
        </button>
      </Form>

      {/* Show action result */}
      {actionData && (
        <div style={{ padding: '10px', backgroundColor: '#e8f4fd', borderRadius: '4px' }}>
          <h3>Action Result:</h3>
          {actionData.ok ? (
            <div>
              <p>
                <strong>Message:</strong> {actionData.response.message}
              </p>
              <p>
                <strong>Sent value:</strong> "{actionData.response.inputValue}"
              </p>
            </div>
          ) : (
            <p style={{ color: 'red' }}>Error: {String(actionData.errors)}</p>
          )}
        </div>
      )}
    </div>
  )
}
