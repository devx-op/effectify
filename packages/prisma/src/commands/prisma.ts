import * as Command from "effect/unstable/cli/Command"
import type { DMMF, GeneratorOptions } from "@prisma/generator-helper"
import generatorHelper from "@prisma/generator-helper"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Eta } from "eta"
import * as EnumGenerator from "../schema-generator/effect/enum.js"
import * as EffectGenerator from "../schema-generator/effect/generator.js"
import * as JoinTableGenerator from "../schema-generator/effect/join-table.js"
import * as KyselyGenerator from "../schema-generator/kysely/generator.js"
import * as PrismaGenerator from "../schema-generator/prisma/generator.js"
import { formatTypeScript } from "../services/formatter-service.js"

// Pattern: Direct async wrapper with Effect.runPromise, async formatting, and sync file I/O.
//
// The deadlock was caused by Stream.callback + Queue.offer + Deferred.await:
// - Fork fiber blocked on Queue.offer (no main fiber batting yet)
// - Main fiber blocked in Stream.runForEach (waiting for Stream.callback acquire to return)
// - Deadlock
//
// The fix: eliminate the queue and Effect fiber coordination entirely.
// Call Effect.runPromise directly inside onGenerate. Prisma owns the async callback,
// Oxfmt formats asynchronously, and file writes remain synchronous and ordered.

export const prismaCommand = Command.make("prisma", {}, () =>
  Effect.gen(function* () {
    // Initialize Eta once at CLI startup, not per generation.
    const templatesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates")
    const eta = new Eta({ views: templatesDir, autoEscape: false })

    generatorHelper.generatorHandler({
      onManifest() {
        return {
          defaultOutput: "../generated/effect",
          prettyName: "Prisma Effect Generator",
          requiresEngines: [],
        }
      },
      async onGenerate(options: GeneratorOptions) {
        // Keep generation sequential so each async format completes before its sync write.
        await Effect.runPromise(
          Effect.promise(async () => {
            const outputDir = options.generator.output?.value
            if (!outputDir) {
              throw new Error("No output directory specified")
            }

            const models = options.dmmf.datamodel.models
            const clientImportPath = Array.isArray(options.generator.config.clientImportPath)
              ? options.generator.config.clientImportPath[0]
              : (options.generator.config.clientImportPath ?? "@prisma/client")

            const formatAndWrite = async (
              templateName: string,
              data: Record<string, unknown>,
              fileName: string,
              baseDir?: string,
            ) => {
              const content = eta.render(templateName, data)
              const formatted = await formatTypeScript(fileName, content)
              fs.writeFileSync(path.join(baseDir ?? outputDir, fileName), formatted, "utf8")
            }

            // Create output directory
            fs.mkdirSync(outputDir, { recursive: true })

            // ========================================
            // Generate schemas/ directory (Effect schemas)
            // ========================================
            const schemasDir = path.join(outputDir, "schemas")
            fs.mkdirSync(schemasDir, { recursive: true })

            const schemasFormatAndWrite = async (
              templateName: string,
              data: Record<string, unknown>,
              fileName: string,
            ) => {
              const content = eta.render(templateName, data)
              const formatted = await formatTypeScript(fileName, content)
              fs.writeFileSync(path.join(schemasDir, fileName), formatted, "utf8")
            }

            const enums = PrismaGenerator.getEnums(options.dmmf)
            const joinTables = PrismaGenerator.getManyToManyJoinTables(options.dmmf)
            const hasEnums = enums.length > 0

            // Generate enums.ts
            const enumsData = EnumGenerator.prepareEnumsData(enums)
            if (enumsData) {
              await schemasFormatAndWrite("effect-enums", enumsData, "enums.ts")
            }

            // Generate types.ts
            const headerData = EffectGenerator.prepareTypesHeaderData(options.dmmf, hasEnums)
            let typesContent = eta.render("effect-types-header", headerData)

            // Branded IDs
            type BrandedIdData = { name: string; baseType: string } | null
            const brandedIdsRaw = models.map((model: DMMF.Model): BrandedIdData => {
              const fields = PrismaGenerator.getModelFields(model)
              return EffectGenerator.prepareBrandedIdSchemaData(model, fields)
            })
            const brandedIdsData = brandedIdsRaw.filter(
              (d: BrandedIdData): d is { name: string; baseType: string } => d !== null,
            )

            if (brandedIdsData.length > 0) {
              typesContent += `\n\n// ===== Branded ID Schemas =====`
              for (const data of brandedIdsData) {
                const idContent = eta.render("effect-branded-id", data)
                typesContent += `\n\n${idContent}`
              }
            }

            // Models
            const modelsData = models.map((model: DMMF.Model) => {
              const fields = PrismaGenerator.getModelFields(model)
              return EffectGenerator.prepareModelSchemaData(options.dmmf, model, fields)
            })

            if (modelsData.length > 0) {
              typesContent += `\n\n// ===== Model Schemas =====`
              for (const data of modelsData) {
                const modelContent = eta.render("effect-model", data)
                typesContent += `\n\n${modelContent}`
              }
            }

            // Join Tables
            const joinTablesData = joinTables.map((jt) => JoinTableGenerator.prepareJoinTableData(jt, options.dmmf))
            if (joinTablesData.length > 0) {
              for (const data of joinTablesData) {
                const jtContent = eta.render("effect-join-table", data)
                typesContent += `\n\n${jtContent}`
              }
            }

            // DB Interface
            const dbInterfaceData = KyselyGenerator.prepareDBInterfaceData(models, joinTables)
            const dbInterfaceContent = eta.render("kysely-db-interface", dbInterfaceData)
            typesContent += `\n\n${dbInterfaceContent}`

            const formattedTypes = await formatTypeScript("types.ts", typesContent)
            fs.writeFileSync(path.join(schemasDir, "types.ts"), formattedTypes, "utf8")

            // Generate schemas/index.ts
            const indexData = KyselyGenerator.prepareIndexData(hasEnums)
            await schemasFormatAndWrite("effect-index", indexData, "index.ts")

            // ========================================
            // Generate prisma-schema.ts
            // ========================================
            await formatAndWrite("prisma-schema", {}, "prisma-schema.ts")

            // Generate prisma-repository.ts
            await formatAndWrite("prisma-repository", { clientImportPath }, "prisma-repository.ts")

            // Generate model files
            fs.mkdirSync(path.join(outputDir, "models"), { recursive: true })
            for (const model of models) {
              const modelContent = eta.render("model", { model })
              const formatted = await formatTypeScript(`${model.name}.ts`, modelContent)
              fs.writeFileSync(path.join(outputDir, "models", `${model.name}.ts`), formatted, "utf8")
            }

            // Generate index.ts
            const modelExports = models.map((m: { name: string }) => `export * from "./models/${m.name}.js"`).join("\n")
            const indexContent = eta.render("index-default", {
              clientImportPath,
              modelExports,
            })
            const formattedIndex = await formatTypeScript("index.ts", indexContent)
            fs.writeFileSync(path.join(outputDir, "index.ts"), formattedIndex, "utf8")
          }),
        )
      },
    })

    // Handler is registered, command completes
    yield* Effect.sync(() => {})
  }),
)
