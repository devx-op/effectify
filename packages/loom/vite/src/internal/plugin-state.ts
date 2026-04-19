import type * as Loom from "@effectify/loom"

export const defaultLoomClientEntry = "/src/loom-client.ts"
export const defaultLoomPayloadElementId = "__loom_payload__"

export type LoomResumabilityPayload = Loom.Resumability.LoomResumabilityContract
export type LoomActivationPayload = LoomResumabilityPayload

export interface LoomViteOptions {
  readonly root?: string
  readonly clientEntry?: string
  readonly payloadElementId?: string
}

export interface ResolvedLoomViteOptions {
  readonly root: string | undefined
  readonly clientEntry: string
  readonly payloadElementId: string
}

export interface LoomViteState {
  readonly configRoot: string
  readonly enabled: boolean
  readonly options: ResolvedLoomViteOptions
}

const normalizeOptionalString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim()
  return normalized === "" || normalized === undefined ? undefined : normalized
}

export const normalizeLoomViteOptions = (options: LoomViteOptions = {}): ResolvedLoomViteOptions => ({
  root: normalizeOptionalString(options.root),
  clientEntry: normalizeOptionalString(options.clientEntry) ?? defaultLoomClientEntry,
  payloadElementId: normalizeOptionalString(options.payloadElementId) ?? defaultLoomPayloadElementId,
})

export const resolveLoomViteState = (
  config: {
    readonly root: string
  },
  options: LoomViteOptions = {},
): LoomViteState => {
  const normalized = normalizeLoomViteOptions(options)

  return {
    configRoot: config.root,
    enabled: normalized.root !== undefined,
    options: normalized,
  }
}
