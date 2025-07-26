---
title: "@effectify/shared-types"
description: Common TypeScript types and interfaces shared across all Effectify packages
---

# @effectify/shared-types

The `@effectify/shared-types` package provides common TypeScript types, interfaces, and utilities that are shared across all Effectify packages. It ensures type consistency and provides foundational types for building type-safe applications.

## Installation

```bash
npm install @effectify/shared-types
```

## Core Types

### Branded Types

Branded types prevent mixing up similar primitive values:

```typescript
import { Brand } from '@effectify/shared-types'

// Create branded types
export type UserId = Brand<string, 'UserId'>
export type Email = Brand<string, 'Email'>
export type Timestamp = Brand<number, 'Timestamp'>

// Usage
const userId: UserId = 'user-123' as UserId
const email: Email = 'user@example.com' as Email

// This would be a compile-time error:
// const wrongUsage: UserId = email // Error: Type 'Email' is not assignable to type 'UserId'
```

### Result Types

Result types for handling success and error cases:

```typescript
import { Result, Success, Failure } from '@effectify/shared-types'

// Result type definition
type Result<T, E = Error> = Success<T> | Failure<E>

interface Success<T> {
  readonly _tag: 'Success'
  readonly value: T
}

interface Failure<E> {
  readonly _tag: 'Failure'
  readonly error: E
}

// Helper functions
export const success = <T>(value: T): Success<T> => ({
  _tag: 'Success',
  value
})

export const failure = <E>(error: E): Failure<E> => ({
  _tag: 'Failure',
  error
})

// Usage
const parseNumber = (input: string): Result<number, string> => {
  const num = Number(input)
  return isNaN(num) 
    ? failure('Invalid number')
    : success(num)
}

const result = parseNumber('42')
if (result._tag === 'Success') {
  console.log(result.value) // 42
} else {
  console.error(result.error) // Invalid number
}
```

### Option Types

Option types for handling nullable values:

```typescript
import { Option, Some, None } from '@effectify/shared-types'

// Option type definition
type Option<T> = Some<T> | None

interface Some<T> {
  readonly _tag: 'Some'
  readonly value: T
}

interface None {
  readonly _tag: 'None'
}

// Helper functions
export const some = <T>(value: T): Some<T> => ({
  _tag: 'Some',
  value
})

export const none: None = { _tag: 'None' }

export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
  value != null ? some(value) : none

// Usage
const findUser = (id: string): Option<User> => {
  const user = users.find(u => u.id === id)
  return fromNullable(user)
}

const userOption = findUser('123')
if (userOption._tag === 'Some') {
  console.log(userOption.value.name)
} else {
  console.log('User not found')
}
```

## Entity Types

### Base Entity

Base interface for all entities:

```typescript
import { BaseEntity, EntityId } from '@effectify/shared-types'

interface BaseEntity<T extends string = string> {
  readonly id: EntityId<T>
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly version: number
}

// Branded entity ID
type EntityId<T extends string> = Brand<string, `EntityId<${T}>`>

// Usage
interface User extends BaseEntity<'User'> {
  readonly email: string
  readonly name: string
  readonly status: UserStatus
}

interface ChatRoom extends BaseEntity<'ChatRoom'> {
  readonly name: string
  readonly participants: Set<EntityId<'User'>>
  readonly settings: RoomSettings
}
```

### Aggregate Root

Base interface for aggregate roots in domain-driven design:

```typescript
import { AggregateRoot, DomainEvent } from '@effectify/shared-types'

interface AggregateRoot<T extends string = string> extends BaseEntity<T> {
  readonly events: ReadonlyArray<DomainEvent>
}

interface DomainEvent {
  readonly eventId: string
  readonly eventType: string
  readonly aggregateId: string
  readonly occurredAt: Date
  readonly version: number
}

// Usage
interface ChatRoomAggregate extends AggregateRoot<'ChatRoom'> {
  readonly name: string
  readonly participants: Set<EntityId<'User'>>
  readonly messages: Message[]
}
```

## Value Object Types

### Base Value Object

Base interface for value objects:

```typescript
import { ValueObject } from '@effectify/shared-types'

interface ValueObject {
  readonly equals: (other: ValueObject) => boolean
  readonly toString: () => string
}

// Example implementation
class Email implements ValueObject {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format')
    }
  }

  equals(other: ValueObject): boolean {
    return other instanceof Email && other.value === this.value
  }

  toString(): string {
    return this.value
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
```

### Money Value Object

Common value object for monetary values:

```typescript
import { Money, Currency } from '@effectify/shared-types'

interface Money extends ValueObject {
  readonly amount: number
  readonly currency: Currency
  readonly add: (other: Money) => Money
  readonly subtract: (other: Money) => Money
  readonly multiply: (factor: number) => Money
  readonly divide: (divisor: number) => Money
}

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD'

// Usage
const price = new Money(99.99, 'USD')
const tax = price.multiply(0.08)
const total = price.add(tax)
```

## Error Types

### Base Error Types

Common error interfaces:

```typescript
import { DomainError, ValidationError, NotFoundError } from '@effectify/shared-types'

interface DomainError {
  readonly name: string
  readonly message: string
  readonly code: string
  readonly timestamp: Date
  readonly cause?: unknown
}

interface ValidationError extends DomainError {
  readonly name: 'ValidationError'
  readonly field: string
  readonly value: unknown
  readonly constraints: string[]
}

interface NotFoundError extends DomainError {
  readonly name: 'NotFoundError'
  readonly resource: string
  readonly identifier: string
}

interface UnauthorizedError extends DomainError {
  readonly name: 'UnauthorizedError'
  readonly action: string
  readonly resource?: string
}

interface BusinessRuleViolationError extends DomainError {
  readonly name: 'BusinessRuleViolationError'
  readonly rule: string
  readonly context: Record<string, unknown>
}
```

### Error Factory

Factory functions for creating errors:

```typescript
import { ErrorFactory } from '@effectify/shared-types'

export const ErrorFactory = {
  validation: (field: string, value: unknown, constraints: string[]): ValidationError => ({
    name: 'ValidationError',
    message: `Validation failed for field '${field}'`,
    code: 'VALIDATION_ERROR',
    timestamp: new Date(),
    field,
    value,
    constraints
  }),

  notFound: (resource: string, identifier: string): NotFoundError => ({
    name: 'NotFoundError',
    message: `${resource} with identifier '${identifier}' not found`,
    code: 'NOT_FOUND',
    timestamp: new Date(),
    resource,
    identifier
  }),

  unauthorized: (action: string, resource?: string): UnauthorizedError => ({
    name: 'UnauthorizedError',
    message: `Unauthorized to perform action '${action}'${resource ? ` on ${resource}` : ''}`,
    code: 'UNAUTHORIZED',
    timestamp: new Date(),
    action,
    resource
  }),

  businessRuleViolation: (rule: string, context: Record<string, unknown>): BusinessRuleViolationError => ({
    name: 'BusinessRuleViolationError',
    message: `Business rule '${rule}' violated`,
    code: 'BUSINESS_RULE_VIOLATION',
    timestamp: new Date(),
    rule,
    context
  })
}
```

## Repository Types

### Base Repository Interface

Generic repository interface:

```typescript
import { Repository, EntityId, BaseEntity } from '@effectify/shared-types'

interface Repository<T extends BaseEntity, ID extends EntityId<string>> {
  readonly findById: (id: ID) => Promise<T | null>
  readonly findAll: () => Promise<T[]>
  readonly save: (entity: T) => Promise<T>
  readonly delete: (id: ID) => Promise<void>
  readonly exists: (id: ID) => Promise<boolean>
}

// Specification pattern
interface Specification<T> {
  readonly isSatisfiedBy: (candidate: T) => boolean
  readonly and: (other: Specification<T>) => Specification<T>
  readonly or: (other: Specification<T>) => Specification<T>
  readonly not: () => Specification<T>
}

interface SpecificationRepository<T extends BaseEntity, ID extends EntityId<string>> 
  extends Repository<T, ID> {
  readonly findBySpecification: (spec: Specification<T>) => Promise<T[]>
  readonly countBySpecification: (spec: Specification<T>) => Promise<number>
}
```

## Service Types

### Base Service Interface

Common service patterns:

```typescript
import { Service, Command, Query, Event } from '@effectify/shared-types'

interface Service {
  readonly name: string
  readonly version: string
}

// Command Query Responsibility Segregation (CQRS)
interface Command {
  readonly commandId: string
  readonly commandType: string
  readonly timestamp: Date
  readonly userId?: string
}

interface Query {
  readonly queryId: string
  readonly queryType: string
  readonly timestamp: Date
  readonly userId?: string
}

interface Event {
  readonly eventId: string
  readonly eventType: string
  readonly aggregateId: string
  readonly timestamp: Date
  readonly version: number
  readonly data: Record<string, unknown>
}

// Service interfaces
interface CommandHandler<T extends Command, R> {
  readonly handle: (command: T) => Promise<R>
}

interface QueryHandler<T extends Query, R> {
  readonly handle: (query: T) => Promise<R>
}

interface EventHandler<T extends Event> {
  readonly handle: (event: T) => Promise<void>
}
```

## Utility Types

### Common Utility Types

Useful TypeScript utility types:

```typescript
import { 
  DeepReadonly, 
  DeepPartial, 
  NonEmptyArray, 
  Opaque,
  Prettify 
} from '@effectify/shared-types'

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// Deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Non-empty array
type NonEmptyArray<T> = [T, ...T[]]

// Opaque types (alternative to branded types)
type Opaque<T, K> = T & { readonly __opaque: K }

// Prettify complex types
type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

// Usage examples
type ReadonlyUser = DeepReadonly<User>
type PartialUserUpdate = DeepPartial<User>
type UserIds = NonEmptyArray<UserId>
type SecureToken = Opaque<string, 'SecureToken'>
```

### Functional Utility Types

Types for functional programming patterns:

```typescript
import { Predicate, Mapper, Reducer, Comparator } from '@effectify/shared-types'

type Predicate<T> = (value: T) => boolean
type Mapper<T, U> = (value: T) => U
type Reducer<T, U> = (accumulator: U, current: T) => U
type Comparator<T> = (a: T, b: T) => number

// Higher-order type utilities
type AsyncPredicate<T> = (value: T) => Promise<boolean>
type AsyncMapper<T, U> = (value: T) => Promise<U>
type AsyncReducer<T, U> = (accumulator: U, current: T) => Promise<U>

// Function composition types
type Compose<T, U, V> = (f: Mapper<U, V>, g: Mapper<T, U>) => Mapper<T, V>
type Pipe<T, U, V> = (g: Mapper<T, U>, f: Mapper<U, V>) => Mapper<T, V>
```

## Configuration Types

### Application Configuration

Common configuration interfaces:

```typescript
import { AppConfig, DatabaseConfig, AuthConfig, LoggingConfig } from '@effectify/shared-types'

interface AppConfig {
  readonly environment: Environment
  readonly port: number
  readonly host: string
  readonly database: DatabaseConfig
  readonly auth: AuthConfig
  readonly logging: LoggingConfig
  readonly features: FeatureFlags
}

type Environment = 'development' | 'staging' | 'production' | 'test'

interface DatabaseConfig {
  readonly provider: DatabaseProvider
  readonly url: string
  readonly maxConnections: number
  readonly connectionTimeout: number
  readonly queryTimeout: number
}

type DatabaseProvider = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'

interface AuthConfig {
  readonly jwtSecret: string
  readonly jwtExpiresIn: string
  readonly refreshTokenExpiresIn: string
  readonly bcryptRounds: number
  readonly sessionTimeout: number
}

interface LoggingConfig {
  readonly level: LogLevel
  readonly format: LogFormat
  readonly outputs: LogOutput[]
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'
type LogFormat = 'json' | 'text' | 'structured'
type LogOutput = 'console' | 'file' | 'database' | 'external'

interface FeatureFlags {
  readonly [key: string]: boolean
}
```

## API Types

### HTTP API Types

Common types for HTTP APIs:

```typescript
import { 
  HttpMethod, 
  HttpStatus, 
  ApiRequest, 
  ApiResponse, 
  ApiError 
} from '@effectify/shared-types'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

type HttpStatus = 
  | 200 | 201 | 202 | 204
  | 400 | 401 | 403 | 404 | 409 | 422 | 429
  | 500 | 502 | 503 | 504

interface ApiRequest<T = unknown> {
  readonly method: HttpMethod
  readonly path: string
  readonly headers: Record<string, string>
  readonly query: Record<string, string>
  readonly params: Record<string, string>
  readonly body: T
  readonly user?: AuthenticatedUser
}

interface ApiResponse<T = unknown> {
  readonly status: HttpStatus
  readonly headers: Record<string, string>
  readonly body: T
}

interface ApiError {
  readonly code: string
  readonly message: string
  readonly details?: Record<string, unknown>
  readonly timestamp: Date
  readonly path: string
  readonly method: HttpMethod
}

interface AuthenticatedUser {
  readonly id: UserId
  readonly email: string
  readonly roles: string[]
  readonly permissions: string[]
}
```

### Pagination Types

Common pagination interfaces:

```typescript
import { PaginatedRequest, PaginatedResponse, PageInfo } from '@effectify/shared-types'

interface PaginatedRequest {
  readonly page: number
  readonly limit: number
  readonly sortBy?: string
  readonly sortOrder?: SortOrder
  readonly filters?: Record<string, unknown>
}

type SortOrder = 'asc' | 'desc'

interface PaginatedResponse<T> {
  readonly data: T[]
  readonly pageInfo: PageInfo
}

interface PageInfo {
  readonly currentPage: number
  readonly totalPages: number
  readonly totalItems: number
  readonly itemsPerPage: number
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
}

// Cursor-based pagination
interface CursorPaginatedRequest {
  readonly first?: number
  readonly after?: string
  readonly last?: number
  readonly before?: string
}

interface CursorPaginatedResponse<T> {
  readonly edges: Edge<T>[]
  readonly pageInfo: CursorPageInfo
}

interface Edge<T> {
  readonly node: T
  readonly cursor: string
}

interface CursorPageInfo {
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
  readonly startCursor?: string
  readonly endCursor?: string
}
```

## Usage Examples

### Type-Safe API Client

```typescript
import { ApiRequest, ApiResponse, Result } from '@effectify/shared-types'

class TypeSafeApiClient {
  async request<TRequest, TResponse>(
    request: ApiRequest<TRequest>
  ): Promise<Result<ApiResponse<TResponse>, ApiError>> {
    try {
      const response = await fetch(request.path, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body)
      })

      const data = await response.json()

      return success({
        status: response.status as HttpStatus,
        headers: Object.fromEntries(response.headers.entries()),
        body: data
      })
    } catch (error) {
      return failure({
        code: 'NETWORK_ERROR',
        message: 'Failed to make request',
        timestamp: new Date(),
        path: request.path,
        method: request.method
      })
    }
  }
}
```

### Domain Entity with Types

```typescript
import { BaseEntity, EntityId, ValueObject } from '@effectify/shared-types'

class User implements BaseEntity<'User'> {
  constructor(
    public readonly id: EntityId<'User'>,
    public readonly email: Email,
    public readonly name: UserName,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly version: number
  ) {}

  updateProfile(name: UserName): User {
    return new User(
      this.id,
      this.email,
      name,
      this.createdAt,
      new Date(),
      this.version + 1
    )
  }
}

class Email implements ValueObject {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format')
    }
  }

  equals(other: ValueObject): boolean {
    return other instanceof Email && other.value === this.value
  }

  toString(): string {
    return this.value
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
```

The `@effectify/shared-types` package provides the foundational types that ensure consistency and type safety across all Effectify packages and applications.
