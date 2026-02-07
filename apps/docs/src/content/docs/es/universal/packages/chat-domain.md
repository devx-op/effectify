---
title: "@effectify/chat-domain"
description: Lógica de dominio y reglas de negocio para funcionalidad de chat
---

# @effectify/chat-domain

El paquete `@effectify/chat-domain` proporciona lógica de dominio de chat agnóstica al framework construida con Effect. Contiene las reglas de negocio, entidades y servicios que impulsan la funcionalidad de chat en React, SolidJS y Node.js.

## Instalación

```bash
npm install @effectify/chat-domain effect
```

## Entidades principales

### Message

```typescript
import { Message, MessageId, RoomId, UserId } from "@effectify/chat-domain"

interface Message {
  readonly id: MessageId
  readonly content: string
  readonly type: MessageType
  readonly userId: UserId
  readonly roomId: RoomId
  readonly timestamp: Date
  readonly edited?: boolean
  readonly editedAt?: Date
  readonly reactions: Reaction[]
  readonly replyTo?: MessageId
}

type MessageType = "text" | "image" | "file" | "system"

interface Reaction {
  readonly emoji: string
  readonly userId: UserId
  readonly timestamp: Date
}
```

### ChatRoom

```typescript
interface ChatRoom {
  readonly id: RoomId
  readonly name: RoomName
  readonly description?: string
  readonly type: RoomType
  readonly participants: Set<UserId>
  readonly settings: RoomSettings
  readonly createdBy: UserId
  readonly createdAt: Date
  readonly updatedAt: Date
}

type RoomType = "public" | "private" | "direct"

interface RoomSettings {
  readonly maxParticipants: number
  readonly allowFileUploads: boolean
  readonly allowReactions: boolean
  readonly messageRetentionDays: number
}
```

### User

```typescript
interface User {
  readonly id: UserId
  readonly name: UserName
  readonly avatar?: string
  readonly status: UserStatus
  readonly lastSeen: Date
}

type UserStatus = "online" | "away" | "busy" | "offline"
```

## Servicios de dominio

### MessageDomain

```typescript
import { MessageDomain } from "@effectify/chat-domain"

const MessageDomain = {
  create: (data: CreateMessageData) =>
    Effect.gen(function*() {
      const messageId = yield* MessageId.generate()
      const content = yield* validateMessageContent(data.content)
      return {
        id: messageId,
        content,
        type: data.type || "text",
        userId: data.userId,
        roomId: data.roomId,
        timestamp: new Date(),
        reactions: [],
        edited: false,
      }
    }),

  edit: (message: Message, newContent: string, userId: UserId) =>
    Effect.gen(function*() {
      if (message.userId !== userId) {
        yield* Effect.fail(new UnauthorizedError({ message: "Only message author can edit" }))
      }
      const validContent = yield* validateMessageContent(newContent)
      return { ...message, content: validContent, edited: true, editedAt: new Date() }
    }),

  addReaction: (message: Message, emoji: string, userId: UserId) =>
    Effect.gen(function*() {
      const exists = message.reactions.find((r) => r.emoji === emoji && r.userId === userId)
      if (exists) {
        yield* Effect.fail(
          new BusinessRuleViolationError({
            rule: "unique-reaction",
            message: "User already reacted with this emoji",
          }),
        )
      }
      const reaction = { emoji, userId, timestamp: new Date() }
      return { ...message, reactions: [...message.reactions, reaction] }
    }),

  removeReaction: (message: Message, emoji: string, userId: UserId) =>
    Effect.gen(function*() {
      const idx = message.reactions.findIndex((r) => r.emoji === emoji && r.userId === userId)
      if (idx === -1) {
        yield* Effect.fail(new ResourceNotFoundError({ resource: "Reaction", id: `${emoji}-${userId}` }))
      }
      const updated = message.reactions.filter((_, i) => i !== idx)
      return { ...message, reactions: updated }
    }),
}
```
