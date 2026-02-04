import type { DMMF } from '@prisma/generator-helper';
import { buildKyselyFieldType } from '../kysely/type.js';
import { buildForeignKeyMap, type JoinTableInfo } from '../prisma/relation.js';
import { isUuidField } from '../prisma/type.js';
import { generateFileHeader } from '../utils/codegen.js';
import { toPascalCase } from '../utils/naming.js';
import { generateEnumsFile } from './enum.js';
import { generateJoinTableSchema } from './join-table.js';
import { buildFieldType } from './type.js';

/**
 * Generate enums.ts file content
 * Returns null if there are no enums to avoid generating empty files
 */
export const generateEnums = (enums: readonly DMMF.DatamodelEnum[]) => {
  return generateEnumsFile(enums);
}

/**
 * Generate branded ID schema for a model
 * @returns The branded ID schema declaration + exported type, or null if no ID field
 */
export const generateBrandedIdSchema = (model: DMMF.Model, fields: readonly DMMF.Field[]) => {
  const idField = fields.find((f) => f.isId);
  if (!idField) {
    return null;
  }

  const name = toPascalCase(model.name);
  const isUuid = isUuidField(idField);

  let baseType: string;
  if (isUuid) {
    baseType = 'Schema.UUID';
  } else if (idField.type === 'Int') {
    // For Int primary keys, use Schema.Number with positive validation
    baseType = 'Schema.Number.pipe(Schema.positive())';
  } else {
    baseType = 'Schema.String';
  }

  // Export Id as both value and type with same name
  return `export const ${name}Id = ${baseType}.pipe(Schema.brand("${name}Id"));
export type ${name}Id = typeof ${name}Id.Type;`;
}

/**
 * Generate the main model schema
 * Exports as `User` directly (not `_User`)
 * Package's type utilities derive Insertable<User>, Selectable<User>
 */
export const generateModelSchema = (dmmf: DMMF.Document, model: DMMF.Model, fields: readonly DMMF.Field[]) => {
  const fkMap = buildForeignKeyMap(model, dmmf.datamodel.models);
  const name = toPascalCase(model.name);

  const fieldDefinitions = fields
    .map((field) => {
      // Get base Effect type
      const baseType = buildFieldType(field, dmmf, fkMap);
      // Apply Kysely helpers (columnType, generated) and @map directive
      // Pass model.name so @id fields use the model's branded ID type
      const fieldType = buildKyselyFieldType(baseType, field, dmmf, model.name);
      return `  ${field.name}: ${fieldType}`;
    })
    .join(',\n');

  return `export const ${name} = Schema.Struct({
${fieldDefinitions}
});
export type ${name} = typeof ${name};`;
}

/**
 * Generate types.ts file header
 */
export const generateTypesHeader = (dmmf: DMMF.Document, hasEnums: boolean) => {
  const header = generateFileHeader();

  // Import runtime helpers from @effectify/prisma
  // columnType and generated are used for field type annotations
  const imports = [
    `import { Schema } from "effect";`,
    `import { columnType, generated } from "@effectify/prisma";`,
  ];

  if (hasEnums) {
    // Import PascalCase enum schemas
    const enumImports = dmmf.datamodel.enums.map((e) => toPascalCase(e.name)).join(', ');

    imports.push(`import { ${enumImports} } from "./enums.js";`);
  }

  return `${header}\n\n${imports.join('\n')}`;
}

/**
 * Generate schemas for all join tables
 */
export const generateJoinTableSchemas = (dmmf: DMMF.Document, joinTables: JoinTableInfo[]) => {
  return joinTables.map((jt) => generateJoinTableSchema(jt, dmmf)).join('\n\n');
}
