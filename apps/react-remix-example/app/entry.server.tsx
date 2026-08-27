import { PassThrough } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import { isbot } from "isbot"
import { renderToPipeableStream } from "react-dom/server"
import { ServerRouter, type EntryContext } from "react-router"

const ABORT_DELAY = 5000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  const prohibitOutOfOrderStreaming = isBotRequest(request.headers.get("user-agent")) || routerContext.isSpaMode

  return prohibitOutOfOrderStreaming
    ? handleBotRequest(request, responseStatusCode, responseHeaders, routerContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, routerContext)
}

function isBotRequest(userAgent: string | null) {
  return userAgent ? isbot(userAgent) : false
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false
    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      onAllReady() {
        shellRendered = true
        const body = new PassThrough()
        const stream = createReadableStreamFromReadable(body)

        responseHeaders.set("Content-Type", "text/html")
        resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }))
        pipe(body)
      },
      onShellError(error: unknown) {
        reject(error)
      },
      onError(error: unknown) {
        responseStatusCode = 500
        if (shellRendered) {
          console.error(error)
        }
      },
    })

    setTimeout(abort, ABORT_DELAY)
  })
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false
    const { pipe, abort } = renderToPipeableStream(<ServerRouter context={routerContext} url={request.url} />, {
      onShellReady() {
        shellRendered = true
        const body = new PassThrough()
        const stream = createReadableStreamFromReadable(body)

        responseHeaders.set("Content-Type", "text/html")
        resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }))
        pipe(body)
      },
      onShellError(error: unknown) {
        reject(error)
      },
      onError(error: unknown) {
        responseStatusCode = 500
        if (shellRendered) {
          console.error(error)
        }
      },
    })

    setTimeout(abort, ABORT_DELAY)
  })
}
