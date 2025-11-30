/** biome-ignore-all lint/suspicious/noExplicitAny: <todo> */
/** biome-ignore-all lint/style/useDefaultSwitchClause: <todo> */

import * as VariantSchema from '@effect/experimental/VariantSchema'
import { type PrismaClient as BasePrismaClient, Prisma as PrismaNamespace } from '@prisma/client.js'
import { PrismaClient } from '@prisma/effect/index.js'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import type * as Schema from 'effect/Schema'
import * as SqlSchema from './prisma-schema.js'

export class PrismaUniqueConstraintError extends Data.TaggedError('PrismaUniqueConstraintError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaForeignKeyConstraintError extends Data.TaggedError('PrismaForeignKeyConstraintError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaRecordNotFoundError extends Data.TaggedError('PrismaRecordNotFoundError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaRelationViolationError extends Data.TaggedError('PrismaRelationViolationError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaRelatedRecordNotFoundError extends Data.TaggedError('PrismaRelatedRecordNotFoundError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaTransactionConflictError extends Data.TaggedError('PrismaTransactionConflictError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaValueTooLongError extends Data.TaggedError('PrismaValueTooLongError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaValueOutOfRangeError extends Data.TaggedError('PrismaValueOutOfRangeError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaDbConstraintError extends Data.TaggedError('PrismaDbConstraintError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaConnectionError extends Data.TaggedError('PrismaConnectionError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaMissingRequiredValueError extends Data.TaggedError('PrismaMissingRequiredValueError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaInputValidationError extends Data.TaggedError('PrismaInputValidationError')<{
  cause: PrismaNamespace.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export type PrismaCreateError =
  | PrismaValueTooLongError
  | PrismaUniqueConstraintError
  | PrismaForeignKeyConstraintError
  | PrismaDbConstraintError
  | PrismaInputValidationError
  | PrismaMissingRequiredValueError
  | PrismaRelatedRecordNotFoundError
  | PrismaValueOutOfRangeError
  | PrismaConnectionError
  | PrismaTransactionConflictError

// Create, Upsert
export const mapCreateError = (error: unknown, operation: string, model: string): PrismaCreateError => {
  if (error instanceof PrismaNamespace.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2000':
        return new PrismaValueTooLongError({ cause: error, operation, model })
      case 'P2002':
        return new PrismaUniqueConstraintError({ cause: error, operation, model })
      case 'P2003':
        return new PrismaForeignKeyConstraintError({ cause: error, operation, model })
      case 'P2004':
        return new PrismaDbConstraintError({ cause: error, operation, model })
      case 'P2005':
      case 'P2006':
      case 'P2019':
        return new PrismaInputValidationError({ cause: error, operation, model })
      case 'P2011':
      case 'P2012':
        return new PrismaMissingRequiredValueError({ cause: error, operation, model })
      case 'P2015':
      case 'P2018':
        return new PrismaRelatedRecordNotFoundError({ cause: error, operation, model })
      case 'P2020':
        return new PrismaValueOutOfRangeError({ cause: error, operation, model })
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
      case 'P2034':
        return new PrismaTransactionConflictError({ cause: error, operation, model })
    }
  }
  throw error
}

const { Class, Field, FieldExcept, FieldOnly, Struct, Union, extract, fieldEvolve, fieldFromKey } = VariantSchema.make({
  variants: ['select', 'insert', 'update', 'json', 'jsonCreate', 'jsonUpdate'],
  defaultVariant: 'select',
})

/**
 * @since 1.0.0
 * @category models
 */
export type Any = Schema.Schema.Any & {
  readonly fields: Schema.Struct.Fields
  readonly insert: Schema.Schema.Any
  readonly update: Schema.Schema.Any
  readonly json: Schema.Schema.Any
  readonly jsonCreate: Schema.Schema.Any
  readonly jsonUpdate: Schema.Schema.Any
}

/**
 * @since 1.0.0
 * @category models
 */
export type AnyNoContext = Schema.Schema.AnyNoContext & {
  readonly fields: Schema.Struct.Fields
  readonly insert: Schema.Schema.AnyNoContext
  readonly update: Schema.Schema.AnyNoContext
  readonly json: Schema.Schema.AnyNoContext
  readonly jsonCreate: Schema.Schema.AnyNoContext
  readonly jsonUpdate: Schema.Schema.AnyNoContext
}

/**
 * @since 1.0.0
 * @category models
 */
export type VariantsDatabase = 'select' | 'insert' | 'update'

/**
 * @since 1.0.0
 * @category models
 */
export type VariantsJson = 'json' | 'jsonCreate' | 'jsonUpdate'

export {
  /**
   * A base class used for creating domain model schemas.
   *
   * It supports common variants for database and JSON apis.
   *
   * @since 1.0.0
   * @category constructors
   * @example
   * ```ts
   * import { Schema } from "effect"
   * import { Model } from "@effect/sql"
   *
   * export const GroupId = Schema.Number.pipe(Schema.brand("GroupId"))
   *
   * export class Group extends Model.Class<Group>("Group")({
   *   id: Model.Generated(GroupId),
   *   name: Schema.NonEmptyTrimmedString,
   *   createdAt: Model.DateTimeInsertFromDate,
   *   updatedAt: Model.DateTimeUpdateFromDate
   * }) {}
   *
   * // schema used for selects
   * Group
   *
   * // schema used for inserts
   * Group.insert
   *
   * // schema used for updates
   * Group.update
   *
   * // schema used for json api
   * Group.json
   * Group.jsonCreate
   * Group.jsonUpdate
   *
   * // you can also turn them into classes
   * class GroupJson extends Schema.Class<GroupJson>("GroupJson")(Group.json) {
   *   get upperName() {
   *     return this.name.toUpperCase()
   *   }
   * }
   * ```
   */
  Class,
  /**
   * @since 1.0.0
   * @category extraction
   */
  extract,
  /**
   * @since 1.0.0
   * @category fields
   */
  Field,
  /**
   * @since 1.0.0
   * @category fields
   */
  fieldEvolve,
  /**
   * @since 1.0.0
   * @category fields
   */
  FieldExcept,
  /**
   * @since 1.0.0
   * @category fields
   */
  fieldFromKey,
  /**
   * @since 1.0.0
   * @category fields
   */
  FieldOnly,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Struct,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Union,
}

/**
 * Create a simple CRUD repository from a model.
 *
 * @since 1.0.0
 * @category repository
 */
export const makeRepo = <S extends Any, M extends keyof BasePrismaClient>(
  Model: S,
  options: {
    readonly modelName: M
    readonly spanPrefix: string
  },
): Effect.Effect<
  {
    readonly create: <A extends PrismaNamespace.Args<BasePrismaClient[M], 'create'>>(
      args: PrismaNamespace.Exact<A, PrismaNamespace.Args<BasePrismaClient[M], 'create'>>,
    ) => Effect.Effect<S['Type'], never, S['Context'] | S['insert']['Context']>
    /* readonly insertVoid: (
      insert: S['insert']['Type'],
    ) => Effect.Effect<void, never, S['Context'] | S['insert']['Context']>
    readonly update: (
      update: S['update']['Type'],
    ) => Effect.Effect<S['Type'], never, S['Context'] | S['update']['Context']>
    readonly updateVoid: (
      update: S['update']['Type'],
    ) => Effect.Effect<void, never, S['Context'] | S['update']['Context']>
    readonly findById: (
      id: Schema.Schema.Type<S['fields'][Id]>,
    ) => Effect.Effect<Option.Option<S['Type']>, never, S['Context'] | Schema.Schema.Context<S['fields'][Id]>>
    readonly delete: (
      id: Schema.Schema.Type<S['fields'][Id]>,
    ) => Effect.Effect<void, never, Schema.Schema.Context<S['fields'][Id]>>*/
  },
  never,
  PrismaClient
> =>
  Effect.gen(function* () {
    const prisma = yield* PrismaClient

    const createSchema = SqlSchema.single({
      Request: Model.insert,
      Result: Model,
      execute: (request) =>
        Effect.tryPromise({
          try: () => prisma.tx.todo.create({ data: request }),
          catch: (error) => mapCreateError(error, 'create', 'Todo'),
        }).pipe(Effect.map((result) => [result] as any)),
    })

    const create = <A extends PrismaNamespace.Args<BasePrismaClient[M], 'create'>>(
      args: PrismaNamespace.Exact<A, PrismaNamespace.Args<BasePrismaClient[M], 'create'>>,
    ): Effect.Effect<S['Type'], never, S['Context'] | S['insert']['Context']> =>
      createSchema((args as any).data).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.insert`, {
          captureStackTrace: false,
          attributes: { ...(args as any).data },
        }),
      ) as any
    /*
    const insertVoidSchema = SqlSchema.void({
      Request: Model.insert,
      execute: (request) => sql`insert into ${sql(options.tableName)} ${sql.insert(request)}`,
    })
    const insertVoid = (
      insert: S['insert']['Type'],
    ): Effect.Effect<void, never, S['Context'] | S['insert']['Context']> =>
      insertVoidSchema(insert).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.insertVoid`, {
          captureStackTrace: false,
          attributes: { insert },
        }),
      ) as any

    const updateSchema = SqlSchema.single({
      Request: Model.update,
      Result: Model,
      execute: (request) =>
        sql.onDialectOrElse({
          mysql: () =>
            sql`update ${sql(options.tableName)} set ${sql.update(request, [idColumn])} where ${sql(idColumn)} = ${
              request[idColumn]
            };
select * from ${sql(options.tableName)} where ${sql(idColumn)} = ${request[idColumn]};`.unprepared.pipe(
              Effect.map(([, results]) => results as any),
            ),
          orElse: () =>
            sql`update ${sql(options.tableName)} set ${sql.update(request, [idColumn])} where ${sql(idColumn)} = ${
              request[idColumn]
            } returning *`,
        }),
    })
    const update = (
      update: S['update']['Type'],
    ): Effect.Effect<S['Type'], never, S['Context'] | S['update']['Context']> =>
      updateSchema(update).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.update`, {
          captureStackTrace: false,
          attributes: { update },
        }),
      ) as any

    const updateVoidSchema = SqlSchema.void({
      Request: Model.update,
      execute: (request) =>
        sql`update ${sql(options.tableName)} set ${sql.update(request, [idColumn])} where ${sql(idColumn)} = ${
          request[idColumn]
        }`,
    })
    const updateVoid = (
      update: S['update']['Type'],
    ): Effect.Effect<void, never, S['Context'] | S['update']['Context']> =>
      updateVoidSchema(update).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.updateVoid`, {
          captureStackTrace: false,
          attributes: { update },
        }),
      ) as any

    const findByIdSchema = SqlSchema.findOne({
      Request: idSchema,
      Result: Model,
      execute: (id) => sql`select * from ${sql(options.tableName)} where ${sql(idColumn)} = ${id}`,
    })
    const findById = (
      id: Schema.Schema.Type<S['fields'][Id]>,
    ): Effect.Effect<Option.Option<S['Type']>, never, S['Context'] | Schema.Schema.Context<S['fields'][Id]>> =>
      findByIdSchema(id).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.findById`, {
          captureStackTrace: false,
          attributes: { id },
        }),
      ) as any

    const deleteSchema = SqlSchema.void({
      Request: idSchema,
      execute: (id) => sql`delete from ${sql(options.tableName)} where ${sql(idColumn)} = ${id}`,
    })
    const delete_ = (
      id: Schema.Schema.Type<S['fields'][Id]>,
    ): Effect.Effect<void, never, Schema.Schema.Context<S['fields'][Id]>> =>
      deleteSchema(id).pipe(
        Effect.orDie,
        Effect.withSpan(`${options.spanPrefix}.delete`, {
          captureStackTrace: false,
          attributes: { id },
        }),
      ) as any*/

    return {
      create,
      //      insertVoid, update, updateVoid, findById, delete: delete_
    } as const
  })
