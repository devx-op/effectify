import * as DateTime from "effect/DateTime"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import * as Domain from "./index.js"
import { Message, MessageId } from "./message.js"

describe("Message", () => {
  it("keeps the barrel wired to the canonical message and service modules", () => {
    expect(Domain.Message.MessageId).toBe(MessageId)
    expect(Domain.Message.Message).toBe(Message)
    expect(Domain.NetworkMonitorService.NetworkMonitor).toBe(Domain.MessageService.NetworkMonitor)
  })

  it("uses the canonical MessageId brand and DateTime.Utc values", () => {
    const createdAt = DateTime.makeUnsafe("2024-03-20T10:00:00Z")
    const message = Message.make({
      id: MessageId.make("message-1"),
      body: "Hello",
      createdAt,
      readAt: null,
    })

    expect(message.id).toBe("message-1")
    expect(DateTime.isUtc(message.createdAt)).toBe(true)
    expect(message.readAt).toBeNull()

    message.readAt = DateTime.add(createdAt, { minutes: 1 })
    expect(message.readAt === null ? false : DateTime.isUtc(message.readAt)).toBe(true)
  })

  it("rejects unbranded input shapes that do not satisfy the runtime schemas", () => {
    expect(() => Schema.decodeUnknownSync(MessageId)(42)).toThrow()
    expect(() =>
      Schema.decodeUnknownSync(Message)({
        id: "message-1",
        body: "Hello",
        createdAt: new Date("2024-03-20T10:00:00Z"),
        readAt: null,
      }),
    ).toThrow()
  })
})
