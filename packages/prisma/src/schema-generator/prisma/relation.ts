import type { DMMF } from '@prisma/generator-helper';
import { isUuidField } from './type.js';

/**
 * Metadata for implicit many-to-many join tables
 */
export interface JoinTableInfo {
  /** Table name in database (e.g., "_CategoryToPost") */
  tableName: string;
  /** Relation name without underscore (e.g., "CategoryToPost") */
  relationName: string;
  /** First model name (alphabetically) */
  modelA: string;
  /** Second model name (alphabetically) */
  modelB: string;
  /** Type of column A (from modelA's ID field) */
  columnAType: string;
  /** Type of column B (from modelB's ID field) */
  columnBType: string;
  /** Whether column A is a UUID */
  columnAIsUuid: boolean;
  /** Whether column B is a UUID */
  columnBIsUuid: boolean;
}

/**
 * Detect if a relation field is part of an implicit many-to-many relation
 * Criteria:
 * - kind === "object" (relation field)
 * - isList === true (many side)
 * - relationFromFields is empty (no foreign key on this side)
 * - relationToFields is empty (no explicit relation table)
 */
function isImplicitManyToManyField(field: DMMF.Field) {
  return (
    field.kind === 'object' &&
    field.isList === true &&
    field.relationFromFields !== undefined &&
    field.relationFromFields.length === 0 &&
    field.relationToFields !== undefined &&
    field.relationToFields.length === 0
  );
}

/**
 * Get the ID field from a model
 * Handles both single @id and composite @@id
 */
export function getModelIdField(model: DMMF.Model) {
  // Try to find single @id field
  const idField = model.fields.find((f) => f.isId === true);
  if (idField) {
    return idField;
  }

  // For composite @@id, get the first field from primaryKey
  if (model.primaryKey && model.primaryKey.fields.length > 0) {
    const firstIdFieldName = model.primaryKey.fields[0];
    const field = model.fields.find((f) => f.name === firstIdFieldName);
    if (field) {
      return field;
    }
  }

  throw new Error(`Model ${model.name} has no ID field (@id or @@id required)`);
}

/**
 * Build FK field → target model mapping for a model
 * Returns map from FK field name to target model name
 *
 * Detection logic: A scalar field is a FK if any relation field
 * in the same model has this field in its `relationFromFields` array.
 *
 * IMPORTANT: Only includes FKs that reference the target model's ID field.
 * FKs to non-ID unique fields (like enums) should use the target field's type,
 * not a branded ID schema.
 *
 * @param model - The model to analyze
 * @param models - All models in the datamodel (for looking up target model ID fields)
 *
 * @example
 * // For Seller model with user_id FK:
 * // fields = [
 * //   { name: "user_id", kind: "scalar", type: "String" },
 * //   { name: "user", kind: "object", type: "User", relationFromFields: ["user_id"], relationToFields: ["id"] }
 * // ]
 * // Returns: Map { "user_id" => "User" }
 *
 * // For Product model with market FK to market.code (enum):
 * // fields = [
 * //   { name: "market", kind: "scalar", type: "MARKET_TYPE" },
 * //   { name: "market_relation", kind: "object", type: "market", relationFromFields: ["market"], relationToFields: ["code"] }
 * // ]
 * // Returns: Map {} (empty - code is not the ID field)
 */
export function buildForeignKeyMap(model: DMMF.Model, models?: readonly DMMF.Model[]) {
  const fkMap = new Map<string, string>();

  // Find all relation fields (kind === "object")
  const relationFields = model.fields.filter((f) => f.kind === 'object');

  for (const relation of relationFields) {
    if (relation.relationFromFields && relation.relationFromFields.length > 0) {
      // Check if this FK references the target model's ID field
      const targetModel = models?.find((m) => m.name === relation.type);
      if (!targetModel) {
        // Can't verify - skip this FK to be safe
        continue;
      }

      // Get target model's ID field name
      let targetIdFieldName: string | undefined;
      const idField = targetModel.fields.find((f) => f.isId === true);
      if (idField) {
        targetIdFieldName = idField.name;
      } else if (targetModel.primaryKey && targetModel.primaryKey.fields.length > 0) {
        targetIdFieldName = targetModel.primaryKey.fields[0];
      }

      if (!targetIdFieldName) {
        // Target model has no ID field - skip
        continue;
      }

      // Check if relationToFields references the ID field
      const refersToIdField =
        relation.relationToFields?.length === 1 &&
        relation.relationToFields[0] === targetIdFieldName;

      if (!refersToIdField) {
        // FK points to non-ID field (e.g., enum) - don't use branded ID
        continue;
      }

      // Map each FK field to the target model
      for (const fkFieldName of relation.relationFromFields) {
        fkMap.set(fkFieldName, relation.type); // relation.type is the target model name
      }
    }
  }

  return fkMap;
}

/**
 * Detect all implicit many-to-many relations from DMMF models
 * Returns metadata for generating join table schemas
 */
export function detectImplicitManyToMany(models: readonly DMMF.Model[]) {
  const joinTables = new Map<string, JoinTableInfo>();

  for (const model of models) {
    const validFields = model.fields.filter((field) => shouldProcessField(field, model, models));

    for (const field of validFields) {
      const relatedModel = models.find((m) => m.name === field.type);
      if (!(relatedModel && isValidImplicitRelation(field, relatedModel))) {
        continue;
      }

      if (!field.relationName || joinTables.has(field.relationName)) {
        continue;
      }

      const joinTableInfo = createJoinTableInfo(field, model, relatedModel, models);
      if (joinTableInfo) {
        joinTables.set(field.relationName, joinTableInfo);
      }
    }
  }

  return Array.from(joinTables.values());
}

function shouldProcessField(field: DMMF.Field, model: DMMF.Model, models: readonly DMMF.Model[]) {
  if (!isImplicitManyToManyField(field)) {
    return false;
  }

  const relatedModel = models.find((m) => m.name === field.type);
  return !!(relatedModel && model.name !== relatedModel.name);
}

function createJoinTableInfo(
  field: DMMF.Field,
  model: DMMF.Model,
  relatedModel: DMMF.Model,
  models: readonly DMMF.Model[]
) {
  const modelNames = [model.name, relatedModel.name].sort();
  const modelA = models.find((m) => m.name === modelNames[0]);
  const modelB = models.find((m) => m.name === modelNames[1]);

  if (!(modelA && modelB)) {
    return null;
  }

  const modelAIdField = getModelIdField(modelA);
  const modelBIdField = getModelIdField(modelB);
  const relationName = field.relationName;

  if (!relationName) {
    return null;
  }

  return {
    tableName: `_${relationName}`,
    relationName,
    modelA: modelNames[0],
    modelB: modelNames[1],
    columnAType: modelAIdField.type,
    columnBType: modelBIdField.type,
    columnAIsUuid: isUuidField(modelAIdField),
    columnBIsUuid: isUuidField(modelBIdField),
  };
}

function isValidImplicitRelation(field: DMMF.Field, relatedModel: DMMF.Model) {
  const relatedField = relatedModel.fields.find(
    (f) => f.relationName === field.relationName && f.isList === true
  );

  return !!(relatedField && isImplicitManyToManyField(relatedField));
}
