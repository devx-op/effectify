import type { DMMF } from '@prisma/generator-helper';
import type { JoinTableInfo } from '../prisma/relation.js';
import { generateDBInterface as generateDBInterfaceHelper } from './type.js';

/**
 * Generate DB interface for all models and join tables
 */
export const generateDBInterface = (models: readonly DMMF.Model[], joinTables: JoinTableInfo[] = []) => {
  return generateDBInterfaceHelper(models, joinTables);
}

/**
 * Generate index.ts re-export file
 * Only exports from enums if there are enums to avoid unnecessary imports
 */
export const generateIndexFile = (hasEnums: boolean = true) => {
  if (hasEnums) {
    return `export * from "./enums.js";\nexport * from "./types.js";`;
  } else {
    return `export * from "./types.js";`;
  }
}
