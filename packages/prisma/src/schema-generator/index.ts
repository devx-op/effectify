import type { DMMF } from '@prisma/generator-helper';
import { EffectGenerator } from './effect/generator.js';
import { KyselyGenerator } from './kysely/generator.js';
import { PrismaGenerator } from './prisma/generator.js';
import { FileManager } from './utils/file-manager.js';

/**
 * Generate Effect schemas (enums, types, index)
 * Replicates legacy generator logic
 */
export async function generateSchemas(dmmf: DMMF.Document, outputDir: string) {
  const fileManager = new FileManager(outputDir);
  const prismaGen = new PrismaGenerator(dmmf);
  const effectGen = new EffectGenerator(dmmf);
  const kyselyGen = new KyselyGenerator(dmmf);

  await fileManager.ensureDirectory();

  // Generate Enums
  const enums = prismaGen.getEnums();
  const enumsContent = effectGen.generateEnums(enums);
  if (enumsContent !== null) {
    await fileManager.writeFile('enums.ts', enumsContent);
  }

  // Generate Types
  const models = prismaGen.getModels();
  const joinTables = prismaGen.getManyToManyJoinTables();
  const hasEnums = enums.length > 0;

  const header = effectGen.generateTypesHeader(hasEnums);

  const allBrandedIdSchemas = models
    .map((model) => {
      const fields = prismaGen.getModelFields(model);
      return effectGen.generateBrandedIdSchema(model, fields);
    })
    .filter((schema): schema is string => schema !== null)
    .join('\n\n');

  const modelSchemas = models
    .map((model) => {
      const fields = prismaGen.getModelFields(model);
      return effectGen.generateModelSchema(model, fields);
    })
    .join('\n\n');

  const joinTableSchemas =
    joinTables.length > 0 ? effectGen.generateJoinTableSchemas(joinTables) : '';

  const dbInterface = kyselyGen.generateDBInterface(models, joinTables);

  let content = `${header}`;
  if (allBrandedIdSchemas) {
    content += `\n\n// ===== Branded ID Schemas =====\n${allBrandedIdSchemas}`;
  }
  content += `\n\n// ===== Model Schemas =====\n${modelSchemas}`;
  if (joinTableSchemas) {
    content += `\n\n${joinTableSchemas}`;
  }
  content += `\n\n${dbInterface}`;

  await fileManager.writeFile('types.ts', content);

  // Generate Index
  const indexContent = kyselyGen.generateIndexFile(hasEnums);
  await fileManager.writeFile('index.ts', indexContent);
}
