import type { DMMF } from '@prisma/generator-helper';
import type { JoinTableInfo } from '../prisma/relation.js';
import { getFieldDbName, hasDefaultValue, isIdField } from '../prisma/type.js';
import { toPascalCase } from '../utils/naming.js';

/**
 * Determine if field needs Kysely columnType wrapper
 * ID fields with @default are read-only (can't insert/update)
 */
export function needsColumnType(field: DMMF.Field) {
  return hasDefaultValue(field) && isIdField(field);
}

/**
 * Check if field is an enum field
 */
export function isEnumField(field: DMMF.Field, dmmf: DMMF.Document) {
  return dmmf.datamodel.enums.some((e: any) => e.name === field.type);
}

/**
 * Determine if field needs Kysely generated wrapper
 * Regular fields with @default are optional on insert, but exclude enums
 */
export function needsGenerated(field: DMMF.Field, dmmf: DMMF.Document) {
  return hasDefaultValue(field) && !isIdField(field) && !isEnumField(field, dmmf);
}

/**
 * Apply Kysely helper wrappers to a field type
 * @param fieldType - The base Effect Schema type
 * @param field - The Prisma field
 * @param modelName - Optional model name for branded ID generation
 */
export function applyKyselyHelpers(fieldType: string, field: DMMF.Field, dmmf: DMMF.Document, modelName?: string) {
  if (needsColumnType(field)) {
    // For @id fields, use the model's branded ID type instead of Schema.UUID
    const idType = modelName ? `${toPascalCase(modelName)}Id` : fieldType;
    return `generated(${idType})`;
  } else if (needsGenerated(field, dmmf)) {
    return `generated(${fieldType})`;
  }
  return fieldType;
}

/**
 * Apply @map directive wrapper if field has different DB name
 */
export function applyMapDirective(fieldType: string, field: DMMF.Field) {
  const dbName = getFieldDbName(field);
  if (field.dbName && field.dbName !== field.name) {
    return `Schema.propertySignature(${fieldType}).pipe(Schema.fromKey("${dbName}"))`;
  }
  return fieldType;
}

/**
 * Build complete field type with Kysely helpers and @map
 * Order: base type → Kysely helpers → @map wrapper
 * @param baseFieldType - The base Effect Schema type
 * @param field - The Prisma field
 * @param modelName - Optional model name for branded ID generation
 */
export function buildKyselyFieldType(baseFieldType: string, field: DMMF.Field, dmmf: DMMF.Document, modelName?: string) {
  // Step 1: Apply Kysely helpers (domain transformation)
  let fieldType = applyKyselyHelpers(baseFieldType, field, dmmf, modelName);

  // Step 2: Apply @map wrapper (structural transformation)
  fieldType = applyMapDirective(fieldType, field);

  return fieldType;
}

/**
 * Generate DB interface entry for a model
 * Uses Schema.Schema.Type<Model> to preserve phantom properties (__select__, __insert__, __update__)
 * that Kysely needs for correct INSERT/UPDATE type inference.
 *
 * Previously used Selectable<Model> but this stripped the phantom properties,
 * causing Kysely to require all fields on INSERT (including generated/read-only fields).
 */
export function generateDBInterfaceEntry(model: DMMF.Model) {
  const tableName = model.dbName || model.name;
  const modelName = toPascalCase(model.name);
  return `  ${tableName}: Schema.Schema.Type<typeof ${modelName}>;`;
}

/**
 * Generate DB interface entry for a join table
 * Uses Schema.Schema.Type to preserve phantom properties for Kysely compatibility
 */
export function generateJoinTableDBInterfaceEntry(joinTable: JoinTableInfo) {
  const { tableName, relationName } = joinTable;
  const schemaName = toPascalCase(relationName);
  return `  ${tableName}: Schema.Schema.Type<typeof ${schemaName}>;`;
}

/**
 * Generate complete DB interface including join tables
 */
export function generateDBInterface(
  models: readonly DMMF.Model[],
  joinTables: JoinTableInfo[] = []
) {
  const modelEntries = Array.from(models).map(generateDBInterfaceEntry).join('\n');

  const joinTableEntries =
    joinTables.length > 0
      ? `\n${joinTables.map(generateJoinTableDBInterfaceEntry).join('\n')}`
      : '';

  return `// Kysely Database Interface
export interface DB {
${modelEntries}${joinTableEntries}
}`;
}
