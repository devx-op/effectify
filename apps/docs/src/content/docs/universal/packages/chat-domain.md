---
title: "@effectify/chat-domain"
description: Domain logic and business rules for chat functionality
---

# @effectify/chat-domain

The `@effectify/chat-domain` package provides pure, framework-agnostic chat domain logic built with Effect. It contains the core business rules, entities, and services that power chat functionality across React, SolidJS, and Node.js applications.

## Installation

```bash
npm install @effectify/chat-domain effect
```

## Core Entities

### Message

The Message entity represents a chat message:

```typescript
import { Message, MessageId, UserId, RoomId } from '@effectify/chat-domain'

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

type MessageType = 'text' | 'image' | 'file' | 'system'

interface Reaction {
  readonly emoji: string
  readonly userId: UserId
  readonly timestamp: Date
}
```

### ChatRoom

The ChatRoom aggregate manages participants and settings:

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

type RoomType = 'public' | 'private' | 'direct'

interface RoomSettings {
  readonly maxParticipants: number
  readonly allowFileUploads: boolean
  readonly allowReactions: boolean
  readonly messageRetentionDays: number
}
```

### User

The User entity represents chat participants:

```typescript
interface User {
  readonly id: UserId
  readonly name: UserName
  readonly avatar?: string
  readonly status: UserStatus
  readonly lastSeen: Date
}

type UserStatus = 'online' | 'away' | 'busy' | 'offline'
```

## Domain Services

### MessageDomain

Core message operations:

```typescript
import { MessageDomain } from '@effectify/chat-domain'

const MessageDomain = {
  // Create a new message
  create: (data: CreateMessageData) =>
    Effect.gen(function* () {
      const messageId = yield* MessageId.generate()
      const content = yield* validateMessageContent(data.content)
      
      return {
        id: messageId,
        content,
        type: data.type || 'text',
        userId: data.userId,
        roomId: data.roomId,
        timestamp: new Date(),
        reactions: [],
        edited: false
      }
    }),

  // Edit an existing message
  edit: (message: Message, newContent: string, userId: UserId) =>
    Effect.gen(function* () {
      if (message.userId !== userId) {
        yield* Effect.fail(new UnauthorizedError({
          message: 'Only message author can edit'
        }))
      }
      
      const validContent = yield* validateMessageContent(newContent)
      
      return {
        ...message,
        content: validContent,
        edited: true,
        editedAt: new Date()
      }
    }),

  // Add reaction to message
  addReaction: (message: Message, emoji: string, userId: UserId) =>
    Effect.gen(function* () {
      const existingReaction = message.reactions.find(
        r => r.emoji === emoji && r.userId === userId
      )
      
      if (existingReaction) {
        yield* Effect.fail(new BusinessRuleViolationError({
          rule: 'unique-reaction',
          message: 'User already reacted with this emoji'
        }))
      }
      
      const reaction = {
        emoji,
        userId,
        timestamp: new Date()
      }
      
      return {
        ...message,
        reactions: [...message.reactions, reaction]
      }
    }),

  // Remove reaction from message
  removeReaction: (message: Message, emoji: string, userId: UserId) =>
    Effect.gen(function* () {
      const reactionIndex = message.reactions.findIndex(
        r => r.emoji === emoji && r.userId === userId
      )
      
      if (reactionIndex === -1) {
        yield* Effect.fail(new ResourceNotFoundError({
          resource: 'Reaction',
          id: `${emoji}-${userId}`
        }))
      }
      
      const updatedReactions = message.reactions.filter((_, i) => i !== reactionIndex)
      
      return {
        ...message,
        reactions: updatedReactions
      }
    })
}
```

### ChatRoomDomain

Chat room management operations:

```typescript
const ChatRoomDomain = {
  // Create a new chat room
  create: (data: CreateRoomData) =>
    Effect.gen(function* () {
      const roomId = yield* RoomId.generate()
      const roomName = yield* RoomName.make(data.name)
      
      return {
        id: roomId,
        name: roomName,
        description: data.description,
        type: data.type || 'public',
        participants: new Set([data.createdBy]),
        settings: data.settings || defaultRoomSettings,
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),

  // Add participant to room
  addParticipant: (room: ChatRoom, userId: UserId) =>
    Effect.gen(function* () {
      if (room.participants.has(userId)) {
        yield* Effect.fail(new BusinessRuleViolationError({
          rule: 'unique-participant',
          message: 'User is already a participant'
        }))
      }
      
      if (room.participants.size >= room.settings.maxParticipants) {
        yield* Effect.fail(new BusinessRuleViolationError({
          rule: 'max-participants',
          message: 'Room has reached maximum participants'
        }))
      }
      
      return {
        ...room,
        participants: new Set([...room.participants, userId]),
        updatedAt: new Date()
      }
    }),

  // Remove participant from room
  removeParticipant: (room: ChatRoom, userId: UserId) =>
    Effect.gen(function* () {
      if (!room.participants.has(userId)) {
        yield* Effect.fail(new ResourceNotFoundError({
          resource: 'Participant',
          id: userId
        }))
      }
      
      const updatedParticipants = new Set(room.participants)
      updatedParticipants.delete(userId)
      
      return {
        ...room,
        participants: updatedParticipants,
        updatedAt: new Date()
      }
    }),

  // Update room settings
  updateSettings: (room: ChatRoom, settings: Partial<RoomSettings>, userId: UserId) =>
    Effect.gen(function* () {
      if (room.createdBy !== userId) {
        yield* Effect.fail(new UnauthorizedError({
          message: 'Only room creator can update settings'
        }))
      }
      
      const updatedSettings = { ...room.settings, ...settings }
      
      return {
        ...room,
        settings: updatedSettings,
        updatedAt: new Date()
      }
    })
}
```

### UserDomain

User-related operations:

```typescript
const UserDomain = {
  // Update user status
  updateStatus: (user: User, status: UserStatus) =>
    Effect.succeed({
      ...user,
      status,
      lastSeen: status === 'offline' ? new Date() : user.lastSeen
    }),

  // Update user profile
  updateProfile: (user: User, updates: UserProfileUpdates) =>
    Effect.gen(function* () {
      const name = updates.name 
        ? yield* UserName.make(updates.name)
        : user.name
      
      return {
        ...user,
        name,
        avatar: updates.avatar ?? user.avatar
      }
    }),

  // Check if user can send message to room
  canSendMessage: (user: User, room: ChatRoom) =>
    Effect.gen(function* () {
      if (!room.participants.has(user.id)) {
        yield* Effect.fail(new UnauthorizedError({
          message: 'User is not a participant in this room'
        }))
      }
      
      if (user.status === 'offline') {
        yield* Effect.fail(new BusinessRuleViolationError({
          rule: 'online-messaging',
          message: 'User must be online to send messages'
        }))
      }
      
      return true
    })
}
```

## Value Objects

### Branded Types

The package uses branded types for type safety:

```typescript
// Message identifiers
export type MessageId = string & { readonly _brand: 'MessageId' }
export type RoomId = string & { readonly _brand: 'RoomId' }
export type UserId = string & { readonly _brand: 'UserId' }

// Value objects
export type RoomName = string & { readonly _brand: 'RoomName' }
export type UserName = string & { readonly _brand: 'UserName' }

// Smart constructors
export const MessageId = {
  generate: () => Effect.sync(() => crypto.randomUUID() as MessageId),
  make: (value: string) => 
    value.length > 0 
      ? Effect.succeed(value as MessageId)
      : Effect.fail(new ValidationError({ field: 'messageId', message: 'Invalid message ID' }))
}

export const RoomName = {
  make: (value: string) =>
    Effect.gen(function* () {
      if (!value || value.trim().length === 0) {
        yield* Effect.fail(new ValidationError({
          field: 'roomName',
          message: 'Room name is required'
        }))
      }
      
      if (value.length > 100) {
        yield* Effect.fail(new ValidationError({
          field: 'roomName',
          message: 'Room name is too long'
        }))
      }
      
      return value.trim() as RoomName
    })
}

export const UserName = {
  make: (value: string) =>
    Effect.gen(function* () {
      if (!value || value.trim().length === 0) {
        yield* Effect.fail(new ValidationError({
          field: 'userName',
          message: 'User name is required'
        }))
      }
      
      if (value.length > 50) {
        yield* Effect.fail(new ValidationError({
          field: 'userName',
          message: 'User name is too long'
        }))
      }
      
      return value.trim() as UserName
    })
}
```

## Domain Events

The package defines events for important domain occurrences:

```typescript
// Base event interface
interface DomainEvent {
  readonly eventId: string
  readonly aggregateId: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly version: number
}

// Message events
export class MessageSentEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = 'MessageSent'
  readonly occurredAt = new Date()
  readonly version = 1
  
  constructor(
    readonly aggregateId: string,
    readonly message: Message
  ) {}
}

export class MessageEditedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = 'MessageEdited'
  readonly occurredAt = new Date()
  readonly version = 1
  
  constructor(
    readonly aggregateId: string,
    readonly message: Message,
    readonly previousContent: string
  ) {}
}

export class ReactionAddedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = 'ReactionAdded'
  readonly occurredAt = new Date()
  readonly version = 1
  
  constructor(
    readonly aggregateId: string,
    readonly messageId: MessageId,
    readonly reaction: Reaction
  ) {}
}

// Room events
export class RoomCreatedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = 'RoomCreated'
  readonly occurredAt = new Date()
  readonly version = 1
  
  constructor(
    readonly aggregateId: string,
    readonly room: ChatRoom
  ) {}
}

export class ParticipantJoinedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = 'ParticipantJoined'
  readonly occurredAt = new Date()
  readonly version = 1
  
  constructor(
    readonly aggregateId: string,
    readonly roomId: RoomId,
    readonly userId: UserId
  ) {}
}

// User events
export class UserStatusChangedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = 'UserStatusChanged'
  readonly occurredAt = new Date()
  readonly version = 1
  
  constructor(
    readonly aggregateId: string,
    readonly userId: UserId,
    readonly previousStatus: UserStatus,
    readonly newStatus: UserStatus
  ) {}
}
```

## Repository Interfaces

The package defines repository interfaces for data access:

```typescript
// Message repository
export interface MessageRepository {
  readonly save: (message: Message) => Effect<Message, RepositoryError>
  readonly findById: (id: MessageId) => Effect<Message | null, RepositoryError>
  readonly findByRoom: (roomId: RoomId, limit?: number, before?: Date) => Effect<Message[], RepositoryError>
  readonly findByUser: (userId: UserId, limit?: number) => Effect<Message[], RepositoryError>
  readonly delete: (id: MessageId) => Effect<void, RepositoryError>
  readonly search: (roomId: RoomId, query: string) => Effect<Message[], RepositoryError>
}

// Room repository
export interface ChatRoomRepository {
  readonly save: (room: ChatRoom) => Effect<ChatRoom, RepositoryError>
  readonly findById: (id: RoomId) => Effect<ChatRoom | null, RepositoryError>
  readonly findByParticipant: (userId: UserId) => Effect<ChatRoom[], RepositoryError>
  readonly findPublicRooms: (limit?: number) => Effect<ChatRoom[], RepositoryError>
  readonly delete: (id: RoomId) => Effect<void, RepositoryError>
}

// User repository
export interface UserRepository {
  readonly save: (user: User) => Effect<User, RepositoryError>
  readonly findById: (id: UserId) => Effect<User | null, RepositoryError>
  readonly findByIds: (ids: UserId[]) => Effect<User[], RepositoryError>
  readonly findOnlineUsers: () => Effect<User[], RepositoryError>
  readonly updateStatus: (id: UserId, status: UserStatus) => Effect<void, RepositoryError>
}
```

## Error Types

The package defines specific error types for different failure scenarios:

```typescript
import { Data } from 'effect'

// Base domain error
export class ChatDomainError extends Data.TaggedError("ChatDomainError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

// Validation errors
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly message: string
}> {}

// Business rule violations
export class BusinessRuleViolationError extends Data.TaggedError("BusinessRuleViolationError")<{
  readonly rule: string
  readonly message: string
}> {}

// Authorization errors
export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly message: string
}> {}

// Resource not found
export class ResourceNotFoundError extends Data.TaggedError("ResourceNotFoundError")<{
  readonly resource: string
  readonly id: string
}> {}

// Repository errors
export class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly message: string
  readonly cause?: unknown
}> {}
```

## Usage Examples

### Creating and Sending Messages

```typescript
import { MessageDomain, ChatRoomDomain } from '@effectify/chat-domain'

const sendMessage = (content: string, roomId: RoomId, userId: UserId) =>
  Effect.gen(function* () {
    // Get the room
    const room = yield* ChatRoomRepository.findById(roomId)
    if (!room) {
      yield* Effect.fail(new ResourceNotFoundError({
        resource: 'ChatRoom',
        id: roomId
      }))
    }
    
    // Get the user
    const user = yield* UserRepository.findById(userId)
    if (!user) {
      yield* Effect.fail(new ResourceNotFoundError({
        resource: 'User',
        id: userId
      }))
    }
    
    // Check if user can send message
    yield* UserDomain.canSendMessage(user, room)
    
    // Create the message
    const message = yield* MessageDomain.create({
      content,
      type: 'text',
      userId,
      roomId
    })
    
    // Save the message
    const savedMessage = yield* MessageRepository.save(message)
    
    // Publish event
    yield* EventBus.publish(new MessageSentEvent(savedMessage.id, savedMessage))
    
    return savedMessage
  })
```

### Managing Chat Rooms

```typescript
const createChatRoom = (name: string, creatorId: UserId, type: RoomType = 'public') =>
  Effect.gen(function* () {
    // Create the room
    const room = yield* ChatRoomDomain.create({
      name,
      type,
      createdBy: creatorId,
      settings: {
        maxParticipants: 100,
        allowFileUploads: true,
        allowReactions: true,
        messageRetentionDays: 30
      }
    })
    
    // Save the room
    const savedRoom = yield* ChatRoomRepository.save(room)
    
    // Publish event
    yield* EventBus.publish(new RoomCreatedEvent(savedRoom.id, savedRoom))
    
    return savedRoom
  })

const joinRoom = (roomId: RoomId, userId: UserId) =>
  Effect.gen(function* () {
    // Get the room
    const room = yield* ChatRoomRepository.findById(roomId)
    if (!room) {
      yield* Effect.fail(new ResourceNotFoundError({
        resource: 'ChatRoom',
        id: roomId
      }))
    }
    
    // Add participant
    const updatedRoom = yield* ChatRoomDomain.addParticipant(room, userId)
    
    // Save the updated room
    const savedRoom = yield* ChatRoomRepository.save(updatedRoom)
    
    // Publish event
    yield* EventBus.publish(new ParticipantJoinedEvent(savedRoom.id, roomId, userId))
    
    return savedRoom
  })
```

## Testing

The domain package is designed for easy testing:

```typescript
import { Effect, Layer } from 'effect'

// Mock repositories for testing
const MockMessageRepository = Layer.succeed(MessageRepository, {
  save: (message) => Effect.succeed(message),
  findById: (id) => Effect.succeed(null),
  findByRoom: (roomId) => Effect.succeed([]),
  findByUser: (userId) => Effect.succeed([]),
  delete: (id) => Effect.succeed(void 0),
  search: (roomId, query) => Effect.succeed([])
})

// Test domain logic
const testSendMessage = Effect.gen(function* () {
  const message = yield* MessageDomain.create({
    content: 'Hello, world!',
    type: 'text',
    userId: 'user-1' as UserId,
    roomId: 'room-1' as RoomId
  })
  
  expect(message.content).toBe('Hello, world!')
  expect(message.type).toBe('text')
}).pipe(
  Effect.provide(MockMessageRepository)
)

await Effect.runPromise(testSendMessage)
```

## Integration

The chat domain package integrates with platform-specific implementations:

```typescript
// React usage
function ReactChatRoom({ roomId }: { roomId: RoomId }) {
  const sendMessage = (content: string) => {
    Effect.runPromise(
      sendMessage(content, roomId, currentUserId)
        .pipe(Effect.provide(ReactDependencies))
    )
  }
  // ...
}

// SolidJS usage
function SolidChatRoom(props: { roomId: RoomId }) {
  const sendMessage = (content: string) => {
    Effect.runPromise(
      sendMessage(content, props.roomId, currentUserId)
        .pipe(Effect.provide(SolidDependencies))
    )
  }
  // ...
}

// Node.js usage
app.post('/rooms/:roomId/messages', (req, res) => {
  Effect.runPromise(
    sendMessage(req.body.content, req.params.roomId, req.user.id)
      .pipe(
        Effect.provide(NodeDependencies),
        Effect.map(message => res.json(message))
      )
  )
})
```

The `@effectify/chat-domain` package provides a solid foundation for building chat applications with consistent business logic across all platforms.
