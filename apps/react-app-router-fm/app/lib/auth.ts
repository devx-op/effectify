/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import * as HttpApiBuilder from '@effect/platform/HttpApiBuilder'
import type { PathInput } from '@effect/platform/HttpRouter'
import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  // The workspace keeps a shared sqlite at `apps/sqlite.db` — the file
  // path here must reach that file from this module's folder.
  // `auth.server.ts` lives at `apps/react-app-router-fm/app/lib`, so
  // '../../sqlite.db' resolves to `apps/sqlite.db`.
  database: new Database('../../sqlite.db') as unknown,
})

/**
 * @since 1.0.0
 * @category layers
 */
export const Authlayer = (options?: { handler: any; path?: `/${string}` }): Layer.Layer<never, never, never> =>
  HttpApiBuilder.Router.use((router) =>
    Effect.gen(function* () {
      const base = options?.path ?? '/auth'
      const mountPath: PathInput = base.endsWith('/') ? `${base}*` : `${base}/*`

      // debug: print mount information so we can verify the layer is applied
      yield* Effect.log(`Mounting auth handler at paths: ${base} and ${mountPath}`)

      // register both the exact base path and the wildcard subpaths
      // This ensures the handler covers /auth and any child routes like /auth/callback
      yield* router.all(base, options?.handler)
      yield* router.all(mountPath, options?.handler)

      // Also register the handler explicitly under /api to account for
      // routers that mount the API under a '/api' prefix. This guarantees
      // the auth endpoints are reachable at /api/auth and /api/auth/*.
      const apiBase = `/api${base}` as PathInput
      const apiMountPath = `/api${mountPath}` as PathInput
      yield* Effect.log(`Also mounting auth handler at paths: ${apiBase} and ${apiMountPath}`)
      yield* router.all(apiBase, options?.handler)
      yield* router.all(apiMountPath, options?.handler)
    }),
  )
