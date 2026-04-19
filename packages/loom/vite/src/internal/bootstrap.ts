import * as Loom from "@effectify/loom"
import { defaultLoomPayloadElementId, type LoomResumabilityPayload } from "./plugin-state.js"

export interface LoomBootstrapOptions extends Loom.Hydration.ActivationOptions {
  readonly payloadElementId?: string
  readonly expectedBuildId?: string
  readonly localRegistry?: Loom.Resumability.LocalRegistry
}

export type LoomBootstrapStatus = "resumed" | "fresh-start" | "missing-payload" | "missing-root"

export interface LoomBootstrapResult {
  readonly status: LoomBootstrapStatus
  readonly payload?: LoomResumabilityPayload
  readonly validation?: Loom.Resumability.ContractValidationResult
  readonly activation?: Loom.Hydration.ActivationResult
}

type ScriptLikeElement = Element & {
  readonly textContent: string | null
}

const readPayloadElement = (document: Document, payloadElementId: string): ScriptLikeElement | undefined => {
  const element = document.getElementById(payloadElementId)

  if (element === null || element.tagName !== "SCRIPT") {
    return undefined
  }

  return element
}

export const bootstrapLoomBrowser = async (
  document: Document,
  options: LoomBootstrapOptions = {},
): Promise<LoomBootstrapResult> => {
  const payloadElement = readPayloadElement(document, options.payloadElementId ?? defaultLoomPayloadElementId)
  const serializedPayload = payloadElement?.textContent?.trim()

  if (serializedPayload === undefined || serializedPayload === "") {
    return {
      status: "missing-payload",
    }
  }

  const validation = await Loom.Resumability.decodeContract(serializedPayload, {
    expectedBuildId: options.expectedBuildId,
    registry: options.localRegistry,
  })

  if (validation.status === "invalid") {
    return {
      status: "fresh-start",
      validation,
    }
  }

  const payload = validation.contract
  const root = document.getElementById(payload.rootId)

  if (root === null) {
    return {
      status: "missing-root",
      payload,
      validation,
    }
  }

  if (validation.status === "fresh-start" || options.localRegistry === undefined) {
    return {
      status: "fresh-start",
      payload,
      validation,
    }
  }

  return {
    status: "resumed",
    payload,
    validation,
    activation: Loom.Hydration.activate(root, { contract: payload, localRegistry: options.localRegistry }, {
      registry: options.registry,
      onEffect: options.onEffect,
    }),
  }
}
