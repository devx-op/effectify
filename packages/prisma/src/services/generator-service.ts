import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import type { DMMF, GeneratorOptions } from "@prisma/generator-helper"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { GeneratorContext } from "./generator-context.js"
import { RenderService } from "./render-service.js"
import { FormatterService } from "./formatter-service.js"

import { generateSchemas } from "../schema-generator/index.js"

export class GeneratorService extends Context.Tag("GeneratorService")<
  GeneratorService,
  {
    readonly generate: Effect.Effect<void, Error, GeneratorContext>
  }
>() {
  static Live = Layer.effect(
    GeneratorService,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const renderService = yield* RenderService
      const formatterService = yield* FormatterService
      const { render } = renderService
      const { format } = formatterService

      const parseErrorImportPath = (
        errorImportPath: string | undefined,
      ): { path: string; className: string } | null => {
        if (!errorImportPath) {
          return null
        }
        const [modulePath, className] = errorImportPath.split("#")
        if (!(modulePath && className)) {
          throw new Error(
            `Invalid errorImportPath format: "${errorImportPath}". Expected "path/to/module#ErrorClassName"`,
          )
        }
        return { path: modulePath, className }
      }

      const addExtension = (filePath: string, extension: string): string => {
        if (!extension) {
          return filePath
        }
        const ext = path.extname(filePath)
        if (ext) {
          return filePath
        }
        return `${filePath}.${extension}`
      }

      const getClientImportPath = (config: GeneratorOptions["generator"]["config"]) =>
        Array.isArray(config.clientImportPath)
          ? config.clientImportPath[0]
          : (config.clientImportPath ?? "@prisma/client")

      const getErrorImportPath = (config: GeneratorOptions["generator"]["config"]) =>
        Array.isArray(config.errorImportPath) ? config.errorImportPath[0] : config.errorImportPath

      const getImportFileExtension = (config: GeneratorOptions["generator"]["config"]) =>
        Array.isArray(config.importFileExtension) ? config.importFileExtension[0] : (config.importFileExtension ?? "")

      const getCustomError = (
        config: GeneratorOptions["generator"]["config"],
        options: GeneratorOptions,
        schemaDir: string,
      ) => {
        const errorImportPathRaw = getErrorImportPath(config)
        const importFileExtension = getImportFileExtension(config)

        let customError = parseErrorImportPath(errorImportPathRaw)

        if (customError?.path.startsWith(".")) {
          const outputDir = options.generator.output?.value
          if (outputDir) {
            const absoluteErrorPath = path.resolve(schemaDir, customError.path)
            const relativeToOutput = path.relative(outputDir, absoluteErrorPath)
            const normalizedPath = relativeToOutput.startsWith(".") ? relativeToOutput : `./${relativeToOutput}`
            const pathWithExtension = addExtension(normalizedPath, importFileExtension)
            customError = { ...customError, path: pathWithExtension }
          }
        }
        return customError
      }

      const getGeneratorConfig = (options: GeneratorOptions, schemaDir: string) => {
        const { config } = options.generator
        const clientImportPath = getClientImportPath(config)
        const customError = getCustomError(config, options, schemaDir)

        return { clientImportPath, customError }
      }

      const generatePrismaSchema = (outputDir: string) =>
        Effect.gen(function*() {
          const content = yield* render("prisma-schema", {})
          const formatted = yield* format(content)
          yield* fs.writeFileString(path.join(outputDir, "prisma-schema.ts"), formatted)
        })

      const generatePrismaRepository = (outputDir: string, clientImportPath: string) =>
        Effect.gen(function*() {
          const content = yield* render("prisma-repository", { clientImportPath })
          const formatted = yield* format(content)
          yield* fs.writeFileString(path.join(outputDir, "prisma-repository.ts"), formatted)
        })

      const generateModels = (outputDir: string, models: readonly DMMF.Model[]) =>
        Effect.gen(function*() {
          yield* fs.makeDirectory(path.join(outputDir, "models"), { recursive: true })
          for (const model of models) {
            const content = yield* render("model", { model })
            const formatted = yield* format(content)
            yield* fs.writeFileString(path.join(outputDir, "models", `${model.name}.ts`), formatted)
          }
        })

      const generateIndex = (
        outputDir: string,
        models: readonly DMMF.Model[],
        clientImportPath: string,
        customError: { path: string; className: string } | null,
      ) =>
        Effect.gen(function*() {
          const errorType = customError ? customError.className : "PrismaError"
          const rawSqlOperations = yield* render("prisma-raw-sql", { errorType })
          const modelExports = models.map((m) => `export * from "./models/${m.name}.js"`).join("\n")

          const templateName = customError ? "index-custom-error" : "index-default"
          const content = yield* render(templateName, {
            clientImportPath,
            customError,
            rawSqlOperations,
            modelExports,
          })

          const formatted = yield* format(content)
          yield* fs.writeFileString(path.join(outputDir, "index.ts"), formatted)
        })

      const generate = Effect.gen(function*() {
        const options = yield* GeneratorContext
        const models = options.dmmf.datamodel.models
        const outputDir = options.generator.output?.value
        const schemaDir = path.dirname(options.schemaPath)

        if (!outputDir) {
          return yield* Effect.fail(new Error("No output directory specified"))
        }

        const { clientImportPath, customError } = getGeneratorConfig(options, schemaDir)

        yield* fs.makeDirectory(outputDir, { recursive: true })

        // Generate Effect/Kysely Schemas (enums.ts, types.ts, schemas/index.ts)
        const schemasDir = path.join(outputDir, "schemas")
        yield* generateSchemas(options.dmmf, schemasDir).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, path),
          Effect.provideService(RenderService, renderService),
          Effect.provideService(FormatterService, formatterService),
        )

        yield* generatePrismaSchema(outputDir)
        yield* generatePrismaRepository(outputDir, clientImportPath)
        yield* generateModels(outputDir, models)
        yield* generateIndex(outputDir, models, clientImportPath, customError)
      })

      return { generate }
    }),
  )
}
