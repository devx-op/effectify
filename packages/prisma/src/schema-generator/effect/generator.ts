import type { DMMF } from "@prisma/generator-helper"
import { buildKyselyFieldType } from "../kysely/type.js"
import { buildForeignKeyMap } from "../prisma/relation.js"
import { isUuidField } from "../prisma/type.js"
import { generateFileHeader } from "../utils/codegen.js"
import { toPascalCase } from "../utils/naming.js"
import { buildFieldType } from "./type.js"

export const prepareBrandedIdSchemaData = (
  model: DMMF.Model,
  fields: readonly DMMF.Field[],
) => {
  const idField = fields.find((f) => f.isId)
  if (!idField) {
    return null
  }

  const name = toPascalCase(model.name)
  const isUuid = isUuidField(idField)

  let baseType: string
  if (isUuid) {
    // Prisma validates UUIDs at the database level, so we use Schema.String directly
    baseType = "Schema.String"
  } else if (idField.type === "Int") {
    baseType = "Schema.Number.pipe(Schema.positive())"
  } else {
    baseType = "Schema.String"
  }

  return { name, baseType }
}

export const prepareModelSchemaData = (
  dmmf: DMMF.Document,
  model: DMMF.Model,
  fields: readonly DMMF.Field[],
) => {
  const fkMap = buildForeignKeyMap(model, dmmf.datamodel.models)
  const name = toPascalCase(model.name)

  const fieldDefinitions = fields.map((field) => {
    const baseType = buildFieldType(field, dmmf, fkMap)
    const fieldType = buildKyselyFieldType(baseType, field, dmmf, model.name)
    return { name: field.name, type: fieldType }
  })

  return { name, fields: fieldDefinitions }
}

export const prepareTypesHeaderData = (
  dmmf: DMMF.Document,
  hasEnums: boolean,
) => {
  const header = generateFileHeader()
  const enumImports = hasEnums
    ? dmmf.datamodel.enums.map((e) => toPascalCase(e.name)).join(", ")
    : null

  return { header, enumImports }
}
