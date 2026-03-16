import { auth } from "../lib/better-auth-options.server.js" // Adjust the path as necessary
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"

export async function loader({ request }: LoaderFunctionArgs) {
  return auth.handler(request)
}

export async function action({ request }: ActionFunctionArgs) {
  return auth.handler(request)
}
