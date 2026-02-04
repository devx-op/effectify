import type { DMMF } from "@prisma/generator-helper"
import type { JoinTableInfo } from "../prisma/relation.js"
import { isUuidField } from "../prisma/type.js"
import { toPascalCase, toSnakeCase } from "../utils/naming.js"

export function prepareJoinTableData(joinTable: JoinTableInfo, dmmf: DMMF.Document) {
  const { tableName, relationName, modelA, modelB } = joinTable

  const columnAFieldName = `${toSnakeCase(modelA)}_id`
  const columnBFieldName = `${toSnakeCase(modelB)}_id`

  const modelADef = dmmf.datamodel.models.find((m) => m.name === modelA)
  const modelBDef = dmmf.datamodel.models.find((m) => m.name === modelB)

  const modelAIdField = modelADef?.fields.find((f) => f.isId)
  const modelBIdField = modelBDef?.fields.find((f) => f.isId)

  const modelABaseType = modelAIdField && isUuidField(modelAIdField) ? "Schema.UUID" : "Schema.String"
  const modelBBaseType = modelBIdField && isUuidField(modelBIdField) ? "Schema.UUID" : "Schema.String"

  const modelASchemaType = modelAIdField?.type === "Int" ? "Schema.Number" : modelABaseType
  const modelBSchemaType = modelBIdField?.type === "Int" ? "Schema.Number" : modelBBaseType

  const columnAField =
    `  ${columnAFieldName}: Schema.propertySignature(columnType(${modelASchemaType}, Schema.Never, Schema.Never)).pipe(Schema.fromKey("A"))`
  const columnBField =
    `  ${columnBFieldName}: Schema.propertySignature(columnType(${modelBSchemaType}, Schema.Never, Schema.Never)).pipe(Schema.fromKey("B"))`

  const pascalName = toPascalCase(relationName)

  return {
    tableName,
    modelA,
    modelB,
    columnAFieldName,
    columnBFieldName,
    name: pascalName,
    columnAField,
    columnBField,
  }
}
