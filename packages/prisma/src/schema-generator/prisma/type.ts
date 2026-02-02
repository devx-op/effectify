import type { DMMF } from '@prisma/generator-helper';

/**
 * Check if a field is a UUID using native DMMF type information
 * 3-tier detection: native type � documentation � field name patterns
 */
export function isUuidField(field: DMMF.Field) {
  // 1. Check native type (most reliable)
  if (field.nativeType?.[0] === 'Uuid') {
    return true;
  }

  // 2. Check documentation for @db.Uuid
  if (field.documentation?.includes('@db.Uuid')) {
    return true;
  }

  // 3. Fallback: Field name patterns (only for String type)
  if (field.type !== 'String') {
    return false;
  }

  const uuidFieldPatterns = [
    /^id$/, // Primary ID fields
    /_id$/, // Foreign key ID fields
    /^.*_uuid$/, // uuid suffix
    /^uuid$/, // Direct uuid fields
  ] as const;

  return uuidFieldPatterns.some((pattern) => pattern.test(field.name));
}

/**
 * Get the database column name for a field (respects @map directive)
 */
export function getFieldDbName(field: DMMF.Field) {
  return field.dbName ?? field.name;
}

/**
 * Check if field has a default value using native DMMF property
 */
export function hasDefaultValue(field: DMMF.Field) {
  return field.hasDefaultValue === true;
}

/**
 * Check if field is an ID field using native DMMF property
 */
export function isIdField(field: DMMF.Field) {
  return field.isId === true;
}

/**
 * Check if field is required using native DMMF property
 */
export function isRequiredField(field: DMMF.Field) {
  return field.isRequired === true;
}

/**
 * Check if field is a list/array using native DMMF property
 */
export function isListField(field: DMMF.Field) {
  return field.isList === true;
}

/**
 * Filter models to exclude internal models (starting with _)
 */
export function filterInternalModels(models: readonly DMMF.Model[]) {
  return models.filter((model) => !model.name.startsWith('_'));
}

/**
 * Filter fields to only include scalar and enum fields (exclude relations)
 */
export function filterSchemaFields(fields: readonly DMMF.Field[]) {
  return fields.filter((field) => field.kind === 'scalar' || field.kind === 'enum');
}

/**
 * Get the database table name for a model (respects @@map directive)
 */
export function getModelDbName(model: DMMF.Model) {
  return model.dbName ?? model.name;
}

/**
 * Sort models alphabetically for deterministic output
 */
export function sortModels(models: readonly DMMF.Model[]) {
  return models.slice().sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sort fields alphabetically for deterministic output
 */
export function sortFields(fields: readonly DMMF.Field[]) {
  return fields.slice().sort((a, b) => a.name.localeCompare(b.name));
}
