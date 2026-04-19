import { Hydration } from "@effectify/loom"
import { defaultLoomPayloadElementId, type LoomActivationPayload } from "./plugin-state.js"

export interface LoomBootstrapOptions extends Hydration.ActivationOptions {
  readonly payloadElementId?: string
}

export type LoomBootstrapStatus = "activated" | "missing-payload" | "missing-root"

export interface LoomBootstrapResult {
  readonly status: LoomBootstrapStatus
  readonly payload?: LoomActivationPayload
  readonly activation?: Hydration.ActivationResult
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isActivationManifest = (value: unknown): value is LoomActivationPayload["manifest"] => {
  if (!isRecord(value)) {
    return false
  }

  return Array.isArray(value.boundaries) && Array.isArray(value.deferred)
}

const assertLoomActivationPayload = (value: unknown): LoomActivationPayload => {
  if (!isRecord(value)) {
    throw new Error("Expected Loom activation payload object")
  }

  const version = value.version
  const rootId = value.rootId
  const manifest = value.manifest
  const dehydratedAtoms = value.dehydratedAtoms

  if (version !== 1) {
    throw new Error(`Unsupported Loom activation payload version: ${String(version)}`)
  }

  if (typeof rootId !== "string" || rootId.length === 0) {
    throw new Error("Expected Loom activation payload rootId")
  }

  if (!isActivationManifest(manifest)) {
    throw new Error("Expected Loom activation payload manifest")
  }

  if (!Array.isArray(dehydratedAtoms)) {
    throw new Error("Expected Loom activation payload dehydratedAtoms")
  }

  return {
    version: 1,
    rootId,
    manifest,
    dehydratedAtoms,
  }
}

const readPayloadElement = (document: Document, payloadElementId: string): HTMLScriptElement | undefined => {
  const element = document.getElementById(payloadElementId)
  return element instanceof HTMLScriptElement ? element : undefined
}

const decodeLoomActivationPayload = (payload: string): LoomActivationPayload =>
  assertLoomActivationPayload(JSON.parse(payload) as unknown)

export const bootstrapLoomBrowser = (
  document: Document,
  options: LoomBootstrapOptions = {},
): LoomBootstrapResult => {
  const payloadElement = readPayloadElement(document, options.payloadElementId ?? defaultLoomPayloadElementId)
  const serializedPayload = payloadElement?.textContent?.trim()

  if (serializedPayload === undefined || serializedPayload === "") {
    return {
      status: "missing-payload",
    }
  }

  const payload = decodeLoomActivationPayload(serializedPayload)
  const root = document.getElementById(payload.rootId)

  if (root === null) {
    return {
      status: "missing-root",
      payload,
    }
  }

  return {
    status: "activated",
    payload,
    activation: Hydration.activate(root, { manifest: payload.manifest, handlers: {} }, {
      dehydratedState: payload.dehydratedAtoms,
      registry: options.registry,
      onEffect: options.onEffect,
    }),
  }
}
