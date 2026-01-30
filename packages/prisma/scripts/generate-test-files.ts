import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

// Configuration
const testFileCount = Number.parseInt(process.argv[2], 10) || 5
const testsPerFileCount = Number.parseInt(process.argv[3], 10) || 3

const generateTestFile = (fileIndex: number, testsCount: number): string => {
  const testCases = Array.from({ length: testsCount }, (_, testIndex) => {
    const testName = `should handle test case ${testIndex + 1}`
    const todoTitle = `Generated Todo ${fileIndex}-${testIndex + 1}`
    const todoDescription = `Description for test ${fileIndex}-${testIndex + 1}`

    return `
const test${testIndex + 1}Effect = Effect.gen(function* () {
  const prisma = yield* PrismaService
  const user = yield* prisma.user.create({
    data: {
      email: "user${fileIndex}-${testIndex + 1}@test.com"
    }
  })

  const created = yield* createTodo({
    title: "${todoTitle}",
    completed: ${Math.random() > 0.5},
    description: "${todoDescription}",
    userId: user.id
  })

  const allTodos = yield* getAllTodosForUser(user)
  
  expect(allTodos).toHaveLength(1)
  expect(allTodos[0]?.title).toBe("${todoTitle}")
  expect(allTodos[0]?.userId).toBe(user.id)
}).pipe(Effect.provide(PrismaService.Default)).pipe(Effect.provide(TestPrismaLayer))

it.scoped("${testName}", () => test${testIndex + 1}Effect)`
  }).join("\n\n")

  return `import { expect, it } from "@effect/vitest"
import { Effect } from "effect"
import type { Todo, User } from "../../generated/prisma/index.js"
import { PrismaService } from "../../generated/effect-prisma/index.js"
import { TestPrismaLayer } from "../../services/prisma.service.js"

const createTodo = (input: Omit<Todo, "id" | "createdAt" | "updatedAt">) =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    return yield* prisma.todo.create({
      data: input
    })
  })

const getAllTodosForUser = (user: Pick<User, "id">) =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    return yield* prisma.todo.findMany({
      where: {
        userId: user.id
      }
    })
  })

${testCases}
`
}

async function generateTestFiles() {
  const testsDir = resolve("src/generated/tests")

  // Create the tests directory if it doesn't exist
  if (!existsSync(testsDir)) {
    await mkdir(testsDir, { recursive: true })
  }

  // Generate test files
  const filePromises: Promise<void>[] = []
  for (let i = 1; i <= testFileCount; i++) {
    const fileName = `stress-test-${i.toString().padStart(3, "0")}.test.ts`
    const filePath = resolve(testsDir, fileName)
    const fileContent = generateTestFile(i, testsPerFileCount)

    filePromises.push(writeFile(filePath, fileContent, "utf-8"))
  }

  await Promise.all(filePromises)
}

generateTestFiles().catch((error) => {
  console.error("Failed to generate test files:", error)
  process.exit(1)
})
