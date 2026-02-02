import type { DMMF } from '@prisma/generator-helper';

/**
 * Extract enum definitions from Prisma DMMF
 * Handles @map directive for database-level enum values
 */
export function extractEnums(dmmf: DMMF.Document) {
  return dmmf.datamodel.enums;
}

/**
 * Get the database value for an enum value (respects @map directive)
 */
export function getEnumValueDbName(enumValue: DMMF.EnumValue) {
  return enumValue.dbName ?? enumValue.name;
}

/**
 * Get all database values for an enum
 */
export function getEnumDbValues(enumDef: DMMF.DatamodelEnum) {
  return enumDef.values.map(getEnumValueDbName);
}
