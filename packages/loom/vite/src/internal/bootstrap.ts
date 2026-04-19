import * as Loom from "@effectify/loom"
import {
  makeFreshStartDiagnostics,
  makeMissingPayloadDiagnostics,
  makeMissingRootDiagnostics,
  summarizeDiagnostics,
} from "./diagnostics.js"
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
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
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
  const payloadElementId = options.payloadElementId ?? defaultLoomPayloadElementId
  const payloadElement = readPayloadElement(document, payloadElementId)
  const serializedPayload = payloadElement?.textContent?.trim()

  if (serializedPayload === undefined || serializedPayload === "") {
    const diagnostics = makeMissingPayloadDiagnostics(payloadElementId)

    return {
      status: "missing-payload",
      diagnostics,
      diagnosticSummary: summarizeDiagnostics(diagnostics),
    }
  }

  const validation = await Loom.Resumability.decodeContract(serializedPayload, {
    expectedBuildId: options.expectedBuildId,
    registry: options.localRegistry,
  })

  if (validation.status === "invalid") {
    const diagnostics = makeFreshStartDiagnostics({
      payloadElementId,
      rootId: validation.contract?.rootId,
      validationStatus: validation.status,
      issueCount: validation.issues.length,
    })

    return {
      status: "fresh-start",
      validation,
      diagnostics,
      diagnosticSummary: summarizeDiagnostics(diagnostics),
    }
  }

  const payload = validation.contract
  const root = document.getElementById(payload.rootId)

  if (root === null) {
    const diagnostics = makeMissingRootDiagnostics({
      payloadElementId,
      rootId: payload.rootId,
      validationStatus: validation.status,
    })

    return {
      status: "missing-root",
      payload,
      validation,
      diagnostics,
      diagnosticSummary: summarizeDiagnostics(diagnostics),
    }
  }

  if (validation.status === "fresh-start" || options.localRegistry === undefined) {
    const diagnostics = makeFreshStartDiagnostics({
      payloadElementId,
      rootId: payload.rootId,
      validationStatus: validation.status,
      issueCount: validation.issues.length,
    })

    return {
      status: "fresh-start",
      payload,
      validation,
      diagnostics,
      diagnosticSummary: summarizeDiagnostics(diagnostics),
    }
  }

  const activation = Loom.Hydration.activate(root, { contract: payload, localRegistry: options.localRegistry }, {
    registry: options.registry,
    onEffect: options.onEffect,
  })

  return {
    status: "resumed",
    payload,
    validation,
    activation,
    diagnostics: activation.diagnostics,
    diagnosticSummary: activation.diagnosticSummary,
  }
}
