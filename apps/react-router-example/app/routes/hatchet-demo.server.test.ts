import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { beforeEach, describe, expect, it, vi } from "vitest"

const pushEventMock = vi.fn()
const getEventMock = vi.fn()
const listRunsMock = vi.fn()
const cancelRunMock = vi.fn()
const runWorkflowMock = vi.fn()

vi.mock("@effectify/hatchet", () => ({
  pushEvent: (...args: Array<unknown>) => pushEventMock(...args),
  getEvent: (...args: Array<unknown>) => getEventMock(...args),
  listRuns: (...args: Array<unknown>) => listRunsMock(...args),
  cancelRun: (...args: Array<unknown>) => cancelRunMock(...args),
  runWorkflow: (...args: Array<unknown>) => runWorkflowMock(...args),
}))

vi.mock("../lib/runtime.server.js", async () => {
  const { Runtime } = await import("@effectify/react-router")
  return Runtime.make(Layer.empty)
})

import { action, loader } from "./hatchet-demo.js"
import { buildEventRedirect, parseEventPayload, readSelectedEventId } from "./hatchet-demo.server.js"

const createRouteArgs = (request: Request) => ({
  request,
  params: {},
  context: {},
  unstable_pattern: "routes/hatchet-demo",
})

describe("hatchet demo event helpers", () => {
  beforeEach(() => {
    pushEventMock.mockReset()
    getEventMock.mockReset()
    listRunsMock.mockReset()
    cancelRunMock.mockReset()
    runWorkflowMock.mockReset()
  })

  it("parseEventPayload returns JSON objects for push-event actions", () => {
    expect(parseEventPayload('{"userId":"user-123","source":"demo"}')).toEqual({
      userId: "user-123",
      source: "demo",
    })
  })

  it("parseEventPayload rejects non-object JSON payloads", () => {
    expect(() => parseEventPayload('["not","an","object"]')).toThrowError(
      "Event payload must be a JSON object",
    )
  })

  it("readSelectedEventId returns the requested event id from the loader URL", () => {
    expect(
      readSelectedEventId("https://example.com/hatchet-demo?eventId=event-123"),
    ).toBe("event-123")
  })

  it("readSelectedEventId ignores empty event ids and buildEventRedirect encodes valid ids", () => {
    expect(
      readSelectedEventId("https://example.com/hatchet-demo?eventId="),
    ).toBeUndefined()
    expect(buildEventRedirect("event id/123")).toBe(
      "/hatchet-demo?eventId=event%20id%2F123",
    )
  })

  it("action pushes an event and redirects the loader to the selected event", async () => {
    listRunsMock.mockReturnValue(Effect.succeed([]))
    pushEventMock.mockReturnValue(
      Effect.succeed({
        eventId: "event id/123",
        key: "user.created",
        payload: { userId: "user-123", source: "demo" },
        scope: "demo",
      }),
    )
    getEventMock.mockReturnValue(
      Effect.succeed({
        eventId: "event id/123",
        key: "user.created",
        payload: { userId: "user-123", source: "demo" },
        scope: "demo",
      }),
    )

    const formData = new FormData()
    formData.set("intent", "push")
    formData.set("eventKey", "user.created")
    formData.set("eventPayload", '{"userId":"user-123","source":"demo"}')

    const actionResponse = await action(
      createRouteArgs(
        new Request("https://example.com/hatchet-demo", {
          method: "POST",
          body: formData,
        }),
      ),
    )

    expect(pushEventMock).toHaveBeenCalledWith(
      "user.created",
      { userId: "user-123", source: "demo" },
      {
        additionalMetadata: {
          source: "react-router-example",
        },
        scope: "demo",
      },
    )
    expect(actionResponse).toBeInstanceOf(Response)
    const redirectResponse = actionResponse as Response
    expect(redirectResponse.status).toBe(302)
    expect(redirectResponse.headers.get("Location")).toBe(
      "/hatchet-demo?eventId=event%20id%2F123",
    )

    const loaderResponse = await loader(
      createRouteArgs(
        new Request(
          `https://example.com${redirectResponse.headers.get("Location")}`,
        ),
      ),
    )

    expect(getEventMock).toHaveBeenCalledWith("event id/123")
    expect(loaderResponse).toEqual({
      ok: true,
      data: {
        event: {
          eventId: "event id/123",
          key: "user.created",
          payload: { userId: "user-123", source: "demo" },
          scope: "demo",
        },
        runs: [],
      },
    })
  })

  it("loader skips event lookup when the URL does not select an event", async () => {
    listRunsMock.mockReturnValue(
      Effect.succeed([{ id: "run-1", workflowName: "wf", status: "COMPLETED" }]),
    )

    const loaderResponse = await loader(
      createRouteArgs(new Request("https://example.com/hatchet-demo")),
    )

    expect(getEventMock).not.toHaveBeenCalled()
    expect(loaderResponse).toEqual({
      ok: true,
      data: {
        event: undefined,
        runs: [{ id: "run-1", workflowName: "wf", status: "COMPLETED" }],
      },
    })
  })
})
