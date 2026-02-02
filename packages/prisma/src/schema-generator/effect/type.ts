import type { DMMF } from '@prisma/generator-helper';
import { isListField, isRequiredField, isUuidField } from '../prisma/type.js';
import { extractEffectTypeOverride } from '../utils/annotations.js';
import { toPascalCase } from '../utils/naming.js';

/**
 * Prisma scalar type mapping to Effect Schema types
 * Uses const assertion to avoid type guards
 *
 * Note: DateTime uses Schema.DateFromSelf (not Schema.Date) so that:
 * - Type = Date (runtime)
 * - Encoded = Date (database)
 * This allows Kysely to work with native Date objects directly.
 * Schema.Date would encode to string, requiring ISO string conversions.
 */
const PRISMA_SCALAR_MAP = {
  String: 'Schema.String',
  Int: 'Schema.Number',
  Float: 'Schema.Number',
  BigInt: 'Schema.BigInt',
  Decimal: 'Schema.String', // For precision
  Boolean: 'Schema.Boolean',
  DateTime: 'Schema.DateFromSelf', // Native Date type for Kysely compatibility
  Json: 'Schema.Unknown', // Safe unknown type
  Bytes: 'Schema.Uint8Array',
} as const;

/**
 * Map Prisma field type to Effect Schema type
 * Priority order: annotation → FK branded → UUID → scalar → enum → unknown fallback
 *
 * @param field - The Prisma field to map
 * @param dmmf - The full DMMF document for enum lookups
 * @param fkMap - Optional FK field → target model mapping for branded FK types
 */
export function mapFieldToEffectType(
  field: DMMF.Field,
  dmmf: DMMF.Document,
  fkMap?: Map<string, string>
) {
  // PRIORITY 1: Check for @customType annotation
  const typeOverride = extractEffectTypeOverride(field);
  if (typeOverride) {
    return typeOverride;
  }

  // PRIORITY 2: Check if this is a FK field with branded target
  // FK fields use the referenced model's branded ID (e.g., UserId for user_id)
  if (fkMap && fkMap.has(field.name)) {
    const targetModel = fkMap.get(field.name)!;
    return `${toPascalCase(targetModel)}Id`;
  }

  // PRIORITY 3: Handle String type with UUID detection (non-FK UUIDs)
  if (field.type === 'String' && isUuidField(field)) {
    return 'Schema.UUID';
  }

  // PRIORITY 4: Handle scalar types with const assertion lookup
  const scalarType = PRISMA_SCALAR_MAP[field.type as keyof typeof PRISMA_SCALAR_MAP];
  if (scalarType) {
    return scalarType;
  }

  // PRIORITY 5: Check if it's an enum
  const enumDef = dmmf.datamodel.enums.find((e) => e.name === field.type);
  if (enumDef) {
    // PascalCase name IS the Schema now (not raw enum)
    return toPascalCase(field.type);
  }

  // PRIORITY 6: Fallback to Unknown
  return 'Schema.Unknown';
}

/**
 * Build complete field type with array and optional wrapping
 *
 * @param field - The Prisma field to build type for
 * @param dmmf - The full DMMF document for enum lookups
 * @param fkMap - Optional FK field → target model mapping for branded FK types
 */
export function buildFieldType(
  field: DMMF.Field,
  dmmf: DMMF.Document,
  fkMap?: Map<string, string>
) {
  let baseType = mapFieldToEffectType(field, dmmf, fkMap);

  // Handle arrays
  if (isListField(field)) {
    baseType = `Schema.Array(${baseType})`;
  }

  // Handle nullable fields - wrap with NullOr regardless of default value
  // This ensures SELECT type correctly allows null values (e.g., Boolean? @default(false))
  if (!isRequiredField(field)) {
    baseType = `Schema.NullOr(${baseType})`;
  }

  return baseType;
}
