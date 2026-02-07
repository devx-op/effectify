---
title: "@effectify/shared-types"
description: Tipos e interfaces comunes de TypeScript compartidos por todos los paquetes
---

# @effectify/shared-types

El paquete `@effectify/shared-types` proporciona tipos, interfaces y utilidades comunes de TypeScript compartidos por todos los paquetes de Effectify. Asegura consistencia de tipos y proporciona fundamentos para construir aplicaciones seguras por tipos.

## Instalación

```bash
npm install @effectify/shared-types
```

## Tipos principales

### Tipos con marca

```typescript
import { Brand } from "@effectify/shared-types"

export type UserId = Brand<string, "UserId">
export type Email = Brand<string, "Email">
export type Timestamp = Brand<number, "Timestamp">
```

### Tipos Result

```typescript
import { Failure, Result, Success } from "@effectify/shared-types"

type Result<T, E = Error> = Success<T> | Failure<E>

interface Success<T> {
  readonly _tag: "Success"
  readonly value: T
}
interface Failure<E> {
  readonly _tag: "Failure"
  readonly error: E
}

export const success = <T>(value: T): Success<T> => ({ _tag: "Success", value })
export const failure = <E>(error: E): Failure<E> => ({ _tag: "Failure", error })
```

### Tipos Option

```typescript
import { None, Option, Some } from "@effectify/shared-types"

type Option<T> = Some<T> | None
interface Some<T> {
  readonly _tag: "Some"
  readonly value: T
}
interface None {
  readonly _tag: "None"
}

export const some = <T>(value: T): Some<T> => ({ _tag: "Some", value })
export const none: None = { _tag: "None" }
export const fromNullable = <T>(value: T | null | undefined): Option<T> => value != null ? some(value) : none
```

## Tipos de entidad

### Entidad base

```typescript
import { BaseEntity, EntityId } from "@effectify/shared-types"

interface BaseEntity<T extends string = string> {
  readonly id: EntityId<T>
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly version: number
}

type EntityId<T extends string> = Brand<string, `EntityId<${T}>`>
```

## Tipos de Aggregate Root

```typescript
import { AggregateRoot, DomainEvent } from "@effectify/shared-types"

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
```

## Tipos de Value Object

```typescript
import { ValueObject } from "@effectify/shared-types"

interface ValueObject {
  readonly equals: (other: ValueObject) => boolean
  readonly toString: () => string
}
```
