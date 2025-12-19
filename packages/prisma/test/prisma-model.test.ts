import { layer } from '@effect/vitest'
import { Prisma, PrismaClient, TodoModel } from '@prisma/effect'
import * as PrismaRepository from '@prisma/effect/prisma-repository.js'
import { Effect, Layer, Option } from 'effect'
import { beforeEach, expect } from 'vitest'
import { prisma as db } from './utils.js'

// Create the Prisma layer manually to use the existing client instance
const ClientLayer = Layer.succeed(PrismaClient, { tx: db, client: db })
const PrismaLayer = Layer.merge(ClientLayer, Prisma.Default.pipe(Layer.provide(ClientLayer)))

layer(PrismaLayer)('Prisma Model Repository', (it) => {
  beforeEach(async () => {
    await db.todo.deleteMany({})
  })

  it.effect('create', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      const created = yield* todoRepo.create({
        data: {
          id: 1,
          title: 'Create Test',
          content: 'Content',
          published: false,
          authorId: 1,
        },
      })
      expect(created.id).toBe(1)
      expect(created.title).toBe('Create Test')
    }),
  )

  it.effect('createMany', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      const result = yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'Todo 1', content: 'C1', published: false, authorId: 1 },
          { id: 2, title: 'Todo 2', content: 'C2', published: true, authorId: 1 },
        ],
      })
      expect(result.count).toBe(2)
    }),
  )

  it.effect('createManyAndReturn', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      const result = yield* todoRepo.createManyAndReturn({
        data: [
          { id: 1, title: 'Todo 1', content: 'C1', published: false, authorId: 1 },
          { id: 2, title: 'Todo 2', content: 'C2', published: true, authorId: 1 },
        ],
      })
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Todo 1')
      expect(result[1].title).toBe('Todo 2')
    }),
  )

  it.effect('findUnique', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.create({
        data: { id: 1, title: 'Find Unique', content: 'Content', published: false, authorId: 1 },
      })

      const found = yield* todoRepo.findUnique({
        where: { id: 1 },
      })
      expect(Option.isSome(found)).toBe(true)
      if (Option.isSome(found)) {
        expect(found.value.title).toBe('Find Unique')
      }

      const notFound = yield* todoRepo.findUnique({
        where: { id: 999 },
      })
      expect(Option.isNone(notFound)).toBe(true)
    }),
  )

  it.effect('findUniqueOrThrow', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.create({
        data: { id: 1, title: 'Find Unique Or Throw', content: 'Content', published: false, authorId: 1 },
      })

      const found = yield* todoRepo.findUniqueOrThrow({
        where: { id: 1 },
      })
      expect(found.title).toBe('Find Unique Or Throw')

      const error = yield* todoRepo
        .findUniqueOrThrow({
          where: { id: 999 },
        })
        .pipe(Effect.flip)

      expect(error._tag).toBe('PrismaRecordNotFoundError')
    }),
  )

  it.effect('findFirst', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.create({
        data: { id: 1, title: 'Find First', content: 'Content', published: false, authorId: 1 },
      })

      const found = yield* todoRepo.findFirst({
        where: { title: 'Find First' },
      })
      expect(Option.isSome(found)).toBe(true)
    }),
  )

  it.effect('findFirstOrThrow', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.create({
        data: { id: 1, title: 'Find First Or Throw', content: 'Content', published: false, authorId: 1 },
      })

      const found = yield* todoRepo.findFirstOrThrow({
        where: { title: 'Find First Or Throw' },
      })
      expect(found.title).toBe('Find First Or Throw')

      const error = yield* todoRepo
        .findFirstOrThrow({
          where: { title: 'Non Existent' },
        })
        .pipe(Effect.flip)

      expect(error._tag).toBe('PrismaRecordNotFoundError')
    }),
  )

  it.effect('findMany', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'T1', content: 'C', published: true, authorId: 1 },
          { id: 2, title: 'T2', content: 'C', published: true, authorId: 1 },
          { id: 3, title: 'T3', content: 'C', published: false, authorId: 1 },
        ],
      })

      const found = yield* todoRepo.findMany({
        where: { published: true },
      })
      expect(found).toHaveLength(2)
    }),
  )

  it.effect('update', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.create({
        data: { id: 1, title: 'Original', content: 'Content', published: false, authorId: 1 },
      })

      const updated = yield* todoRepo.update({
        where: { id: 1 },
        data: { title: 'Updated' },
      })
      expect(updated.title).toBe('Updated')
    }),
  )

  it.effect('updateMany', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'T1', content: 'C', published: false, authorId: 1 },
          { id: 2, title: 'T2', content: 'C', published: false, authorId: 1 },
        ],
      })

      const result = yield* todoRepo.updateMany({
        where: { published: false },
        data: { published: true },
      })
      expect(result.count).toBe(2)
    }),
  )

  it.effect('upsert', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      // Create new
      const created = yield* todoRepo.upsert({
        where: { id: 1 },
        create: { id: 1, title: 'Upsert Created', content: 'Content', published: false, authorId: 1 },
        update: { title: 'Upsert Updated' },
      })
      expect(created.title).toBe('Upsert Created')

      // Update existing
      const updated = yield* todoRepo.upsert({
        where: { id: 1 },
        create: { id: 1, title: 'Upsert Created', content: 'Content', published: false, authorId: 1 },
        update: { title: 'Upsert Updated' },
      })
      expect(updated.title).toBe('Upsert Updated')
    }),
  )

  it.effect('delete', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.create({
        data: { id: 1, title: 'To Delete', content: 'Content', published: false, authorId: 1 },
      })

      const deleted = yield* todoRepo.delete({
        where: { id: 1 },
      })
      expect(deleted.title).toBe('To Delete')

      const found = yield* todoRepo.findUnique({
        where: { id: 1 },
      })
      expect(Option.isNone(found)).toBe(true)
    }),
  )

  it.effect('deleteMany', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'T1', content: 'C', published: false, authorId: 1 },
          { id: 2, title: 'T2', content: 'C', published: false, authorId: 1 },
        ],
      })

      const result = yield* todoRepo.deleteMany({
        where: { published: false },
      })
      expect(result.count).toBe(2)
    }),
  )

  it.effect('count', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'T1', content: 'C', published: false, authorId: 1 },
          { id: 2, title: 'T2', content: 'C', published: false, authorId: 1 },
        ],
      })

      const count = yield* todoRepo.count()
      expect(count).toBe(2)

      const filteredCount = yield* todoRepo.count({
        where: { id: 1 },
      })
      expect(filteredCount).toBe(1)
    }),
  )

  it.effect('aggregate', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'T1', content: 'C', published: false, authorId: 1 },
          { id: 2, title: 'T2', content: 'C', published: false, authorId: 1 },
        ],
      })

      const result: any = yield* todoRepo.aggregate({
        _count: true,
        _min: { id: true },
        _max: { id: true },
      })

      expect(result._count).toBe(2)
      expect(result._min.id).toBe(1)
      expect(result._max.id).toBe(2)
    }),
  )

  it.effect('groupBy', () =>
    Effect.gen(function* () {
      const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

      yield* todoRepo.createMany({
        data: [
          { id: 1, title: 'T1', content: 'C', published: true, authorId: 1 },
          { id: 2, title: 'T2', content: 'C', published: true, authorId: 1 },
          { id: 3, title: 'T3', content: 'C', published: false, authorId: 2 },
        ],
      })

      const result: any = yield* todoRepo.groupBy({
        by: ['published', 'authorId'],
        _count: {
          id: true,
        },
      })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Check for the group with published: true, authorId: 1
      const group1 = result.find((g: any) => g.published === true && g.authorId === 1)
      expect(group1).toBeDefined()
      expect(group1._count.id).toBe(2)

      // Check for the group with published: false, authorId: 2
      const group2 = result.find((g: any) => g.published === false && g.authorId === 2)
      expect(group2).toBeDefined()
      expect(group2._count.id).toBe(1)
    }),
  )
})
