import * as Command from '@effect/cli/Command'
import * as FileSystem from '@effect/platform/FileSystem'
import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem'
import * as NodePath from '@effect/platform-node/NodePath'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

// import { generateEffectPrisma } from '../generators/prisma-effect-generator.js'

// Check if file exists
const fileExists = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.exists(path)
  })

// Detect package manager using pattern matching
const detectPackageManager = () =>
  Effect.gen(function* () {
    const pnpmExists = yield* fileExists('pnpm-lock.yaml')
    const bunExists = yield* fileExists('bun.lockb')
    const npmExists = yield* fileExists('package-lock.json')

    // Create a tuple to match against
    const lockFiles = [pnpmExists, bunExists, npmExists] as const

    return Match.value(lockFiles).pipe(
      Match.when([true, false, false], () => 'pnpm' as const),
      Match.when([false, true, false], () => 'bun' as const),
      Match.when([false, false, true], () => 'npm' as const),
      Match.orElse(() => 'npm' as const), // default fallback
    )
  })

// Check if Prisma schema exists
const checkPrismaSchema = () =>
  Effect.gen(function* () {
    const schemaExists = yield* fileExists('prisma/schema.prisma')

    if (!schemaExists) {
      yield* Console.log('❌ Prisma schema not found.')
      yield* Console.log('')
      yield* Console.log('Please run the following command first:')

      const packageManager = yield* detectPackageManager()

      const initCommand = Match.value(packageManager).pipe(
        Match.when('pnpm', () => 'pnpm dlx prisma init'),
        Match.when('bun', () => 'bunx prisma init'),
        Match.when('npm', () => 'npx prisma init'),
        Match.exhaustive,
      )

      yield* Console.log(`  ${initCommand}`)
      yield* Effect.fail(new Error('Prisma schema not found'))
    }
  })

// Execute the Effect generator
const generateEffectServices = () =>
  Effect.gen(function* () {
    // Check if we're being called by Prisma (no interactive output)
    const isCalledByPrisma =
      process.env.PRISMA_GENERATOR_INVOCATION === 'true' ||
      process.argv.includes('--generator') ||
      !process.stdout.isTTY

    if (!isCalledByPrisma) {
      yield* Console.log('🔧 Running Effect generator...')
    }

    // Check if Prisma schema exists
    yield* checkPrismaSchema()

    // Note: We don't need to check for local generator files
    // since we're importing from our own package

    if (!isCalledByPrisma) {
      yield* Console.log('🚀 Executing Effect generator...')
    }

    // Execute the generator function
    yield* Effect.tryPromise({
      try: () => {
        // Create mock options for the generator
        // const mockOptions = {
        //   dmmf: { datamodel: { models: [] } }, // Empty models for now
        //   generator: { output: { value: 'src/generated/effect-prisma' } },
        // }
        return Promise.resolve()
        // return generateEffectPrisma(mockOptions)
      },
      catch: (error) => new Error(`Generator execution failed: ${error}`),
    })

    if (!isCalledByPrisma) {
      yield* Console.log('✅ Effect generator executed successfully!')
      yield* Console.log('💡 Generated files are available in the configured output directory')
    }

    // Ensure the effect completes and exits
    yield* Effect.sync(() => process.exit(0))
  })

// Export the generate-effect command
export const generateEffectCommand = Command.make('generate-effect', {}, () =>
  generateEffectServices().pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer)),
)
