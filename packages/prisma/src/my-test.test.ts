import { expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { PrismaService } from './generated/effect-prisma/index.js'
import type { Todo, User } from './generated/prisma/index.js'
import { TestPrismaLayer } from './services/prisma.service.js'

const createTodo = (input: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    return yield* prisma.todo.create({
      data: input,
    })
  })

const getAllTodosForUser = (user: Pick<User, 'id'>) =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    return yield* prisma.todo.findMany({
      where: {
        userId: user.id,
      },
    })
  })

const createTodoTestEffect = Effect.gen(function* () {
  const prisma = yield* PrismaService
  const user = yield* prisma.user.create({
    data: {
      email: 'jon@jon.com',
    },
  })

  const _created = yield* createTodo({
    title: 'Test Todo',
    completed: false,
    description: 'My description',
    userId: user.id,
  })
  const allTodos = yield* getAllTodosForUser(user)

  expect(allTodos).toHaveLength(1)
})
  .pipe(Effect.provide(PrismaService.Default))
  .pipe(Effect.provide(TestPrismaLayer))

it.scoped('Should create a todo', () => createTodoTestEffect)
