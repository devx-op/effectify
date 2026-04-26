import type * as Resumability from "../resumability.js"
export declare const contractVersion = 1
export declare const integrityAlgorithm = "sha256"
export declare const makeExecutableRef: (modulePath: string, exportName: string) => Resumability.ExecutableRef
export declare const createContract: (
  draft: Resumability.ContractDraft,
) => Promise<Resumability.LoomResumabilityContract>
export declare const encodeContract: (contract: Resumability.LoomResumabilityContract) => string
export declare const validateContract: (
  value: unknown,
  options?: Resumability.ContractValidationOptions,
) => Promise<Resumability.ContractValidationResult>
export declare const decodeContract: (
  json: string,
  options?: Resumability.ContractValidationOptions,
) => Promise<Resumability.ContractValidationResult>
export declare const executableRefPattern: RegExp
export declare const isStableExecutableRef: (value: unknown) => value is string
