import * as Loom from "@effectify/loom"

export type LoomResumabilityPayload = Loom.Resumability.LoomResumabilityContract
export type LoomActivationPayload = LoomResumabilityPayload

export interface LoomResumabilityIdentity {
  readonly buildId: string
  readonly rootId: string
}

export const createLoomResumabilityPayload = async (
  identity: LoomResumabilityIdentity,
  render: Loom.Html.SsrResult,
): Promise<LoomResumabilityPayload | undefined> => {
  const result = await Loom.Resumability.createRenderContract(render, identity)

  return result.status === "ready" ? result.contract : undefined
}

export const encodeLoomResumabilityPayload = (payload: LoomResumabilityPayload): string =>
  Loom.Resumability.encodeContract(payload)

export const decodeLoomResumabilityPayload = (
  payload: string,
  options?: Loom.Resumability.ContractValidationOptions,
): Promise<Loom.Resumability.ContractValidationResult> => Loom.Resumability.decodeContract(payload, options)

export const renderLoomPayloadElement = (payload: LoomResumabilityPayload, elementId: string): string => {
  const encoded = encodeLoomResumabilityPayload(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

  return `<script type="application/json" id="${elementId}">${encoded}</script>`
}

export const createLoomActivationPayload = (
  rootId: string,
  render: Loom.Html.SsrResult,
): Promise<LoomActivationPayload | undefined> => createLoomResumabilityPayload({ buildId: "loom-dev", rootId }, render)

export const encodeLoomActivationPayload = encodeLoomResumabilityPayload

export const decodeLoomActivationPayload = decodeLoomResumabilityPayload
