import type { DMMF } from "@prisma/generator-helper"
import type { JoinTableInfo } from "../prisma/relation.js"
import { getFieldDbName, hasDefaultValue, isIdField } from "../prisma/type.js"
import { toPascalCase } from "../utils/naming.js"

export function needsColumnType(field: DMMF.Field) {
  return hasDefaultValue(field) && isIdField(field)
}

export function isEnumField(field: DMMF.Field, dmmf: DMMF.Document) {
  return dmmf.datamodel.enums.some((e: any) => e.name === field.type)
}

export function needsGenerated(field: DMMF.Field, dmmf: DMMF.Document) {
  return hasDefaultValue(field) && !isIdField(field) && !isEnumField(field, dmmf)
}

export function applyKyselyHelpers(fieldType: string, field: DMMF.Field, dmmf: DMMF.Document, modelName?: string) {
  if (needsColumnType(field)) {
    const idType = modelName ? `${toPascalCase(modelName)}Id` : fieldType
    return `generated(${idType})`
  } else if (needsGenerated(field, dmmf)) {
    return `generated(${fieldType})`
  }
  return fieldType
}

export function applyMapDirective(fieldType: string, field: DMMF.Field) {
  const dbName = getFieldDbName(field)
  if (field.dbName && field.dbName !== field.name) {
    return `Schema.propertySignature(${fieldType}).pipe(Schema.fromKey("${dbName}"))`
  }
  return fieldType
}

export function buildKyselyFieldType(
  baseFieldType: string,
  field: DMMF.Field,
  dmmf: DMMF.Document,
  modelName?: string,
) {
  let fieldType = applyKyselyHelpers(baseFieldType, field, dmmf, modelName)
  fieldType = applyMapDirective(fieldType, field)
  return fieldType
}

export function prepareDBInterfaceData(
  models: readonly DMMF.Model[],
  joinTables: JoinTableInfo[] = [],
) {
  const modelEntries = models.map((m) => ({
    tableName: m.dbName || m.name,
    typeName: toPascalCase(m.name),
  }))

  const joinTableEntries = joinTables.map((jt) => ({
    tableName: jt.tableName,
    typeName: toPascalCase(jt.relationName),
  }))

  return { models: [...modelEntries, ...joinTableEntries] }
}
