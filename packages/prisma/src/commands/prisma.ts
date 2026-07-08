import * as Command from "effect/unstable/cli/Command"
import type { DMMF, GeneratorOptions } from "@prisma/generator-helper"
import generatorHelper from "@prisma/generator-helper"
import * as Effect from "effect/Effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Eta } from "eta"
import { createFromBuffer } from "@dprint/formatter"
import { getPath } from "@dprint/typescript"
import * as EnumGenerator from "../schema-generator/effect/enum.js"
import * as EffectGenerator from "../schema-generator/effect/generator.js"
import * as JoinTableGenerator from "../schema-generator/effect/join-table.js"
import * as KyselyGenerator from "../schema-generator/kysely/generator.js"
import * as PrismaGenerator from "../schema-generator/prisma/generator.js"

// Pattern: Direct async wrapper with Effect.runPromise + sync I/O.
//
// The deadlock was caused by Stream.callback + Queue.offer + Deferred.await:
// - Fork fiber blocked on Queue.offer (no main fiber batting yet)
// - Main fiber blocked in Stream.runForEach (waiting for Stream.callback acquire to return)
// - Deadlock
//
// The fix: eliminate the queue and Effect fiber coordination entirely.
// Just call Effect.runPromise directly with sync Node.js fs inside onGenerate.
// The async callback from Prisma handles the concurrency, Effect just provides the runtime.

export const prismaCommand = Command.make("prisma", {}, () =>
  Effect.gen(function*() {
    // Initialize Eta and dprint once (at CLI startup, not per-generation)
    const templatesDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../templates",
    )
    const eta = new Eta({ views: templatesDir, autoEscape: false })
    const dprintFormatter = createFromBuffer(fs.readFileSync(getPath()))

    generatorHelper.generatorHandler({
      onManifest() {
        return {
          defaultOutput: "../generated/effect",
          prettyName: "Prisma Effect Generator",
          requiresEngines: [],
        }
      },
      async onGenerate(options: GeneratorOptions) {
        // Run the entire generation synchronously via Effect.runPromise.
        // All actual I/O is direct Node.js sync fs calls — no Effect fiber blocking.
        await Effect.runPromise(
          Effect.sync(() => {
            const outputDir = options.generator.output?.value
            if (!outputDir) {
              throw new Error("No output directory specified")
            }

            const models = options.dmmf.datamodel.models
            const clientImportPath = Array.isArray(
                options.generator.config.clientImportPath,
              )
              ? options.generator.config.clientImportPath[0]
              : options.generator.config.clientImportPath ?? "@prisma/client"

            const formatAndWrite = (
              templateName: string,
              data: Record<string, unknown>,
              fileName: string,
              baseDir?: string,
            ) => {
              const content = eta.render(templateName, data)
              const formatted = dprintFormatter.formatText({
                filePath: fileName,
                fileText: content,
              })
              fs.writeFileSync(
                path.join(baseDir ?? outputDir, fileName),
                formatted,
                "utf8",
              )
            }

            // Create output directory
            fs.mkdirSync(outputDir, { recursive: true })

            // ========================================
            // Generate schemas/ directory (Effect schemas)
            // ========================================
            const schemasDir = path.join(outputDir, "schemas")
            fs.mkdirSync(schemasDir, { recursive: true })

            const schemasFormatAndWrite = (
              templateName: string,
              data: Record<string, unknown>,
              fileName: string,
            ) => {
              const content = eta.render(templateName, data)
              const formatted = dprintFormatter.formatText({
                filePath: fileName,
                fileText: content,
              })
              fs.writeFileSync(
                path.join(schemasDir, fileName),
                formatted,
                "utf8",
              )
            }

            const enums = PrismaGenerator.getEnums(options.dmmf)
            const joinTables = PrismaGenerator.getManyToManyJoinTables(
              options.dmmf,
            )
            const hasEnums = enums.length > 0

            // Generate enums.ts
            const enumsData = EnumGenerator.prepareEnumsData(enums)
            if (enumsData) {
              schemasFormatAndWrite("effect-enums", enumsData, "enums.ts")
            }

            // Generate types.ts
            const headerData = EffectGenerator.prepareTypesHeaderData(
              options.dmmf,
              hasEnums,
            )
            let typesContent = eta.render("effect-types-header", headerData)

            // Branded IDs
            type BrandedIdData = { name: string; baseType: string } | null
            const brandedIdsRaw = models.map(
              (model: DMMF.Model): BrandedIdData => {
                const fields = PrismaGenerator.getModelFields(model)
                return EffectGenerator.prepareBrandedIdSchemaData(
                  model,
                  fields,
                )
              },
            )
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
              return EffectGenerator.prepareModelSchemaData(
                options.dmmf,
                model,
                fields,
              )
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
            const dbInterfaceData = KyselyGenerator.prepareDBInterfaceData(
              models,
              joinTables,
            )
            const dbInterfaceContent = eta.render(
              "kysely-db-interface",
              dbInterfaceData,
            )
            typesContent += `\n\n${dbInterfaceContent}`

            const formattedTypes = dprintFormatter.formatText({
              filePath: "types.ts",
              fileText: typesContent,
            })
            fs.writeFileSync(
              path.join(schemasDir, "types.ts"),
              formattedTypes,
              "utf8",
            )

            // Generate schemas/index.ts
            const indexData = KyselyGenerator.prepareIndexData(hasEnums)
            schemasFormatAndWrite("effect-index", indexData, "index.ts")

            // ========================================
            // Generate prisma-schema.ts
            // ========================================
            formatAndWrite("prisma-schema", {}, "prisma-schema.ts")

            // Generate prisma-repository.ts
            formatAndWrite(
              "prisma-repository",
              { clientImportPath },
              "prisma-repository.ts",
            )

            // Generate model files
            fs.mkdirSync(path.join(outputDir, "models"), { recursive: true })
            for (const model of models) {
              const modelContent = eta.render("model", { model })
              const formatted = dprintFormatter.formatText({
                filePath: `${model.name}.ts`,
                fileText: modelContent,
              })
              fs.writeFileSync(
                path.join(outputDir, "models", `${model.name}.ts`),
                formatted,
                "utf8",
              )
            }

            // Generate index.ts
            const modelExports = models
              .map(
                (m: { name: string }) => `export * from "./models/${m.name}.js"`,
              )
              .join("\n")
            const indexContent = eta.render("index-default", {
              clientImportPath,
              modelExports,
            })
            const formattedIndex = dprintFormatter.formatText({
              filePath: "index.ts",
              fileText: indexContent,
            })
            fs.writeFileSync(
              path.join(outputDir, "index.ts"),
              formattedIndex,
              "utf8",
            )
          }),
        )
      },
    })

    // Handler is registered, command completes
    yield* Effect.sync(() => {})
  }))
