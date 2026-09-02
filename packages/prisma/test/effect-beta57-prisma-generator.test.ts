import { getDMMF } from "@prisma/internals"
import * as NodeServices from "@effect/platform-node/NodeServices"
import type { GeneratorOptions } from "@prisma/generator-helper"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { afterEach, describe, expect, it } from "vitest"

import { GenerateSchemnaService } from "../src/schema-generator/index.js"
import { GeneratorContext } from "../src/services/generator-context.js"
import { GeneratorService } from "../src/services/generator-service.js"

const createdDirs: Array<string> = []

const makeTempDir = async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "effectify-prisma-beta57-"))
  createdDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })))
})

const baseSchema = `
datasource db {
  provider = "sqlite"
}

model Todo {
  id        String  @id @default(uuid())
  title     String
  content   String?
  published Boolean @default(false)
}
`

const makeGeneratorOptions = async (
  outputDir: string,
  config: Record<string, string> = {},
): Promise<GeneratorOptions> => {
  await rm(outputDir, { force: true, recursive: true })
  await mkdir(outputDir, { recursive: true })
  const schemaPath = path.join(outputDir, "schema.prisma")
  await writeFile(schemaPath, baseSchema)
  const dmmf = await getDMMF({ datamodel: baseSchema })

  return {
    dmmf,
    generator: {
      config: {
        clientImportPath: "../client.js",
        importFileExtension: "js",
        ...config,
      },
      output: {
        value: outputDir,
      },
    },
    schemaPath,
  } as unknown as GeneratorOptions
}

const generatorLayer = Layer.mergeAll(GeneratorService.layer, GenerateSchemnaService.layer).pipe(
  Layer.provideMerge(NodeServices.layer),
)

const generatorEffect = (options: GeneratorOptions) =>
  Effect.service(GeneratorService).pipe(
    Effect.flatMap(({ generate }) => generate),
    Effect.provideService(GeneratorContext, options),
    Effect.provide(generatorLayer),
  )

const runGenerator = (options: GeneratorOptions) => Effect.runPromise(generatorEffect(options))

const runGeneratorExit = (options: GeneratorOptions) => Effect.runPromiseExit(generatorEffect(options))

const readGeneratedIndex = async (outputDir: string) => readFile(path.join(outputDir, "index.ts"), "utf8")

const expectContextBasedRuntime = (source: string) => {
  expect(source).toContain('import * as Context from "effect/Context"')
  expect(source).toContain("extends Context.Service<")
  expect(source).not.toContain("ServiceMap")
}

const runPnpm = (cwd: string, args: Array<string>) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd, stdio: "pipe" })
    let stderr = ""

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })

    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr || `pnpm ${args.join(" ")} failed with exit code ${code}`))
    })
  })

describe("beta57 prisma generator migration", () => {
  it("reports a missing output directory as a prefixed GeneratorError defect", async () => {
    const outputDir = path.join(await makeTempDir(), "generated", "effect")
    const options = await makeGeneratorOptions(outputDir)
    const exit = await runGeneratorExit({
      ...options,
      generator: {
        ...options.generator,
        output: null,
      },
    })

    expect(Exit.isFailure(exit)).toBe(true)
    if (!Exit.isFailure(exit)) {
      throw new Error("expected generator failure")
    }

    expect(exit.cause.reasons).toHaveLength(1)
    const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
    expect(defects).toHaveLength(1)
    expect(defects[0]).toHaveProperty("_tag", "GeneratorError")
    expect(defects[0]).toHaveProperty("message", "Generator error: No output directory specified")
    expect(defects[0]).toHaveProperty("details", "No output directory specified")
  })

  it("generates the default runtime with Context services", async () => {
    const outputDir = path.join(await makeTempDir(), "generated", "effect")
    const options = await makeGeneratorOptions(outputDir)

    await runGenerator(options)

    const indexSource = await readGeneratedIndex(outputDir)

    expectContextBasedRuntime(indexSource)
    expect(indexSource).toContain("export class PrismaClient")
    expect(indexSource).toContain("export class Prisma extends Context.Service<Prisma>()")
  })

  it("generates the custom-error runtime with Context services", async () => {
    const outputDir = path.join(await makeTempDir(), "generated", "effect")
    const options = await makeGeneratorOptions(outputDir, {
      errorImportPath: "../errors/prisma-error#AppPrismaError",
    })

    await runGenerator(options)

    const indexSource = await readGeneratedIndex(outputDir)

    expectContextBasedRuntime(indexSource)
    expect(indexSource).toContain('import { AppPrismaError, mapPrismaError } from "../errors/prisma-error.js"')
  })

  it("regenerates the react-router example runtime through the compiled dist CLI", async () => {
    const appDir = path.resolve(import.meta.dirname, "../../../apps/react-router-example")
    const appSchemaPath = path.join(appDir, "prisma", "schema.prisma")
    const schemaSource = await readFile(appSchemaPath, "utf8")
    const integrationDir = await makeTempDir()
    const schemaPath = path.join(integrationDir, "schema.prisma")
    const generatedIndexPath = path.join(integrationDir, "generated", "effect", "index.ts")

    expect(schemaSource).toContain('provider = "node ../../packages/prisma/dist/src/cli.js"')
    expect(schemaSource).not.toContain("packages/prisma/bin")
    expect(schemaSource).not.toContain("src/cli.ts")
    expect(schemaSource).not.toContain("tsx")

    await writeFile(schemaPath, schemaSource)
    await runPnpm(appDir, ["exec", "prisma", "generate", "--schema", schemaPath, "--generator", "effect"])

    const indexSource = await readFile(generatedIndexPath, "utf8")

    expectContextBasedRuntime(indexSource)
    expect(indexSource).toContain("export const PrismaService = Prisma")
  }, 30_000)
})
