import type { DMMF } from "@prisma/generator-helper"
import * as PrismaEnum from "./enum.js"
import { detectImplicitManyToMany } from "./relation.js"
import * as PrismaType from "./type.js"

/**
 * Get all enums from DMMF
 */
export const getEnums = (dmmf: DMMF.Document) => {
  return PrismaEnum.extractEnums(dmmf)
}

/**
 * Get all models from DMMF (filtered and sorted)
 */
export const getModels = (dmmf: DMMF.Document) => {
  const filtered = PrismaType.filterInternalModels(dmmf.datamodel.models)
  return PrismaType.sortModels(filtered)
}

/**
 * Get schema fields for a model (filtered and sorted)
 */
export const getModelFields = (model: DMMF.Model) => {
  const filtered = PrismaType.filterSchemaFields(model.fields)
  return PrismaType.sortFields(filtered)
}

/**
 * Get implicit many-to-many join tables
 */
export const getManyToManyJoinTables = (dmmf: DMMF.Document) => {
  return detectImplicitManyToMany(dmmf.datamodel.models)
}
