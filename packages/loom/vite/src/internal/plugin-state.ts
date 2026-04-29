import type * as Loom from "@effectify/loom"

export const defaultLoomBuildId = "loom-dev"
export const defaultLoomClientEntry = "/src/entry-browser.ts"
export const defaultLoomPayloadElementId = "__loom_payload__"
export const defaultLoomRootId = "loom-root"

export type LoomResumabilityPayload = Loom.Resumability.LoomResumabilityContract
export type LoomActivationPayload = LoomResumabilityPayload

export interface LoomViteOptions {
  readonly buildId?: string
  readonly root?: string
  readonly rootId?: string
  readonly clientEntry?: string
  readonly payloadElementId?: string
}

export interface ResolvedLoomViteOptions {
  readonly buildId: string
  readonly clientEntry: string
  readonly payloadElementId: string
  readonly rootId: string
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
  buildId: normalizeOptionalString(options.buildId) ?? defaultLoomBuildId,
  clientEntry: normalizeOptionalString(options.clientEntry) ?? defaultLoomClientEntry,
  payloadElementId: normalizeOptionalString(options.payloadElementId) ?? defaultLoomPayloadElementId,
  rootId: normalizeOptionalString(options.rootId) ?? normalizeOptionalString(options.root) ?? defaultLoomRootId,
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
    enabled: true,
    options: normalized,
  }
}
