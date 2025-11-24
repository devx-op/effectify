import { HttpApiHandler } from "@effectify/react-router"
import { ApiLive } from "../lib/http/http.server.js"

const handler = HttpApiHandler.make({ 
    apiLive: ApiLive, 
    scalar: { 
        baseServerURL: 'http://localhost:3000/api' 
    },
})

export const loader = handler
export const action = handler