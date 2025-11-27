/** biome-ignore-all lint/style/useDefaultSwitchClause: <todo> */
/** biome-ignore-all lint/suspicious/noAssignInExpressions: <explanation> */
/** biome-ignore-all lint/complexity/noBannedTypes: <explanation> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <todo> */

import { PrismaPg } from '@prisma/adapter-pg'
import * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Layer from 'effect/Layer'
import * as Runtime from 'effect/Runtime'

import { Prisma, PrismaClient } from './../../prisma/generated/client.js'

const connectionString = `${process.env.DATABASE_URL}`
export class PrismaClientService extends Context.Tag('PrismaClientService')<
  PrismaClientService,
  {
    tx: Awaited<PrismaClient | Prisma.TransactionClient>
    client: Awaited<PrismaClient>
  }
>() {}

export const LivePrismaLayer = Layer.effect(
  PrismaClientService,
  Effect.sync(() => {
    const adapter = new PrismaPg({ connectionString })
    const prisma = new PrismaClient({ adapter })
    return {
      // The \`tx\` property (transaction) can be shared and overridden,
      // but the \`client\` property must always be a PrismaClient instance.
      tx: prisma,
      client: prisma,
    }
  }),
)

export class PrismaUniqueConstraintError extends Data.TaggedError('PrismaUniqueConstraintError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaForeignKeyConstraintError extends Data.TaggedError('PrismaForeignKeyConstraintError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaRecordNotFoundError extends Data.TaggedError('PrismaRecordNotFoundError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaRelationViolationError extends Data.TaggedError('PrismaRelationViolationError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaRelatedRecordNotFoundError extends Data.TaggedError('PrismaRelatedRecordNotFoundError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaTransactionConflictError extends Data.TaggedError('PrismaTransactionConflictError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaValueTooLongError extends Data.TaggedError('PrismaValueTooLongError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaValueOutOfRangeError extends Data.TaggedError('PrismaValueOutOfRangeError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaDbConstraintError extends Data.TaggedError('PrismaDbConstraintError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaConnectionError extends Data.TaggedError('PrismaConnectionError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaMissingRequiredValueError extends Data.TaggedError('PrismaMissingRequiredValueError')<{
  cause: Prisma.PrismaClientKnownRequestError
  operation: string
  model: string
}> {}

export class PrismaInputValidationError extends Data.TaggedError('PrismaInputValidationError')<{
  cause: Prisma.PrismaClientKnownRequestError
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

export type PrismaUpdateError =
  | PrismaValueTooLongError
  | PrismaUniqueConstraintError
  | PrismaForeignKeyConstraintError
  | PrismaDbConstraintError
  | PrismaInputValidationError
  | PrismaMissingRequiredValueError
  | PrismaRelationViolationError
  | PrismaRelatedRecordNotFoundError
  | PrismaValueOutOfRangeError
  | PrismaConnectionError
  | PrismaRecordNotFoundError
  | PrismaTransactionConflictError

export type PrismaDeleteError =
  | PrismaForeignKeyConstraintError
  | PrismaRelationViolationError
  | PrismaConnectionError
  | PrismaRecordNotFoundError
  | PrismaTransactionConflictError

export type PrismaFindOrThrowError = PrismaConnectionError | PrismaRecordNotFoundError

export type PrismaFindError = PrismaConnectionError

export type PrismaDeleteManyError =
  | PrismaForeignKeyConstraintError
  | PrismaRelationViolationError
  | PrismaConnectionError
  | PrismaTransactionConflictError

export type PrismaUpdateManyError =
  | PrismaValueTooLongError
  | PrismaUniqueConstraintError
  | PrismaForeignKeyConstraintError
  | PrismaDbConstraintError
  | PrismaInputValidationError
  | PrismaMissingRequiredValueError
  | PrismaValueOutOfRangeError
  | PrismaConnectionError
  | PrismaTransactionConflictError

export type PrismaError =
  | PrismaValueTooLongError
  | PrismaUniqueConstraintError
  | PrismaForeignKeyConstraintError
  | PrismaDbConstraintError
  | PrismaInputValidationError
  | PrismaMissingRequiredValueError
  | PrismaRelationViolationError
  | PrismaRelatedRecordNotFoundError
  | PrismaValueOutOfRangeError
  | PrismaConnectionError
  | PrismaRecordNotFoundError
  | PrismaTransactionConflictError

// Generic mapper for raw operations and fallback
const mapError = (error: unknown, operation: string, model: string): PrismaError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
      case 'P2014':
        return new PrismaRelationViolationError({ cause: error, operation, model })
      case 'P2015':
      case 'P2018':
        return new PrismaRelatedRecordNotFoundError({ cause: error, operation, model })
      case 'P2020':
        return new PrismaValueOutOfRangeError({ cause: error, operation, model })
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
      case 'P2025':
        return new PrismaRecordNotFoundError({ cause: error, operation, model })
      case 'P2034':
        return new PrismaTransactionConflictError({ cause: error, operation, model })
    }
  }
  // Unknown errors are not handled and will be treated as defects
  throw error
}

// Specific mappers to narrow error types per operation

// Create, Upsert
const mapCreateError = (error: unknown, operation: string, model: string): PrismaCreateError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

// Update
const mapUpdateError = (error: unknown, operation: string, model: string): PrismaUpdateError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
      case 'P2014':
        return new PrismaRelationViolationError({ cause: error, operation, model })
      case 'P2015':
      case 'P2018':
        return new PrismaRelatedRecordNotFoundError({ cause: error, operation, model })
      case 'P2020':
        return new PrismaValueOutOfRangeError({ cause: error, operation, model })
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
      case 'P2025':
        return new PrismaRecordNotFoundError({ cause: error, operation, model })
      case 'P2034':
        return new PrismaTransactionConflictError({ cause: error, operation, model })
    }
  }
  throw error
}

// Delete
const mapDeleteError = (error: unknown, operation: string, model: string): PrismaDeleteError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2003':
        return new PrismaForeignKeyConstraintError({ cause: error, operation, model })
      case 'P2014':
        return new PrismaRelationViolationError({ cause: error, operation, model })
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
      case 'P2025':
        return new PrismaRecordNotFoundError({ cause: error, operation, model })
      case 'P2034':
        return new PrismaTransactionConflictError({ cause: error, operation, model })
    }
  }
  throw error
}

// FindOrThrow
const mapFindOrThrowError = (error: unknown, operation: string, model: string): PrismaFindOrThrowError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
      case 'P2025':
        return new PrismaRecordNotFoundError({ cause: error, operation, model })
    }
  }
  throw error
}

// Find
const mapFindError = (error: unknown, operation: string, model: string): PrismaFindError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
    }
  }
  throw error
}

// DeleteMany
const mapDeleteManyError = (error: unknown, operation: string, model: string): PrismaDeleteManyError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2003':
        return new PrismaForeignKeyConstraintError({ cause: error, operation, model })
      case 'P2014':
        return new PrismaRelationViolationError({ cause: error, operation, model })
      case 'P2024':
        return new PrismaConnectionError({ cause: error, operation, model })
      case 'P2034':
        return new PrismaTransactionConflictError({ cause: error, operation, model })
    }
  }
  throw error
}

// UpdateMany
const mapUpdateManyError = (error: unknown, operation: string, model: string): PrismaUpdateManyError => {
  if (error && error instanceof Prisma.PrismaClientKnownRequestError) {
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

export class PrismaService extends Effect.Service<PrismaService>()('PrismaService', {
  effect: Effect.gen(function* () {
    return {
      $transaction: <R, E, A>(
        effect: Effect.Effect<A, E, R>,
        options?: {
          maxWait?: number
          timeout?: number
          isolationLevel?: Prisma.TransactionIsolationLevel
        },
      ) =>
        Effect.flatMap(
          Effect.all([PrismaClientService, Effect.runtime<R>()]),
          ([{ client, tx }, runtime]): Effect.Effect<A, E | PrismaError, R> => {
            const isRootClient = '$transaction' in tx
            if (!isRootClient) {
              return effect
            }
            return Effect.tryPromise({
              try: () =>
                // biome-ignore lint/nursery/noShadow: <todo fix>
                client.$transaction(async (tx) => {
                  const exit = await Runtime.runPromiseExit(runtime)(
                    effect.pipe(
                      Effect.provideService(PrismaClientService, {
                        tx,
                        client,
                      }),
                    ) as Effect.Effect<A, E, R>,
                  )
                  if (Exit.isSuccess(exit)) {
                    return exit.value
                  }
                  throw Cause.squash(exit.cause)
                }, options),
              catch: (error) => error as E,
            }) as unknown as Effect.Effect<A, E, R>
          },
        ),
      $executeRaw: (
        args: Prisma.Sql | [Prisma.Sql, ...any[]],
      ): Effect.Effect<number, PrismaError, PrismaClientService> =>
        Effect.flatMap(PrismaClientService, ({ tx: client }) =>
          Effect.tryPromise({
            try: () => (Array.isArray(args) ? client.$executeRaw(args[0], ...args.slice(1)) : client.$executeRaw(args)),
            catch: (error) => mapError(error, '$executeRaw', 'Prisma'),
          }),
        ),

      $executeRawUnsafe: (query: string, ...values: any[]): Effect.Effect<number, PrismaError, PrismaClientService> =>
        Effect.flatMap(PrismaClientService, ({ tx: client }) =>
          Effect.tryPromise({
            try: () => client.$executeRawUnsafe(query, ...values),
            catch: (error) => mapError(error, '$executeRawUnsafe', 'Prisma'),
          }),
        ),

      $queryRaw: <T = unknown>(
        args: Prisma.Sql | [Prisma.Sql, ...any[]],
      ): Effect.Effect<T, PrismaError, PrismaClientService> =>
        Effect.flatMap(PrismaClientService, ({ tx: client }) =>
          Effect.tryPromise({
            try: () =>
              (Array.isArray(args)
                ? client.$queryRaw(args[0], ...args.slice(1))
                : client.$queryRaw(args)) as Promise<T>,
            catch: (error) => mapError(error, '$queryRaw', 'Prisma'),
          }),
        ),

      $queryRawUnsafe: <T = unknown>(
        query: string,
        ...values: any[]
      ): Effect.Effect<T, PrismaError, PrismaClientService> =>
        Effect.flatMap(PrismaClientService, ({ tx: client }) =>
          Effect.tryPromise({
            try: () => client.$queryRawUnsafe(query, ...values) as Promise<T>,
            catch: (error) => mapError(error, '$queryRawUnsafe', 'Prisma'),
          }),
        ),
      Todo: {
        findUnique: <A extends Prisma.Args<PrismaClient['todo'], 'findUnique'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'findUnique'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'findUnique'>, PrismaFindError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.findUnique(args as any) as Promise<Prisma.Result<
                  PrismaClient['todo'],
                  A,
                  'findUnique'
                > | null>,
              catch: (error) => mapFindError(error, 'findUnique', 'todo'),
            }),
          ),

        findUniqueOrThrow: <A extends Prisma.Args<PrismaClient['todo'], 'findUniqueOrThrow'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'findUniqueOrThrow'>>,
        ): Effect.Effect<
          Prisma.Result<PrismaClient['todo'], A, 'findUniqueOrThrow'>,
          PrismaFindOrThrowError,
          PrismaClientService
        > =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.findUniqueOrThrow(args as any) as Promise<
                  Prisma.Result<PrismaClient['todo'], A, 'findUniqueOrThrow'>
                >,
              catch: (error) => mapFindOrThrowError(error, 'findUniqueOrThrow', 'todo'),
            }),
          ),

        findMany: <A extends Prisma.Args<PrismaClient['todo'], 'findMany'> = {}>(
          args?: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'findMany'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'findMany'>, PrismaFindError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.findMany(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'findMany'>>,
              catch: (error) => mapFindError(error, 'findMany', 'todo'),
            }),
          ),

        findFirst: <A extends Prisma.Args<PrismaClient['todo'], 'findFirst'> = {}>(
          args?: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'findFirst'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'findFirst'>, PrismaFindError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.findFirst(args as any) as Promise<Prisma.Result<
                  PrismaClient['todo'],
                  A,
                  'findFirst'
                > | null>,
              catch: (error) => mapFindError(error, 'findFirst', 'todo'),
            }),
          ),

        findFirstOrThrow: <A extends Prisma.Args<PrismaClient['todo'], 'findFirstOrThrow'> = {}>(
          args?: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'findFirstOrThrow'>>,
        ): Effect.Effect<
          Prisma.Result<PrismaClient['todo'], A, 'findFirstOrThrow'>,
          PrismaFindOrThrowError,
          PrismaClientService
        > =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.findFirstOrThrow(args as any) as Promise<
                  Prisma.Result<PrismaClient['todo'], A, 'findFirstOrThrow'>
                >,
              catch: (error) => mapFindOrThrowError(error, 'findFirstOrThrow', 'todo'),
            }),
          ),

        create: <A extends Prisma.Args<PrismaClient['todo'], 'create'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'create'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'create'>, PrismaCreateError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.create(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'create'>>,
              catch: (error) => mapCreateError(error, 'create', 'todo'),
            }),
          ),

        createManyAndReturn: <A extends Prisma.Args<PrismaClient['todo'], 'createManyAndReturn'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'createManyAndReturn'>>,
        ): Effect.Effect<
          Prisma.Result<PrismaClient['todo'], A, 'createManyAndReturn'>,
          PrismaCreateError,
          PrismaClientService
        > =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.createManyAndReturn(args as any) as Promise<
                  Prisma.Result<PrismaClient['todo'], A, 'createManyAndReturn'>
                >,
              catch: (error) => mapCreateError(error, 'createManyAndReturn', 'todo'),
            }),
          ),

        delete: <A extends Prisma.Args<PrismaClient['todo'], 'delete'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'delete'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'delete'>, PrismaDeleteError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.delete(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'delete'>>,
              catch: (error) => mapDeleteError(error, 'delete', 'todo'),
            }),
          ),

        update: <A extends Prisma.Args<PrismaClient['todo'], 'update'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'update'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'update'>, PrismaUpdateError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.update(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'update'>>,
              catch: (error) => mapUpdateError(error, 'update', 'todo'),
            }),
          ),

        deleteMany: <A extends Prisma.Args<PrismaClient['todo'], 'deleteMany'> = {}>(
          args?: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'deleteMany'>>,
        ): Effect.Effect<Prisma.BatchPayload, PrismaDeleteManyError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.deleteMany(args as any),
              catch: (error) => mapDeleteManyError(error, 'deleteMany', 'todo'),
            }),
          ),

        updateMany: <A extends Prisma.Args<PrismaClient['todo'], 'updateMany'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'updateMany'>>,
        ): Effect.Effect<Prisma.BatchPayload, PrismaUpdateManyError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.updateMany(args as any),
              catch: (error) => mapUpdateManyError(error, 'updateMany', 'todo'),
            }),
          ),

        updateManyAndReturn: <A extends Prisma.Args<PrismaClient['todo'], 'updateManyAndReturn'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'updateManyAndReturn'>>,
        ): Effect.Effect<
          Prisma.Result<PrismaClient['todo'], A, 'updateManyAndReturn'>,
          PrismaUpdateManyError,
          PrismaClientService
        > =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.updateManyAndReturn(args as any) as Promise<
                  Prisma.Result<PrismaClient['todo'], A, 'updateManyAndReturn'>
                >,
              catch: (error) => mapUpdateManyError(error, 'updateManyAndReturn', 'todo'),
            }),
          ),

        upsert: <A extends Prisma.Args<PrismaClient['todo'], 'upsert'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'upsert'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'upsert'>, PrismaCreateError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.upsert(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'upsert'>>,
              catch: (error) => mapCreateError(error, 'upsert', 'todo'),
            }),
          ),

        count: <A extends Prisma.Args<PrismaClient['todo'], 'count'> = {}>(
          args?: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'count'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'count'>, PrismaFindError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () => client.todo.count(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'count'>>,
              catch: (error) => mapFindError(error, 'count', 'todo'),
            }),
          ),

        aggregate: <A extends Prisma.Args<PrismaClient['todo'], 'aggregate'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'aggregate'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'aggregate'>, PrismaFindError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.aggregate(args as any) as unknown as Promise<
                  Prisma.Result<PrismaClient['todo'], A, 'aggregate'>
                >,
              catch: (error) => mapFindError(error, 'aggregate', 'todo'),
            }),
          ),

        groupBy: <A extends Prisma.Args<PrismaClient['todo'], 'groupBy'>>(
          args: Prisma.Exact<A, Prisma.Args<PrismaClient['todo'], 'groupBy'>>,
        ): Effect.Effect<Prisma.Result<PrismaClient['todo'], A, 'groupBy'>[], PrismaFindError, PrismaClientService> =>
          Effect.flatMap(PrismaClientService, ({ tx: client }) =>
            Effect.tryPromise({
              try: () =>
                client.todo.groupBy(args as any) as Promise<Prisma.Result<PrismaClient['todo'], A, 'groupBy'>[]>,
              catch: (error) => mapFindError(error, 'groupBy', 'todo'),
            }),
          ),
      },
    }
  }),
}) {}
