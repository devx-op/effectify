---
title: Universal Concepts
description: Deep dive into the core concepts and patterns used in Effectify universal packages
---

# Universal Concepts

This guide explores the fundamental concepts and patterns that make Effectify's universal packages work seamlessly across React, SolidJS, and Node.js applications.

## Effect Programming Model

### What is Effect?

Effect is a powerful TypeScript library for building robust, composable applications. It provides:

- **Type-safe error handling**: Errors are part of the type signature
- **Composability**: Operations can be combined and transformed
- **Resource management**: Automatic cleanup of resources
- **Testability**: Easy mocking and testing
- **Concurrency**: Built-in support for async operations

```typescript
import { Effect } from "effect"

// Effect<Success, Error, Requirements>
const fetchUser = (id: string): Effect<User, UserNotFoundError, UserRepository> =>
  Effect.gen(function*() {
    const repo = yield* UserRepository
    const user = yield* repo.findById(id)

    if (!user) {
      yield* Effect.fail(new UserNotFoundError({ userId: id }))
    }

    return user
  })
```

### Effect Composition

Effects can be composed in various ways:

```typescript
// Sequential composition
const processUser = (id: string) =>
  Effect.gen(function*() {
    const user = yield* fetchUser(id)
    const validated = yield* validateUser(user)
    const updated = yield* updateUser(validated)

    return updated
  })

// Parallel composition
const fetchUserData = (id: string) =>
  Effect.all([
    fetchUser(id),
    fetchUserPreferences(id),
    fetchUserActivity(id),
  ])

// Conditional composition
const fetchUserWithFallback = (id: string) =>
  fetchUser(id).pipe(
    Effect.catchTag("UserNotFoundError", () => createDefaultUser(id)),
  )
```

## Domain-Driven Design

### Entities and Value Objects

Universal packages distinguish between entities (objects with identity) and value objects (immutable data):

```typescript
// Entity - has identity
interface User {
  readonly id: UserId // Identity
  readonly email: Email
  readonly profile: UserProfile
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Value Object - immutable data
interface UserProfile {
  readonly name: UserName
  readonly bio: string
  readonly avatar?: string
}

// Value object constructor
const UserProfile = {
  create: (name: string, bio: string, avatar?: string) =>
    Effect.gen(function*() {
      const validName = yield* UserName.make(name)
      const validBio = yield* validateBio(bio)

      return {
        name: validName,
        bio: validBio,
        avatar,
      }
    }),
}
```

### Aggregates

Aggregates are clusters of domain objects that are treated as a single unit:

```typescript
// Chat Room Aggregate
interface ChatRoom {
  readonly id: RoomId
  readonly name: RoomName
  readonly participants: Set<UserId>
  readonly messages: Message[]
  readonly settings: RoomSettings
  readonly createdAt: Date
}

const ChatRoomAggregate = {
  // Factory method
  create: (name: string, creatorId: UserId) =>
    Effect.gen(function*() {
      const roomId = yield* RoomId.generate()
      const roomName = yield* RoomName.make(name)

      return {
        id: roomId,
        name: roomName,
        participants: new Set([creatorId]),
        messages: [],
        settings: defaultRoomSettings,
        createdAt: new Date(),
      }
    }),

  // Business methods
  addParticipant: (room: ChatRoom, userId: UserId) =>
    Effect.gen(function*() {
      if (room.participants.has(userId)) {
        yield* Effect.fail(
          new BusinessRuleViolationError({
            rule: "unique-participant",
            message: "User is already a participant",
          }),
        )
      }

      if (room.participants.size >= room.settings.maxParticipants) {
        yield* Effect.fail(
          new BusinessRuleViolationError({
            rule: "max-participants",
            message: "Room has reached maximum participants",
          }),
        )
      }

      return {
        ...room,
        participants: new Set([...room.participants, userId]),
      }
    }),

  sendMessage: (room: ChatRoom, message: Message) =>
    Effect.gen(function*() {
      if (!room.participants.has(message.userId)) {
        yield* Effect.fail(
          new BusinessRuleViolationError({
            rule: "participant-only-messaging",
            message: "Only participants can send messages",
          }),
        )
      }

      const validatedMessage = yield* validateMessage(message)

      return {
        ...room,
        messages: [...room.messages, validatedMessage],
      }
    }),
}
```

### Domain Services

Domain services contain business logic that doesn't naturally fit in entities:

```typescript
const ChatDomainService = {
  // Complex business logic
  calculateUserEngagement: (userId: UserId, timeframe: TimeFrame) =>
    Effect.gen(function*() {
      const messages = yield* MessageRepository.findByUserAndTimeframe(userId, timeframe)
      const reactions = yield* ReactionRepository.findByUserAndTimeframe(userId, timeframe)
      const sessions = yield* SessionRepository.findByUserAndTimeframe(userId, timeframe)

      const messageScore = messages.length * 1.0
      const reactionScore = reactions.length * 0.5
      const sessionScore = sessions.reduce((acc, s) => acc + s.duration, 0) / 1000 / 60 // minutes

      return {
        userId,
        timeframe,
        messageScore,
        reactionScore,
        sessionScore,
        totalScore: messageScore + reactionScore + sessionScore,
      }
    }),

  // Cross-aggregate operations
  migrateUserToNewRoom: (userId: UserId, fromRoomId: RoomId, toRoomId: RoomId) =>
    Effect.gen(function*() {
      const fromRoom = yield* ChatRoomRepository.findById(fromRoomId)
      const toRoom = yield* ChatRoomRepository.findById(toRoomId)

      if (!fromRoom || !toRoom) {
        yield* Effect.fail(
          new ResourceNotFoundError({
            resource: "ChatRoom",
            id: !fromRoom ? fromRoomId : toRoomId,
          }),
        )
      }

      const updatedFromRoom = yield* ChatRoomAggregate.removeParticipant(fromRoom, userId)
      const updatedToRoom = yield* ChatRoomAggregate.addParticipant(toRoom, userId)

      yield* ChatRoomRepository.save(updatedFromRoom)
      yield* ChatRoomRepository.save(updatedToRoom)

      yield* EventBus.publish(new UserMigratedEvent(userId, fromRoomId, toRoomId))
    }),
}
```

## Event-Driven Architecture

### Domain Events

Domain events represent things that have happened in the domain:

```typescript
// Base event interface
interface DomainEvent {
  readonly eventId: string
  readonly aggregateId: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly version: number
}

// Specific domain events
class UserRegisteredEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = "UserRegistered"
  readonly occurredAt = new Date()
  readonly version = 1

  constructor(
    readonly aggregateId: string,
    readonly user: User,
  ) {}
}

class MessageSentEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID()
  readonly eventType = "MessageSent"
  readonly occurredAt = new Date()
  readonly version = 1

  constructor(
    readonly aggregateId: string,
    readonly message: Message,
    readonly roomId: RoomId,
  ) {}
}
```

### Event Handlers

Event handlers respond to domain events:

```typescript
const UserEventHandlers = {
  onUserRegistered: (event: UserRegisteredEvent) =>
    Effect.gen(function*() {
      const logger = yield* Logger
      const emailService = yield* EmailService

      yield* logger.info("User registered", { userId: event.user.id })

      // Send welcome email
      yield* emailService.sendWelcomeEmail(event.user.email, event.user.name)

      // Create default preferences
      yield* UserPreferencesRepository.create({
        userId: event.user.id,
        preferences: defaultUserPreferences,
      })
    }),

  onMessageSent: (event: MessageSentEvent) =>
    Effect.gen(function*() {
      const notificationService = yield* NotificationService
      const room = yield* ChatRoomRepository.findById(event.roomId)

      if (!room) return

      // Notify other participants
      const otherParticipants = Array.from(room.participants)
        .filter((id) => id !== event.message.userId)

      yield* Effect.forEach(otherParticipants, (participantId) =>
        notificationService.sendMessageNotification(
          participantId,
          event.message,
          room.name,
        ))
    }),
}
```

### Event Bus

The event bus coordinates event publishing and handling:

```typescript
export interface EventBus {
  readonly publish: <T extends DomainEvent>(event: T) => Effect<void>
  readonly subscribe: <T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Effect<void>,
  ) => Effect<void>
}

// In-memory implementation
const InMemoryEventBus = Layer.succeed(EventBus, {
  publish: <T extends DomainEvent>(event: T) =>
    Effect.gen(function*() {
      const handlers = eventHandlers.get(event.eventType) || []

      yield* Effect.forEach(handlers, (handler) =>
        handler(event).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function*() {
              const logger = yield* Logger
              yield* logger.error("Event handler failed", { event, error })
            })
          ),
        ))
    }),

  subscribe: <T extends DomainEvent>(eventType: string, handler: (event: T) => Effect<void>) =>
    Effect.sync(() => {
      const handlers = eventHandlers.get(eventType) || []
      eventHandlers.set(eventType, [...handlers, handler])
    }),
})
```

## Repository Pattern

### Repository Interface

Repositories provide a collection-like interface for accessing aggregates:

```typescript
export interface Repository<T, ID> {
  readonly findById: (id: ID) => Effect<T | null, RepositoryError>
  readonly save: (entity: T) => Effect<T, RepositoryError>
  readonly delete: (id: ID) => Effect<void, RepositoryError>
}

export interface UserRepository extends Repository<User, UserId> {
  readonly findByEmail: (email: Email) => Effect<User | null, RepositoryError>
  readonly findByIds: (ids: UserId[]) => Effect<User[], RepositoryError>
  readonly search: (criteria: UserSearchCriteria) => Effect<User[], RepositoryError>
}

export interface ChatRoomRepository extends Repository<ChatRoom, RoomId> {
  readonly findByParticipant: (userId: UserId) => Effect<ChatRoom[], RepositoryError>
  readonly findPublicRooms: () => Effect<ChatRoom[], RepositoryError>
}
```

### Repository Implementation

Different platforms can provide different implementations:

```typescript
// SQLite implementation
const SqliteUserRepository: UserRepository = {
  findById: (id) =>
    Effect.tryPromise({
      try: () => db.selectFrom("users").where("id", "=", id).executeTakeFirst(),
      catch: (error) => new RepositoryError("Failed to find user", { cause: error }),
    }).pipe(
      Effect.map((row) => row ? mapRowToUser(row) : null),
    ),

  save: (user) =>
    Effect.tryPromise({
      try: () => db.insertInto("users").values(mapUserToRow(user)).execute(),
      catch: (error) => new RepositoryError("Failed to save user", { cause: error }),
    }).pipe(
      Effect.map(() => user),
    ),

  findByEmail: (email) =>
    Effect.tryPromise({
      try: () => db.selectFrom("users").where("email", "=", email).executeTakeFirst(),
      catch: (error) => new RepositoryError("Failed to find user by email", { cause: error }),
    }).pipe(
      Effect.map((row) => row ? mapRowToUser(row) : null),
    ),
}

// PostgreSQL implementation
const PostgresUserRepository: UserRepository = {
  findById: (id) =>
    Effect.tryPromise({
      try: () => pool.query("SELECT * FROM users WHERE id = $1", [id]),
      catch: (error) => new RepositoryError("Failed to find user", { cause: error }),
    }).pipe(
      Effect.map((result) => result.rows[0] ? mapRowToUser(result.rows[0]) : null),
    ),

  save: (user) =>
    Effect.tryPromise({
      try: () =>
        pool.query(
          "INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET email = $2, name = $3",
          [user.id, user.email, user.name, user.createdAt],
        ),
      catch: (error) => new RepositoryError("Failed to save user", { cause: error }),
    }).pipe(
      Effect.map(() => user),
    ),
}
```

## Specification Pattern

Specifications encapsulate business rules and can be combined:

```typescript
// Base specification interface
interface Specification<T> {
  readonly isSatisfiedBy: (candidate: T) => Effect<boolean>
  readonly and: (other: Specification<T>) => Specification<T>
  readonly or: (other: Specification<T>) => Specification<T>
  readonly not: () => Specification<T>
}

// User specifications
const ActiveUserSpecification: Specification<User> = {
  isSatisfiedBy: (user) => Effect.succeed(user.status === "active"),
  and: (other) => AndSpecification(ActiveUserSpecification, other),
  or: (other) => OrSpecification(ActiveUserSpecification, other),
  not: () => NotSpecification(ActiveUserSpecification),
}

const EmailVerifiedSpecification: Specification<User> = {
  isSatisfiedBy: (user) => Effect.succeed(user.emailVerified),
  and: (other) => AndSpecification(EmailVerifiedSpecification, other),
  or: (other) => OrSpecification(EmailVerifiedSpecification, other),
  not: () => NotSpecification(EmailVerifiedSpecification),
}

// Composite specifications
const EligibleForPremiumSpecification = ActiveUserSpecification
  .and(EmailVerifiedSpecification)
  .and(AccountAgeSpecification(30)) // 30 days old

// Usage in domain service
const UserDomainService = {
  upgradeUserToPremium: (user: User) =>
    Effect.gen(function*() {
      const isEligible = yield* EligibleForPremiumSpecification.isSatisfiedBy(user)

      if (!isEligible) {
        yield* Effect.fail(
          new BusinessRuleViolationError({
            rule: "premium-eligibility",
            message: "User is not eligible for premium upgrade",
          }),
        )
      }

      return yield* UserRepository.save({
        ...user,
        plan: "premium",
        upgradedAt: new Date(),
      })
    }),
}
```

## Value Objects and Validation

### Smart Constructors

Value objects use smart constructors to ensure validity:

```typescript
// Email value object
export type Email = string & { readonly _brand: "Email" }

export const Email = {
  make: (value: string): Effect<Email, ValidationError> =>
    Effect.gen(function*() {
      if (!value) {
        yield* Effect.fail(
          new ValidationError({
            field: "email",
            message: "Email is required",
          }),
        )
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        yield* Effect.fail(
          new ValidationError({
            field: "email",
            message: "Invalid email format",
          }),
        )
      }

      if (value.length > 254) {
        yield* Effect.fail(
          new ValidationError({
            field: "email",
            message: "Email is too long",
          }),
        )
      }

      return value.toLowerCase() as Email
    }),

  toString: (email: Email): string => email,

  equals: (a: Email, b: Email): boolean => a === b,
}

// Password value object with complex validation
export type Password = string & { readonly _brand: "Password" }

export const Password = {
  make: (value: string): Effect<Password, ValidationError> =>
    Effect.gen(function*() {
      if (!value) {
        yield* Effect.fail(
          new ValidationError({
            field: "password",
            message: "Password is required",
          }),
        )
      }

      if (value.length < 8) {
        yield* Effect.fail(
          new ValidationError({
            field: "password",
            message: "Password must be at least 8 characters",
          }),
        )
      }

      if (!/[A-Z]/.test(value)) {
        yield* Effect.fail(
          new ValidationError({
            field: "password",
            message: "Password must contain at least one uppercase letter",
          }),
        )
      }

      if (!/[a-z]/.test(value)) {
        yield* Effect.fail(
          new ValidationError({
            field: "password",
            message: "Password must contain at least one lowercase letter",
          }),
        )
      }

      if (!/[0-9]/.test(value)) {
        yield* Effect.fail(
          new ValidationError({
            field: "password",
            message: "Password must contain at least one number",
          }),
        )
      }

      return value as Password
    }),

  hash: (password: Password) =>
    Effect.tryPromise({
      try: () => bcrypt.hash(password, 12),
      catch: (error) =>
        new ValidationError({
          field: "password",
          message: "Failed to hash password",
        }),
    }),

  verify: (password: Password, hash: string) =>
    Effect.tryPromise({
      try: () => bcrypt.compare(password, hash),
      catch: (error) =>
        new ValidationError({
          field: "password",
          message: "Failed to verify password",
        }),
    }),
}
```

## Resource Management

Universal packages handle resources safely using Effect's resource management:

```typescript
// Database connection resource
const withDatabaseConnection = <A, E>(
  operation: (db: Database) => Effect<A, E>,
) =>
  Effect.acquireUseRelease(
    // Acquire
    Effect.tryPromise({
      try: () => createDatabaseConnection(),
      catch: (error) => new ConnectionError("Failed to connect", { cause: error }),
    }),
    // Use
    operation,
    // Release
    (db) => Effect.sync(() => db.close()),
  )

// File system resource
const withTempFile = <A, E>(
  operation: (filePath: string) => Effect<A, E>,
) =>
  Effect.acquireUseRelease(
    // Acquire
    Effect.tryPromise({
      try: () => fs.mkdtemp(path.join(os.tmpdir(), "effectify-")),
      catch: (error) => new FileSystemError("Failed to create temp file", { cause: error }),
    }),
    // Use
    operation,
    // Release
    (filePath) =>
      Effect.tryPromise({
        try: () => fs.rm(filePath, { recursive: true }),
        catch: () => void 0, // Ignore cleanup errors
      }),
  )

// HTTP client resource
const withHttpClient = <A, E>(
  operation: (client: HttpClient) => Effect<A, E>,
) =>
  Effect.acquireUseRelease(
    Effect.sync(() => new HttpClient()),
    operation,
    (client) => Effect.sync(() => client.destroy()),
  )
```

These concepts form the foundation of Effectify's universal packages, enabling consistent, type-safe, and maintainable code across all platforms.
