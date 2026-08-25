/**
 * Creates a native JSON response for legacy bridge consumers.
 *
 * @deprecated Use native `Response.json` when migrating to `@effectify/react-router`.
 */
export const json = <T>(data: T, init?: number | ResponseInit): Response =>
  Response.json(data, typeof init === "number" ? { status: init } : init)
