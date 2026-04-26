import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import type { DMMF } from "@prisma/generator-helper"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { RenderError, RenderService } from "../services/render-service.js"
import { FormatterService } from "../services/formatter-service.js"
import * as EnumGenerator from "./effect/enum.js"
import * as EffectGenerator from "./effect/generator.js"
import * as JoinTableGenerator from "./effect/join-table.js"
import * as KyselyGenerator from "./kysely/generator.js"
import * as PrismaGenerator from "./prisma/generator.js"
import * as PlatformError from "effect/PlatformError"

export class GenerateSchemnaService extends Context.Service<
  GenerateSchemnaService,
  {
    generate: (
      dmmf: DMMF.Document,
      outputDir: string,
    ) => Effect.Effect<
      void,
      Error | PlatformError.PlatformError | RenderError,
      FormatterService | RenderService
    >
  }
>()("@effectify/prisma/schema-generator/GenerateSchemnaService", {
  make: Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    return {
      generate: (dmmf: DMMF.Document, outputDir: string) =>
        Effect.gen(function*() {
          const { render } = yield* RenderService
          const { format } = yield* FormatterService

          yield* fs.makeDirectory(outputDir, { recursive: true })

          // Write schemas/ files into a "schemas" subdirectory for proper module resolution
          const schemasDir = path.join(outputDir, "schemas")
          yield* fs.makeDirectory(schemasDir, { recursive: true })

          const writeSchemaFile = (filename: string, content: string) =>
            Effect.gen(function*() {
              const formatted = yield* format(content)
              const filePath = path.join(schemasDir, filename)
              yield* fs.writeFileString(filePath, formatted)
            })

          // Generate Enums
          const enums = PrismaGenerator.getEnums(dmmf)
          const enumsData = EnumGenerator.prepareEnumsData(enums)
          if (enumsData) {
            const content = yield* render("effect-enums", enumsData)
            yield* writeSchemaFile("enums.ts", content)
          }

          // Generate Types
          const models = PrismaGenerator.getModels(dmmf)
          const joinTables = PrismaGenerator.getManyToManyJoinTables(dmmf)
          const hasEnums = enums.length > 0

          // Header
          const headerData = EffectGenerator.prepareTypesHeaderData(
            dmmf,
            hasEnums,
          )
          let content = yield* render("effect-types-header", headerData)

          // Branded IDs
          const brandedIdsData = models
            .map((model) => {
              const fields = PrismaGenerator.getModelFields(model)
              return EffectGenerator.prepareBrandedIdSchemaData(model, fields)
            })
            .filter((data): data is NonNullable<typeof data> => data !== null)

          if (brandedIdsData.length > 0) {
            content += `\n\n// ===== Branded ID Schemas =====`
            for (const data of brandedIdsData) {
              const idContent = yield* render("effect-branded-id", data)
              content += `\n\n${idContent}`
            }
          }

          // Models
          const modelsData = models.map((model) => {
            const fields = PrismaGenerator.getModelFields(model)
            return EffectGenerator.prepareModelSchemaData(dmmf, model, fields)
          })

          if (modelsData.length > 0) {
            content += `\n\n// ===== Model Schemas =====`
            for (const data of modelsData) {
              const modelContent = yield* render("effect-model", data)
              content += `\n\n${modelContent}`
            }
          }

          // Join Tables
          const joinTablesData = joinTables.map((jt) => JoinTableGenerator.prepareJoinTableData(jt, dmmf))
          if (joinTablesData.length > 0) {
            for (const data of joinTablesData) {
              const jtContent = yield* render("effect-join-table", data)
              content += `\n\n${jtContent}`
            }
          }

          // DB Interface
          const dbInterfaceData = KyselyGenerator.prepareDBInterfaceData(
            models,
            joinTables,
          )
          const dbInterfaceContent = yield* render(
            "kysely-db-interface",
            dbInterfaceData,
          )
          content += `\n\n${dbInterfaceContent}`

          yield* writeSchemaFile("types.ts", content)

          // Index
          const indexData = KyselyGenerator.prepareIndexData(hasEnums)
          const indexContent = yield* render("effect-index", indexData)
          yield* writeSchemaFile("index.ts", indexContent)
        }),
    }
  }),
}) {
  static readonly layer = Layer.effect(GenerateSchemnaService, this.make).pipe(
    Layer.provide(RenderService.layer),
    Layer.provide(FormatterService.layer),
  )
}
