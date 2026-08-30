import * as Schema from "effect/Schema"

export const MessageId = Schema.String.pipe(Schema.brand("MessageId"))
export type MessageId = typeof MessageId.Type

export const Message = Schema.Struct({
  id: MessageId,
  body: Schema.String,
  createdAt: Schema.DateTimeUtc,
  readAt: Schema.NullOr(Schema.DateTimeUtc).pipe(Schema.mutableKey),
})
export type Message = typeof Message.Type
