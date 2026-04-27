import { getDMMF } from "@prisma/internals"
import * as NodeServices from "@effect/platform-node/NodeServices"
import type { GeneratorOptions } from "@prisma/generator-helper"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import * as Effect from "effect/Effect"
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
  } as GeneratorOptions
}

const generatorLayer = Layer.mergeAll(
  GeneratorService.layer,
  GenerateSchemnaService.layer,
).pipe(Layer.provideMerge(NodeServices.layer))

const runGenerator = (options: GeneratorOptions) =>
  Effect.runPromise(
    Effect.service(GeneratorService).pipe(
      Effect.flatMap(({ generate }) => generate),
      Effect.provideService(GeneratorContext, options),
      Effect.provide(generatorLayer),
    ),
  )

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

  it("regenerates the react-router example runtime without the dist CLI build", async () => {
    const appDir = path.resolve(import.meta.dirname, "../../../apps/react-router-example")
    const generatedIndexPath = path.join(appDir, "prisma", "generated", "effect", "index.ts")

    await runPnpm(appDir, ["dlx", "prisma", "generate", "--schema", "prisma/schema.prisma"])

    const indexSource = await readFile(generatedIndexPath, "utf8")

    expectContextBasedRuntime(indexSource)
    expect(indexSource).toContain("export const PrismaService = Prisma")
  })
})
