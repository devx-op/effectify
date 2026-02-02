import type { DMMF } from '@prisma/generator-helper';
import type { JoinTableInfo } from '../prisma/relation.js';
import { generateDBInterface } from './type.js';

/**
 * Kysely domain generator - orchestrates Kysely integration
 */
export class KyselyGenerator {
  constructor(dmmf: DMMF.Document) {}

  /**
   * Generate index.ts file contentDB interface for all models and join tables
   */
  generateDBInterface(models: readonly DMMF.Model[], joinTables: JoinTableInfo[] = []) {
    return generateDBInterface(models, joinTables);
  }

  /**
   * Generate index.ts re-export file
   * Only exports from enums if there are enums to avoid unnecessary imports
   */
  generateIndexFile(hasEnums: boolean = true) {
    if (hasEnums) {
      return `export * from "./enums.js";\nexport * from "./types.js";`;
    } else {
      return `export * from "./types.js";`;
    }
  }
}
