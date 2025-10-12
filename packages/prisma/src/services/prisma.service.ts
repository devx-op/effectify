import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import { Effect, Layer } from 'effect'
import { acquireRelease } from 'effect/Effect'
import { PrismaClientService } from '../generated/effect-prisma/index.js'
import { PrismaClient } from '../generated/prisma/index.js'

const getTestDBPath = (id: number) => resolve(`src/generated/tests-dbs/${id}.db`)
const convertPathToPrismaURL = (path: string) => `file:${path}`

const createMigratedDB = (at: string) => {
  return Effect.gen(function* () {
    const execAsync = promisify(exec)

    // console.log(`Creating database at: ${at}`)

    // Create directory if it doesn't exist
    yield* Effect.tryPromise(async () => {
      const dir = dirname(at)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }
    })

    // Delete db if it exists
    if (existsSync(at)) {
      yield* Effect.tryPromise(() => import('node:fs/promises').then((fs) => fs.unlink(at)))
      // console.log(`Deleted existing database: ${at}`)
    }

    // Create empty database file
    yield* Effect.tryPromise(async () => {
      await writeFile(at, '', {
        encoding: 'binary',
        mode: 0o644,
      })
    })

    // Run migrations to set up the schema
    // console.log(`Running migrations on: ${at}`)
    yield* Effect.tryPromise(async () => {
      const schemaPath = resolve('src/generated/schema.sql')
      const { stderr, stdout } = await execAsync(`sqlite3 "${at}" < "${schemaPath}"`)
      if (stderr) {
        // console.error("Migration stderr:", stderr)
      }
      // console.log("Migration completed successfully")
      return stdout
    })

    return at
  })
}
export const TestPrismaLayer = Layer.scoped(
  PrismaClientService,
  Effect.gen(function* () {
    // Generate a random number for unique database per test
    const randomNumber = Math.floor(Math.random() * 1_000_000)
    const path = getTestDBPath(randomNumber)

    // console.log(`Creating test database: ${path}`)

    const prismaClient = yield* acquireRelease(
      Effect.gen(function* () {
        // Create the migrated database first
        yield* createMigratedDB(path)

        // Then create the Prisma client with the correct URL
        const prismaUrl = convertPathToPrismaURL(path)
        // console.log(`Connecting to database with URL: ${prismaUrl}`)
        // console.log(`Database file exists: ${existsSync(path)}`)

        const testPrismaClient = new PrismaClient({
          datasourceUrl: prismaUrl,
        })

        // console.log(`Prisma client created with database: ${path}`)
        return testPrismaClient
      }),
      (prisma) =>
        Effect.gen(function* () {
          // console.log("Disconnecting Prisma client...")
          yield* Effect.sync(() => prisma.$disconnect())

          // console.log(`Cleaning up test database: ${path}`)
          yield* Effect.tryPromise(() => unlink(path)).pipe(
            Effect.catchAll((_error) => {
              return Effect.succeed(undefined)
            }),
          )

          // console.log("Test database cleanup completed")
        }),
    )

    return {
      client: prismaClient,
      tx: prismaClient,
    }
  }),
)
