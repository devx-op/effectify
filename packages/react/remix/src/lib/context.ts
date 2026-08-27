import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import * as Context from "effect/Context"

/**
 * ActionArgsContext provides access to React Router action arguments.
 * Used in Effect handlers to access request data.
 *
 * In Effect v4 beta57, request-scoped services use Context.Service.
 * For request-scoped contexts that are provided at runtime, we use
 * Context.Service with a minimal make constructor.
 *
 * @deprecated Temporary React Router 7.18.2 bridge context. Migrate to the exact
 * context exported by `@effectify/react-router` for React Router 8.
 */
export class ActionArgsContext extends Context.Service<ActionArgsContext, ActionFunctionArgs>()(
  "@effectify/react-remix/ActionArgsContext",
) {}

/**
 * LoaderArgsContext provides access to React Router loader arguments.
 * Used in Effect handlers to access request data during route loading.
 *
 * @deprecated Temporary React Router 7.18.2 bridge context. Migrate to the exact
 * context exported by `@effectify/react-router` for React Router 8.
 */
export class LoaderArgsContext extends Context.Service<LoaderArgsContext, LoaderFunctionArgs>()(
  "@effectify/react-remix/LoaderArgsContext",
) {}
