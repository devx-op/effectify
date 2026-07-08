import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"

export const withLoaderEffect = <T>(effect: T) => async (args: LoaderFunctionArgs) => {
  const runtime = await import("./runtime.server.js")
  return runtime.withLoaderEffect(effect as never)(args as never)
}

export const withActionEffect = <T>(effect: T) => async (args: ActionFunctionArgs) => {
  const runtime = await import("./runtime.server.js")
  return runtime.withActionEffect(effect as never)(args as never)
}
