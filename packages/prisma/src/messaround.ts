import { Effect } from 'effect'
import { PrismaService } from './generated/effect-prisma/index.js'
import { TestPrismaLayer } from './services/prisma.service.js'

const program = Effect.gen(function* () {
  const prisma = yield* PrismaService
  const todos = yield* prisma.todo.findMany().pipe(
    Effect.catchAll((error) => {
      console.error('Error finding todos:', error)
      return Effect.succeed([])
    }),
  )
  const newTodo = yield* prisma.todo
    .create({
      data: {
        title: 'Test Todo',
        description: 'This is a test todo',
      },
    })
    .pipe(
      Effect.catchAll((error) => {
        console.error('Error creating todo:', error)
        return Effect.fail(error)
      }),
    )

  return { todos, newTodo }
})
  .pipe(Effect.provide(PrismaService.Default))
  .pipe(Effect.provide(TestPrismaLayer))

Effect.runPromise(program)
  .then((_result) => {
    // Program completed successfully
  })
  .catch((error) => {
    console.error('Program failed:', error)
  })
