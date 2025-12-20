import * as FileSystem from '@effect/platform/FileSystem'
import * as Path from '@effect/platform/Path'
import type { GeneratorOptions } from '@prisma/generator-helper'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { RenderService } from './render-service.js'

export class GeneratorService extends Context.Tag('GeneratorService')<
  GeneratorService,
  {
    readonly generate: (
      options: GeneratorOptions,
    ) => Effect.Effect<void, Error, FileSystem.FileSystem | Path.Path | RenderService>
  }
>() {
  static Live = Layer.effect(
    GeneratorService,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const render = yield* RenderService

      const parseErrorImportPath = (
        errorImportPath: string | undefined,
      ): { path: string; className: string } | null => {
        if (!errorImportPath) {
          return null
        }
        const [modulePath, className] = errorImportPath.split('#')
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

      const fixSchemaImports = (outputDir: string) =>
        Effect.gen(function* () {
          const schemasDir = path.join(outputDir, 'schemas')
          const indexFile = path.join(schemasDir, 'index.ts')

          const exists = yield* fs.exists(indexFile)
          if (!exists) {
            return
          }

          const content = yield* fs.readFileString(indexFile)
          const fixedContent = content
            .replace(/export \* from '\.\/enums'/g, "export * from './enums.js'")
            .replace(/export \* from '\.\/types'/g, "export * from './types.js'")

          if (content !== fixedContent) {
            yield* fs.writeFileString(indexFile, fixedContent)
          }
        })

      const generate = (options: GeneratorOptions) =>
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Refactoring target
        Effect.gen(function* () {
          const models = options.dmmf.datamodel.models
          const outputDir = options.generator.output?.value
          const schemaDir = path.dirname(options.schemaPath)

          if (!outputDir) {
            return yield* Effect.fail(new Error('No output directory specified'))
          }

          const config = options.generator.config
          const clientImportPath = Array.isArray(config.clientImportPath)
            ? config.clientImportPath[0]
            : (config.clientImportPath ?? '@prisma/client')

          const errorImportPathRaw = Array.isArray(config.errorImportPath)
            ? config.errorImportPath[0]
            : config.errorImportPath

          const importFileExtension = Array.isArray(config.importFileExtension)
            ? config.importFileExtension[0]
            : (config.importFileExtension ?? '')

          let customError = parseErrorImportPath(errorImportPathRaw)

          if (customError?.path.startsWith('.')) {
            const absoluteErrorPath = path.resolve(schemaDir, customError.path)
            const relativeToOutput = path.relative(outputDir, absoluteErrorPath)
            const normalizedPath = relativeToOutput.startsWith('.') ? relativeToOutput : `./${relativeToOutput}`
            const pathWithExtension = addExtension(normalizedPath, importFileExtension)
            customError = { ...customError, path: pathWithExtension }
          }

          // Clean output directory (optional, keeping consistent with original)
          // await fs.rm(outputDir, { recursive: true, force: true })
          yield* fs.makeDirectory(outputDir, { recursive: true })

          // Generate prisma-schema.ts
          const prismaSchemaContent = yield* render.render('prisma-schema', {})
          yield* fs.writeFileString(path.join(outputDir, 'prisma-schema.ts'), prismaSchemaContent)

          // Generate prisma-repository.ts
          const prismaRepoContent = yield* render.render('prisma-repository', { clientImportPath })
          yield* fs.writeFileString(path.join(outputDir, 'prisma-repository.ts'), prismaRepoContent)

          // Generate index.ts
          const errorType = customError ? customError.className : 'PrismaError'
          const rawSqlOperations = yield* render.render('prisma-raw-sql', { errorType })

          // Generate models
          yield* fs.makeDirectory(path.join(outputDir, 'models'), { recursive: true })
          for (const model of models) {
            const content = yield* render.render('model', { model })
            yield* fs.writeFileString(path.join(outputDir, 'models', `${model.name}.ts`), content)
          }

          const modelExports = models.map((m) => `export * from "./models/${m.name}.js"`).join('\n')

          const templateName = customError ? 'index-custom-error' : 'index-default'
          const indexContent = yield* render.render(templateName, {
            clientImportPath,
            customError,
            rawSqlOperations,
            modelExports,
          })

          yield* fs.writeFileString(path.join(outputDir, 'index.ts'), indexContent)

          // Fix schema imports
          yield* fixSchemaImports(outputDir)
        })

      return { generate }
    }),
  )
}
