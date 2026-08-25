/**
 * @deprecated Temporary React Router 7.18.2 bridge. Migrate public imports to
 * `@effectify/react-router` on React Router 8.
 */
export * from "./lib/context.js"
// TODO: Implement HttpApiHandler fot v4
// export * as HttpApiHandler from "./lib/http-api-handler.js"
export * from "./lib/http-response.js"
export * as Runtime from "./lib/runtime.js"
/** @deprecated Bridge-only compatibility export; migrate to native `Response.json`. */
export { json } from "./lib/json.js"
