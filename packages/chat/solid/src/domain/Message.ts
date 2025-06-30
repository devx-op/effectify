import * as S from 'effect/Schema'

export const MessageId = S.String.pipe(S.brand('MessageId'))

export const Message = S.Struct({
  id: MessageId,
  body: S.String,
  createdAt: S.DateTimeUtc,
  readAt: S.NullOr(S.DateTimeUtc),
})

export type Message = typeof Message.Type
