import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from '@effectify/react-remix'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import * as Effect from 'effect/Effect'
import { withActionEffect, withLoaderEffect } from '~/lib/runtime.server'

export const loader = withLoaderEffect(
  Effect.gen(function* () {
    const { request } = yield* LoaderArgsContext
    const url = new URL(request.url)
    const demo = url.searchParams.get('demo')

    yield* Effect.log('Demo loader called with:', demo)

    // Demonstrate different response types based on query parameter
    if (demo === 'error') {
      return yield* httpFailure('This is a demo error from the loader')
    }

    if (demo === 'redirect') {
      return yield* httpRedirect('/test')
    }

    // Default to success
    return yield* httpSuccess({
      message: 'Demo loader works!',
      demo: demo || 'success',
      timestamp: new Date().toISOString(),
    })
  }),
)

export const action = withActionEffect(
  Effect.gen(function* () {
    const { request } = yield* ActionArgsContext

    // Get form data
    const formData = yield* Effect.tryPromise(() => request.formData())
    const actionType = formData.get('actionType') as string

    yield* Effect.log('Demo action called with type:', actionType)

    // Demonstrate different response types based on form data
    if (actionType === 'error') {
      return yield* httpFailure('This is a demo error from the action')
    }

    if (actionType === 'redirect') {
      return yield* httpRedirect('/test')
    }

    // Default to success
    return yield* httpSuccess({
      message: 'Demo action completed successfully!',
      actionType: actionType || 'success',
      timestamp: new Date().toISOString(),
    })
  }),
)

export default function DemoRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Demo Route - New API Features</h2>
      <p>This route demonstrates the new httpSuccess, httpFailure, and httpRedirect helpers.</p>

      {/* Show loader data */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Loader Data:</h3>
        {loaderData.ok ? (
          <div style={{ padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
            <p>
              <strong>Message:</strong> {loaderData.data.message}
            </p>
            <p>
              <strong>Demo:</strong> {loaderData.data.demo}
            </p>
            <p>
              <strong>Timestamp:</strong> {loaderData.data.timestamp}
            </p>
          </div>
        ) : (
          <div style={{ padding: '10px', backgroundColor: '#f5e8e8', borderRadius: '4px' }}>
            <p>
              <strong>Error:</strong> {loaderData.errors.join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Demo buttons for loader */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Loader Responses:</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="/demo"
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Success
          </a>
          <a
            href="/demo?demo=error"
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Error
          </a>
          <a
            href="/demo?demo=redirect"
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: 'black',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Redirect
          </a>
        </div>
      </div>

      {/* Form for action testing */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Action Responses:</h3>
        <Form method="post">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <button
              name="actionType"
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              value="success"
            >
              Success Action
            </button>
            <button
              name="actionType"
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              value="error"
            >
              Error Action
            </button>
            <button
              name="actionType"
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              value="redirect"
            >
              Redirect Action
            </button>
          </div>
        </Form>
      </div>

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
                <strong>Action Type:</strong> {actionData.response.actionType}
              </p>
              <p>
                <strong>Timestamp:</strong> {actionData.response.timestamp}
              </p>
            </div>
          ) : (
            <p style={{ color: 'red' }}>
              <strong>Error:</strong> {String(actionData.errors)}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Navigation:</h4>
        <a href="/test" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Back to Test Route
        </a>
      </div>
    </div>
  )
}
