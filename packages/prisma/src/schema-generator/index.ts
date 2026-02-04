import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import type { DMMF } from '@prisma/generator-helper';
import * as Effect from "effect/Effect"
import * as EffectGenerator from './effect/generator.js';
import * as KyselyGenerator from './kysely/generator.js';
import * as PrismaGenerator from './prisma/generator.js';
import { formatCode } from './utils/templates.js';

/**
 * Generate Effect schemas (enums, types, index)
 * Replicates legacy generator logic using Effect patterns
 */
export const generateSchemas = (dmmf: DMMF.Document, outputDir: string) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    yield* fs.makeDirectory(outputDir, { recursive: true })

    const writeFile = (filename: string, content: string) =>
      Effect.gen(function*() {
        const formatted = yield* Effect.promise(() => formatCode(content))
        const filePath = path.join(outputDir, filename)
        yield* fs.writeFileString(filePath, formatted)
      })

    // Generate Enums
    const enums = PrismaGenerator.getEnums(dmmf);
    const enumsContent = EffectGenerator.generateEnums(enums);
    if (enumsContent !== null) {
      yield* writeFile('enums.ts', enumsContent);
    }

    // Generate Types
    const models = PrismaGenerator.getModels(dmmf);
    const joinTables = PrismaGenerator.getManyToManyJoinTables(dmmf);
    const hasEnums = enums.length > 0;

    const header = EffectGenerator.generateTypesHeader(dmmf, hasEnums);

    const allBrandedIdSchemas = models
      .map((model) => {
        const fields = PrismaGenerator.getModelFields(model);
        return EffectGenerator.generateBrandedIdSchema(model, fields);
      })
      .filter((schema): schema is string => schema !== null)
      .join('\n\n');

    const modelSchemas = models
      .map((model) => {
        const fields = PrismaGenerator.getModelFields(model);
        return EffectGenerator.generateModelSchema(dmmf, model, fields);
      })
      .join('\n\n');

    const joinTableSchemas =
      joinTables.length > 0 ? EffectGenerator.generateJoinTableSchemas(dmmf, joinTables) : '';

    const dbInterface = KyselyGenerator.generateDBInterface(models, joinTables);

    let content = `${header}`;
    if (allBrandedIdSchemas) {
      content += `\n\n// ===== Branded ID Schemas =====\n${allBrandedIdSchemas}`;
    }
    content += `\n\n// ===== Model Schemas =====\n${modelSchemas}`;
    if (joinTableSchemas) {
      content += `\n\n${joinTableSchemas}`;
    }
    content += `\n\n${dbInterface}`;

    yield* writeFile('types.ts', content);

    // Generate Index
    const indexContent = KyselyGenerator.generateIndexFile(hasEnums);
    yield* writeFile('index.ts', indexContent);
  })
