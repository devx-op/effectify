import type { DMMF } from '@prisma/generator-helper';

/**
 * @customType Annotation Parser
 *
 * Allows overriding Effect Schema types for Prisma-supported fields.
 *
 * WORKS FOR: Prisma scalar types (String, Int, Boolean, DateTime, etc.)
 *
 * USE CASES:
 *   // Email validation for String field
 *   /// @customType(Schema.String.pipe(Schema.email()))
 *   email String
 *
 *   // Positive number constraint for Int field
 *   /// @customType(Schema.Number.pipe(Schema.positive()))
 *   age Int
 *
 *   // Custom branded type
 *   /// @customType(Schema.String.pipe(Schema.brand('UserId')))
 *   userId String
 *
 * @param field - Prisma DMMF field
 * @returns Extracted type string or null if no annotation found
 */
export function extractEffectTypeOverride(field: DMMF.Field) {
  if (!field.documentation) return null;

  // Match @customType annotation - handle balanced parentheses
  const annotationMatch = field.documentation.match(/@customType\s*\(/);
  if (!annotationMatch) return null;

  // Find the matching closing parenthesis
  const startIdx = field.documentation.indexOf('@customType(') + '@customType('.length;
  let parenCount = 1;
  let endIdx = startIdx;

  for (let i = startIdx; i < field.documentation.length && parenCount > 0; i++) {
    if (field.documentation[i] === '(') parenCount++;
    if (field.documentation[i] === ')') parenCount--;
    if (parenCount === 0) {
      endIdx = i;
      break;
    }
  }

  if (parenCount !== 0) {
    return null;
  }

  const typeStr = field.documentation.substring(startIdx, endIdx).trim();

  // Validate it's either a custom type or starts with Schema.
  if (!(typeStr.startsWith('Schema.') || isCustomType(typeStr))) {
    return null;
  }

  return typeStr;
}

/**
 * Check if type string is a custom type reference
 *
 * Custom types are PascalCase identifiers without dots:
 * - Valid: Vector1536, JSONBType, CustomEnum
 * - Invalid: Schema.String, some.nested.type
 *
 * @param typeStr - Type string to check
 * @returns true if it's a custom type reference
 */
function isCustomType(typeStr: string) {
  return /^[A-Z][A-Za-z0-9]*$/.test(typeStr);
}

/**
 * Check if field has any custom type annotations
 *
 * @param fields - Array of Prisma fields
 * @returns true if any field uses custom types in @effectType
 */
export function hasCustomTypeAnnotations(fields: readonly DMMF.Field[]) {
  return fields.some((field) => {
    const override = extractEffectTypeOverride(field);
    return override && isCustomType(override);
  });
}
