import type { DMMF } from "@prisma/generator-helper"
import type { JoinTableInfo } from "../prisma/relation.js"
import { prepareDBInterfaceData as prepareDBInterfaceDataHelper } from "./type.js"

export const prepareDBInterfaceData = (models: readonly DMMF.Model[], joinTables: JoinTableInfo[] = []) => {
  return prepareDBInterfaceDataHelper(models, joinTables)
}

export const prepareIndexData = (hasEnums: boolean = true) => {
  return { hasEnums }
}
