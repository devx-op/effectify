import type { DMMF } from '@prisma/generator-helper';
import * as PrismaEnum from './enum.js';
import { detectImplicitManyToMany } from './relation.js';
import * as PrismaType from './type.js';

/**
 * Prisma domain generator - orchestrates DMMF parsing and extraction
 * No schema generation here, just native Prisma data extraction
 */
export class PrismaGenerator {
  constructor(private readonly dmmf: DMMF.Document) {}

  /**
   * Get all enums from DMMF
   */
  getEnums() {
    return PrismaEnum.extractEnums(this.dmmf);
  }

  /**
   * Get all models from DMMF (filtered and sorted)
   */
  getModels() {
    const filtered = PrismaType.filterInternalModels(this.dmmf.datamodel.models);
    return PrismaType.sortModels(filtered);
  }

  /**
   * Get schema fields for a model (filtered and sorted)
   */
  getModelFields(model: DMMF.Model) {
    const filtered = PrismaType.filterSchemaFields(model.fields);
    return PrismaType.sortFields(filtered);
  }

  /**
   * Get implicit many-to-many join tables
   */
  getManyToManyJoinTables() {
    return detectImplicitManyToMany(this.dmmf.datamodel.models);
  }
}
