import type { DMMF } from "@prisma/generator-helper"
import { getEnumValueDbName } from "../prisma/enum.js"
import { generateFileHeader } from "../utils/codegen.js"
import { toPascalCase } from "../utils/naming.js"

export function prepareEnumData(enumDef: DMMF.DatamodelEnum) {
  const schemaName = toPascalCase(enumDef.name)
  const values = enumDef.values
    .map((v) => `"${getEnumValueDbName(v)}"`)
    .join(", ")
  return { name: schemaName, values }
}

export function prepareEnumsData(enums: readonly DMMF.DatamodelEnum[]) {
  if (enums.length === 0) {
    return null
  }
  const header = generateFileHeader()
  const enumItems = enums.map(prepareEnumData)
  return { header, enums: enumItems }
}
