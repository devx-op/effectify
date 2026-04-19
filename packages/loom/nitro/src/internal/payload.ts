import type * as Loom from "@effectify/loom"

export const loomActivationPayloadVersion = 1

export interface LoomActivationPayload {
  readonly version: 1
  readonly rootId: string
  readonly manifest: Loom.Hydration.ActivationManifest
  readonly dehydratedAtoms: Loom.Html.SsrResult["dehydratedAtoms"]
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const isActivationManifest = (value: unknown): value is Loom.Hydration.ActivationManifest => {
  if (!isRecord(value)) {
    return false
  }

  return Array.isArray(value.boundaries) && Array.isArray(value.deferred)
}

const isDehydratedAtoms = (
  value: unknown,
): value is Loom.Html.SsrResult["dehydratedAtoms"] => Array.isArray(value)

const assertJsonSerializable = (value: unknown, path: string): void => {
  if (value === null) {
    return
  }

  switch (typeof value) {
    case "string":
    case "boolean": {
      return
    }
    case "number": {
      if (!Number.isFinite(value)) {
        throw new Error(`Loom activation payload is not JSON serializable at ${path}`)
      }

      return
    }
    case "undefined":
    case "function":
    case "symbol":
    case "bigint": {
      throw new Error(`Loom activation payload is not JSON serializable at ${path}`)
    }
    case "object": {
      if (Array.isArray(value)) {
        for (const [index, entry] of value.entries()) {
          assertJsonSerializable(entry, `${path}[${index}]`)
        }

        return
      }

      if (!isPlainObject(value)) {
        throw new Error(`Loom activation payload is not JSON serializable at ${path}`)
      }

      for (const [key, entry] of Object.entries(value)) {
        if (entry === undefined) {
          continue
        }

        assertJsonSerializable(entry, `${path}.${key}`)
      }

      return
    }
  }
}

export const assertLoomPayloadSerializable = (payload: unknown): LoomActivationPayload => {
  if (!isRecord(payload)) {
    throw new Error("Expected Loom activation payload object")
  }

  const version = payload.version
  const rootId = payload.rootId
  const manifest = payload.manifest
  const dehydratedAtoms = payload.dehydratedAtoms

  if (version !== loomActivationPayloadVersion) {
    throw new Error(`Unsupported Loom activation payload version: ${String(version)}`)
  }

  if (typeof rootId !== "string" || rootId.length === 0) {
    throw new Error("Expected Loom activation payload rootId")
  }

  if (!isActivationManifest(manifest)) {
    throw new Error("Expected Loom activation payload manifest")
  }

  if (!isDehydratedAtoms(dehydratedAtoms)) {
    throw new Error("Expected Loom activation payload dehydratedAtoms")
  }

  const normalized = {
    version: loomActivationPayloadVersion,
    rootId,
    manifest,
    dehydratedAtoms,
  } satisfies LoomActivationPayload

  assertJsonSerializable(normalized, "$")

  return normalized
}

const hasActivationWork = (render: Loom.Html.SsrResult): boolean =>
  render.activation.manifest.boundaries.length > 0 || render.activation.manifest.deferred.length > 0

export const createLoomActivationPayload = (
  rootId: string,
  render: Loom.Html.SsrResult,
): LoomActivationPayload | undefined => {
  if (!hasActivationWork(render)) {
    return undefined
  }

  return assertLoomPayloadSerializable({
    version: loomActivationPayloadVersion,
    rootId,
    manifest: render.activation.manifest,
    dehydratedAtoms: render.dehydratedAtoms,
  })
}

export const encodeLoomActivationPayload = (payload: LoomActivationPayload): string =>
  JSON.stringify(assertLoomPayloadSerializable(payload))

export const decodeLoomActivationPayload = (payload: string): LoomActivationPayload =>
  assertLoomPayloadSerializable(JSON.parse(payload) as unknown)

export const renderLoomPayloadElement = (payload: LoomActivationPayload, elementId: string): string => {
  const encoded = encodeLoomActivationPayload(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

  return `<script type="application/json" id="${elementId}">${encoded}</script>`
}
