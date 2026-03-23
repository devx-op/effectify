import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import * as FileSystem from "effect/FileSystem"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Match from "effect/Match"

// Flag for the init command
const outputOption = Flag.string("output").pipe(
  Flag.withAlias("o"),
  Flag.withDescription("Output directory path for generated files"),
  Flag.withDefault("src"),
)

// Check if file exists
const fileExists = (path: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.exists(path)
  })

// Read file content
const readFileContent = (path: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const content = yield* fs.readFileString(path)
    return content
  })

// Write file content
const writeFileContent = (path: string, content: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    yield* fs.writeFileString(path, content)
  })

// Detect package manager using pattern matching
const detectPackageManager = () =>
  Effect.gen(function*() {
    const pnpmExists = yield* fileExists("pnpm-lock.yaml")
    const bunExists = yield* fileExists("bun.lockb")
    const npmExists = yield* fileExists("package-lock.json")

    // Create a tuple to match against
    const lockFiles = [pnpmExists, bunExists, npmExists] as const

    return Match.value(lockFiles).pipe(
      Match.when([true, false, false], () => "pnpm" as const),
      Match.when([false, true, false], () => "bun" as const),
      Match.when([false, false, true], () => "npm" as const),
      Match.orElse(() => "npm" as const), // default fallback
    )
  })

// Check if Prisma is already initialized
const checkPrismaSetup = () =>
  Effect.gen(function*() {
    const schemaExists = yield* fileExists("prisma/schema.prisma")

    if (!schemaExists) {
      const packageManager = yield* detectPackageManager()

      yield* Console.log("❌ Prisma is not initialized in this project.")
      yield* Console.log("")
      yield* Console.log("Please run the following command first:")

      const initCommand = Match.value(packageManager).pipe(
        Match.when("pnpm", () => "pnpm dlx prisma init"),
        Match.when("bun", () => "bunx prisma init"),
        Match.when("npm", () => "npx prisma init"),
        Match.exhaustive,
      )

      yield* Console.log(`  ${initCommand}`)

      yield* Console.log("")
      yield* Console.log("For more information, visit:")
      yield* Console.log(
        "  https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-prismaPostgres",
      )
      yield* Effect.fail(new Error("Prisma not initialized"))
    }
  })

// Initialize Prisma schema logic
const initializePrismaSchema = (options: { output: string }) =>
  Effect.gen(function*() {
    yield* Console.log("🔧 Configuring Prisma schema with Effect generators...")
    yield* Console.log(`📁 Output path: ${options.output}`)

    // Check if Prisma is already set up
    yield* checkPrismaSetup()

    const schemaPath = "prisma/schema.prisma"

    yield* Console.log("📄 Schema file already exists.")

    // Read existing content and check if it has our generators
    const existingContent = yield* readFileContent(schemaPath)

    if (existingContent.includes('provider = "effect-prisma"')) {
      yield* Console.log("✅ Effect generators already configured!")
      return
    }

    // Add our generators to existing schema
    yield* Console.log("🔧 Adding Effect generators to existing schema...")

    const updatedContent = existingContent +
      `

// Effect generators added by @effectify/prisma
generator effect {
  provider = "effect-prisma"
  output   = "../${options.output}/generated/effect"
}
`

    yield* writeFileContent(schemaPath, updatedContent)
    yield* Console.log("✅ Effect generators added to existing schema!")

    yield* Console.log("🎉 Prisma schema initialization completed!")
    yield* Console.log("💡 Next steps:")
    yield* Console.log("   1. Set your DATABASE_URL environment variable")
    yield* Console.log("   2. Run: npx prisma generate")

    yield* Effect.sync(() => process.exit(0))
  })

export const initCommand = Command.make(
  "init",
  {
    output: outputOption,
  },
  ({ output }) =>
    initializePrismaSchema({
      output,
    }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer)),
)
