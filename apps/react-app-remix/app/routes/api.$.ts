import { HttpApiHandler } from "@effectify/react-remix"
import { ApiLive } from "../lib/http.server"

export const loader = HttpApiHandler.make({ apiLive: ApiLive, scalar: { baseServerURL: 'http://localhost:3000/api' } })
export const action = HttpApiHandler.make({ apiLive: ApiLive, scalar: { baseServerURL: 'http://localhost:3000/api' } })