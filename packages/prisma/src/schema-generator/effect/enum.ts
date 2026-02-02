import type { DMMF } from '@prisma/generator-helper';
import { getEnumValueDbName } from '../prisma/enum.js';
import { generateFileHeader } from '../utils/codegen.js';
import { toPascalCase } from '../utils/naming.js';

/**
 * Generate TypeScript enum + Effect Schema.Enums wrapper
 *
 * Output pattern:
 * - Native TS enum with SCREAMING_SNAKE_CASE (internal, for Schema.Enums)
 * - PascalCase export IS the Schema (so it works in Schema.Struct)
 * - Type alias with same name (value + type pattern)
 */
export function generateEnumSchema(enumDef: DMMF.DatamodelEnum) {
  // PascalCase name for the Schema
  const schemaName = toPascalCase(enumDef.name);

  // Generate literal values
  const values = enumDef.values
    .map((v) => `"${getEnumValueDbName(v)}"`)
    .join(', ');

  // Export Schema as Union of Literals (compatible with Prisma Client enums)
  return `export const ${schemaName} = Schema.Literal(${values});
export type ${schemaName} = typeof ${schemaName}.Type;`;
}

/**
 * Generate all enum schemas as a single file content
 * Returns null if there are no enums to avoid generating empty files
 */
export function generateEnumsFile(enums: readonly DMMF.DatamodelEnum[]) {
  if (enums.length === 0) {
    return null;
  }

  const header = generateFileHeader();
  const imports = `import { Schema } from "effect";`;
  const enumSchemas = enums.map(generateEnumSchema).join('\n\n');

  return `${header}\n\n${imports}\n\n${enumSchemas}`;
}
