import type * as Resumability from "../resumability.js"

const executableRefSeparator = "#"

type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

type NormalizedPayload = Omit<Resumability.LoomResumabilityContract, "integrity">

export const contractVersion = 1

export const integrityAlgorithm = "sha256"

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0

const isExecutableRef = (value: unknown): value is Resumability.ExecutableRef => {
  if (!isNonEmptyString(value)) {
    return false
  }

  const separatorIndex = value.indexOf(executableRefSeparator)

  return separatorIndex > 0 && separatorIndex < value.length - 1
}

const sortObject = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(sortObject)
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortObject(entry)]),
    )
  }

  return value
}

const toJsonValue = (value: unknown, path: string): { readonly ok: true; readonly value: JsonValue } | {
  readonly ok: false
  readonly issue: Resumability.ContractValidationIssue
} => {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return { ok: true, value }
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return { ok: true, value }
    }

    return {
      ok: false,
      issue: {
        path,
        reason: "non-serializable-state",
        message: "Expected a finite JSON number.",
      },
    }
  }

  if (Array.isArray(value)) {
    const items: Array<JsonValue> = []

    for (const [index, entry] of value.entries()) {
      const normalized = toJsonValue(entry, `${path}[${index}]`)

      if (!normalized.ok) {
        return normalized
      }

      items.push(normalized.value)
    }

    return { ok: true, value: items }
  }

  if (isRecord(value)) {
    const entries: Record<string, JsonValue> = {}

    for (const [key, entry] of Object.entries(value)) {
      const normalized = toJsonValue(entry, path.length === 0 ? key : `${path}.${key}`)

      if (!normalized.ok) {
        return normalized
      }

      entries[key] = normalized.value
    }

    return { ok: true, value: entries }
  }

  return {
    ok: false,
    issue: {
      path,
      reason: "non-serializable-state",
      message: "Expected a JSON-serializable value.",
    },
  }
}

const sortBoundaries = (
  boundaries: ReadonlyArray<Resumability.BoundaryDescriptor>,
): ReadonlyArray<Resumability.BoundaryDescriptor> => {
  return [...boundaries]
    .map((boundary) => ({
      id: boundary.id,
      strategy: boundary.strategy,
      nodeIds: [...boundary.nodeIds].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

const sortHandlers = (
  handlers: ReadonlyArray<Resumability.HandlerDescriptor>,
): ReadonlyArray<Resumability.HandlerDescriptor> => {
  return [...handlers]
    .map((handler) => ({
      ref: handler.ref,
      boundaryId: handler.boundaryId,
      nodeId: handler.nodeId,
      event: handler.event,
      mode: handler.mode,
    }))
    .sort((left, right) =>
      `${left.boundaryId}:${left.nodeId}:${left.event}:${left.ref}`.localeCompare(
        `${right.boundaryId}:${right.nodeId}:${right.event}:${right.ref}`,
      )
    )
}

const sortLiveRegions = (
  liveRegions: ReadonlyArray<Resumability.LiveRegionDescriptor>,
): ReadonlyArray<Resumability.LiveRegionDescriptor> => {
  return [...liveRegions]
    .map((liveRegion) => ({
      id: liveRegion.id,
      boundaryId: liveRegion.boundaryId,
      ref: liveRegion.ref,
      atomKey: liveRegion.atomKey,
      startMarker: liveRegion.startMarker,
      endMarker: liveRegion.endMarker,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

const sortDeferred = (
  deferred: ReadonlyArray<Resumability.DeferredDescriptor>,
): ReadonlyArray<Resumability.DeferredDescriptor> => {
  return [...deferred]
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      reason: entry.reason,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

const normalizeDehydratedAtoms = (
  dehydratedAtoms: ReadonlyArray<unknown>,
): ReadonlyArray<unknown> => {
  const normalized: Array<unknown> = []

  for (const [index, entry] of dehydratedAtoms.entries()) {
    const jsonValue = toJsonValue(entry, `state.dehydratedAtoms[${index}]`)

    if (!jsonValue.ok) {
      throw new TypeError(jsonValue.issue.message)
    }

    normalized.push(sortObject(jsonValue.value))
  }

  return normalized
}

const normalizePayload = (draft: Resumability.ContractDraft): NormalizedPayload => ({
  version: contractVersion,
  buildId: draft.buildId,
  rootId: draft.rootId,
  boundaries: sortBoundaries(draft.boundaries),
  handlers: sortHandlers(draft.handlers),
  liveRegions: sortLiveRegions(draft.liveRegions),
  state: {
    dehydratedAtoms: normalizeDehydratedAtoms(draft.state.dehydratedAtoms),
    deferred: sortDeferred(draft.state.deferred),
  },
})

const digestPayload = async (payload: string): Promise<string> => {
  const subtle = globalThis.crypto?.subtle

  if (subtle === undefined) {
    throw new TypeError("Web Crypto is required to hash Loom resumability payloads.")
  }

  const bytes = new TextEncoder().encode(payload)
  const hash = await subtle.digest("SHA-256", bytes)

  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, "0")).join("")
}

const encodeJson = (value: JsonValue): string => JSON.stringify(sortObject(value))

const encodeUnknownJson = (value: unknown): string => {
  const normalized = toJsonValue(value, "$")

  if (!normalized.ok) {
    throw new TypeError(normalized.issue.message)
  }

  return encodeJson(normalized.value)
}

const readString = (
  value: unknown,
  path: string,
  issues: Array<Resumability.ContractValidationIssue>,
): string | undefined => {
  if (!isNonEmptyString(value)) {
    issues.push({
      path,
      reason: "missing-field",
      message: `Expected ${path} to be a non-empty string.`,
    })
    return undefined
  }

  return value
}

const readExecutableRef = (
  value: unknown,
  path: string,
  issues: Array<Resumability.ContractValidationIssue>,
): Resumability.ExecutableRef | undefined => {
  if (!isExecutableRef(value)) {
    issues.push({
      path,
      reason: "missing-field",
      message: `Expected ${path} to be a stable executable ref (<module>#<export>).`,
    })
    return undefined
  }

  return value
}

const readBoundaries = (
  value: unknown,
  issues: Array<Resumability.ContractValidationIssue>,
): ReadonlyArray<Resumability.BoundaryDescriptor> | undefined => {
  if (!Array.isArray(value)) {
    issues.push({
      path: "boundaries",
      reason: "missing-field",
      message: "Expected boundaries to be an array.",
    })
    return undefined
  }

  const boundaries: Array<Resumability.BoundaryDescriptor> = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      issues.push({
        path: `boundaries[${index}]`,
        reason: "missing-field",
        message: "Expected a boundary descriptor object.",
      })
      continue
    }

    const id = readString(entry.id, `boundaries[${index}].id`, issues)
    const strategy = readString(entry.strategy, `boundaries[${index}].strategy`, issues)
    const nodeIdsValue = entry.nodeIds

    if (!Array.isArray(nodeIdsValue)) {
      issues.push({
        path: `boundaries[${index}].nodeIds`,
        reason: "missing-field",
        message: "Expected boundary nodeIds to be an array.",
      })
      continue
    }

    const nodeIds = nodeIdsValue.flatMap((nodeId, nodeIndex) => {
      const normalized = readString(nodeId, `boundaries[${index}].nodeIds[${nodeIndex}]`, issues)
      return normalized === undefined ? [] : [normalized]
    })

    if (id !== undefined && strategy !== undefined) {
      boundaries.push({ id, strategy, nodeIds })
    }
  }

  return issues.length > 0 ? undefined : sortBoundaries(boundaries)
}

const readHandlers = (
  value: unknown,
  issues: Array<Resumability.ContractValidationIssue>,
): ReadonlyArray<Resumability.HandlerDescriptor> | undefined => {
  if (!Array.isArray(value)) {
    issues.push({
      path: "handlers",
      reason: "missing-field",
      message: "Expected handlers to be an array.",
    })
    return undefined
  }

  const handlers: Array<Resumability.HandlerDescriptor> = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      issues.push({
        path: `handlers[${index}]`,
        reason: "missing-field",
        message: "Expected a handler descriptor object.",
      })
      continue
    }

    const ref = readExecutableRef(entry.ref, `handlers[${index}].ref`, issues)
    const boundaryId = readString(entry.boundaryId, `handlers[${index}].boundaryId`, issues)
    const nodeId = readString(entry.nodeId, `handlers[${index}].nodeId`, issues)
    const event = readString(entry.event, `handlers[${index}].event`, issues)
    const mode = entry.mode === "effect" || entry.mode === "contextual"
      ? entry.mode
      : undefined

    if (mode === undefined) {
      issues.push({
        path: `handlers[${index}].mode`,
        reason: "missing-field",
        message: "Expected handler mode to be 'effect' or 'contextual'.",
      })
    }

    if (
      ref !== undefined && boundaryId !== undefined && nodeId !== undefined && event !== undefined && mode !== undefined
    ) {
      handlers.push({ ref, boundaryId, nodeId, event, mode })
    }
  }

  return issues.length > 0 ? undefined : sortHandlers(handlers)
}

const readLiveRegions = (
  value: unknown,
  issues: Array<Resumability.ContractValidationIssue>,
): ReadonlyArray<Resumability.LiveRegionDescriptor> | undefined => {
  if (!Array.isArray(value)) {
    issues.push({
      path: "liveRegions",
      reason: "missing-field",
      message: "Expected liveRegions to be an array.",
    })
    return undefined
  }

  const liveRegions: Array<Resumability.LiveRegionDescriptor> = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      issues.push({
        path: `liveRegions[${index}]`,
        reason: "missing-field",
        message: "Expected a live-region descriptor object.",
      })
      continue
    }

    const id = readString(entry.id, `liveRegions[${index}].id`, issues)
    const boundaryId = entry.boundaryId === undefined
      ? undefined
      : readString(entry.boundaryId, `liveRegions[${index}].boundaryId`, issues)
    const ref = readExecutableRef(entry.ref, `liveRegions[${index}].ref`, issues)
    const atomKey = readString(entry.atomKey, `liveRegions[${index}].atomKey`, issues)
    const startMarker = readString(entry.startMarker, `liveRegions[${index}].startMarker`, issues)
    const endMarker = readString(entry.endMarker, `liveRegions[${index}].endMarker`, issues)

    if (
      id !== undefined && ref !== undefined && atomKey !== undefined && startMarker !== undefined &&
      endMarker !== undefined
    ) {
      liveRegions.push({ id, boundaryId, ref, atomKey, startMarker, endMarker })
    }
  }

  return issues.length > 0 ? undefined : sortLiveRegions(liveRegions)
}

const readDeferred = (
  value: unknown,
  issues: Array<Resumability.ContractValidationIssue>,
): ReadonlyArray<Resumability.DeferredDescriptor> | undefined => {
  if (!Array.isArray(value)) {
    issues.push({
      path: "state.deferred",
      reason: "missing-field",
      message: "Expected state.deferred to be an array.",
    })
    return undefined
  }

  const deferred: Array<Resumability.DeferredDescriptor> = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      issues.push({
        path: `state.deferred[${index}]`,
        reason: "missing-field",
        message: "Expected a deferred descriptor object.",
      })
      continue
    }

    const id = readString(entry.id, `state.deferred[${index}].id`, issues)
    const kind = entry.kind === "live" ? entry.kind : undefined
    const reason = entry.reason === "activation-pending" ? entry.reason : undefined

    if (kind === undefined) {
      issues.push({
        path: `state.deferred[${index}].kind`,
        reason: "missing-field",
        message: "Expected deferred kind to be 'live'.",
      })
    }

    if (reason === undefined) {
      issues.push({
        path: `state.deferred[${index}].reason`,
        reason: "missing-field",
        message: "Expected deferred reason to be 'activation-pending'.",
      })
    }

    if (id !== undefined && kind !== undefined && reason !== undefined) {
      deferred.push({ id, kind, reason })
    }
  }

  return issues.length > 0 ? undefined : sortDeferred(deferred)
}

const readState = (
  value: unknown,
  issues: Array<Resumability.ContractValidationIssue>,
): Resumability.SerializedState | undefined => {
  if (!isRecord(value)) {
    issues.push({
      path: "state",
      reason: "missing-field",
      message: "Expected state to be an object.",
    })
    return undefined
  }

  const dehydratedAtomsValue = value.dehydratedAtoms
  const deferredValue = readDeferred(value.deferred, issues)

  if (!Array.isArray(dehydratedAtomsValue)) {
    issues.push({
      path: "state.dehydratedAtoms",
      reason: "missing-field",
      message: "Expected state.dehydratedAtoms to be an array.",
    })
    return undefined
  }

  const dehydratedAtoms: Array<unknown> = []

  for (const [index, entry] of dehydratedAtomsValue.entries()) {
    const normalized = toJsonValue(entry, `state.dehydratedAtoms[${index}]`)

    if (!normalized.ok) {
      issues.push(normalized.issue)
      continue
    }

    dehydratedAtoms.push(sortObject(normalized.value))
  }

  if (deferredValue === undefined || issues.length > 0) {
    return undefined
  }

  return {
    dehydratedAtoms,
    deferred: deferredValue,
  }
}

const readIntegrity = (
  value: unknown,
  issues: Array<Resumability.ContractValidationIssue>,
): Resumability.IntegrityDescriptor | undefined => {
  if (!isRecord(value)) {
    issues.push({
      path: "integrity",
      reason: "missing-field",
      message: "Expected integrity to be an object.",
    })
    return undefined
  }

  const algorithm = value.algorithm === integrityAlgorithm ? value.algorithm : undefined
  const payloadHash = readString(value.payloadHash, "integrity.payloadHash", issues)

  if (algorithm === undefined) {
    issues.push({
      path: "integrity.algorithm",
      reason: "missing-field",
      message: `Expected integrity.algorithm to be '${integrityAlgorithm}'.`,
    })
  }

  if (algorithm === undefined || payloadHash === undefined) {
    return undefined
  }

  return {
    algorithm,
    payloadHash,
  }
}

const validateRegistryRefs = (
  contract: Resumability.LoomResumabilityContract,
  registry: Resumability.LocalRegistry,
): ReadonlyArray<Resumability.ContractValidationIssue> => {
  const issues: Array<Resumability.ContractValidationIssue> = []

  for (const [index, handler] of contract.handlers.entries()) {
    if (!registry.handlers.has(handler.ref)) {
      issues.push({
        path: `handlers[${index}].ref`,
        reason: "missing-local-handler-ref",
        message: `No local handler implementation is registered for ${handler.ref}.`,
      })
    }
  }

  for (const [index, liveRegion] of contract.liveRegions.entries()) {
    if (!registry.liveRegions.has(liveRegion.ref)) {
      issues.push({
        path: `liveRegions[${index}].ref`,
        reason: "missing-local-live-region-ref",
        message: `No local live-region renderer is registered for ${liveRegion.ref}.`,
      })
    }
  }

  return issues
}

export const makeExecutableRef = (modulePath: string, exportName: string): Resumability.ExecutableRef => {
  if (!isNonEmptyString(modulePath) || !isNonEmptyString(exportName)) {
    throw new TypeError("Executable refs require both a module path and export name.")
  }

  return `${modulePath}${executableRefSeparator}${exportName}`
}

export const createContract = async (
  draft: Resumability.ContractDraft,
): Promise<Resumability.LoomResumabilityContract> => {
  const payload = normalizePayload(draft)
  const encodedPayload = encodeUnknownJson(payload)
  const payloadHash = await digestPayload(encodedPayload)

  return {
    ...payload,
    integrity: {
      algorithm: integrityAlgorithm,
      payloadHash,
    },
  }
}

export const encodeContract = (contract: Resumability.LoomResumabilityContract): string => {
  return encodeUnknownJson({
    version: contract.version,
    buildId: contract.buildId,
    rootId: contract.rootId,
    boundaries: contract.boundaries,
    handlers: contract.handlers,
    liveRegions: contract.liveRegions,
    state: contract.state,
    integrity: contract.integrity,
  })
}

export const validateContract = async (
  value: unknown,
  options: Resumability.ContractValidationOptions = {},
): Promise<Resumability.ContractValidationResult> => {
  const issues: Array<Resumability.ContractValidationIssue> = []

  if (!isRecord(value)) {
    return {
      status: "invalid",
      issues: [
        {
          path: "$",
          reason: "missing-field",
          message: "Expected a resumability contract object.",
        },
      ],
    }
  }

  const version = value.version

  if (version !== contractVersion) {
    issues.push({
      path: "version",
      reason: "missing-field",
      message: `Expected version to be ${contractVersion}.`,
    })
  }

  const buildId = readString(value.buildId, "buildId", issues)
  const rootId = readString(value.rootId, "rootId", issues)
  const boundaries = readBoundaries(value.boundaries, issues)
  const handlers = readHandlers(value.handlers, issues)
  const liveRegions = readLiveRegions(value.liveRegions, issues)
  const state = readState(value.state, issues)
  const integrity = readIntegrity(value.integrity, issues)

  if (
    issues.length > 0 || buildId === undefined || rootId === undefined || boundaries === undefined ||
    handlers === undefined || liveRegions === undefined || state === undefined || integrity === undefined
  ) {
    return {
      status: "invalid",
      issues,
    }
  }

  const contract: Resumability.LoomResumabilityContract = {
    version: contractVersion,
    buildId,
    rootId,
    boundaries,
    handlers,
    liveRegions,
    state,
    integrity,
  }

  const encodedPayload = encodeUnknownJson({
    version: contract.version,
    buildId: contract.buildId,
    rootId: contract.rootId,
    boundaries: contract.boundaries,
    handlers: contract.handlers,
    liveRegions: contract.liveRegions,
    state: contract.state,
  })
  const payloadHash = await digestPayload(encodedPayload)

  if (payloadHash !== contract.integrity.payloadHash) {
    issues.push({
      path: "integrity.payloadHash",
      reason: "integrity-mismatch",
      message: "Payload integrity hash does not match the serialized contract body.",
    })
  }

  if (options.expectedVersion !== undefined && contract.version !== options.expectedVersion) {
    issues.push({
      path: "version",
      reason: "version-mismatch",
      message: `Expected contract version ${options.expectedVersion} but received ${contract.version}.`,
    })
  }

  if (options.expectedBuildId !== undefined && contract.buildId !== options.expectedBuildId) {
    issues.push({
      path: "buildId",
      reason: "build-id-mismatch",
      message: `Expected buildId ${options.expectedBuildId} but received ${contract.buildId}.`,
    })
  }

  if (issues.length > 0) {
    return {
      status: "invalid",
      issues,
    }
  }

  if (options.registry !== undefined) {
    const registryIssues = validateRegistryRefs(contract, options.registry)

    if (registryIssues.length > 0) {
      return {
        status: "fresh-start",
        contract,
        issues: registryIssues,
      }
    }
  }

  return {
    status: "valid",
    contract,
    issues: [],
  }
}

export const decodeContract = async (
  json: string,
  options?: Resumability.ContractValidationOptions,
): Promise<Resumability.ContractValidationResult> => {
  try {
    const parsed: unknown = JSON.parse(json)
    return validateContract(parsed, options)
  } catch {
    return {
      status: "invalid",
      issues: [
        {
          path: "$",
          reason: "invalid-json",
          message: "Expected resumability payload JSON.",
        },
      ],
    }
  }
}

export const executableRefPattern = new RegExp(
  `^[^${executableRefSeparator}]+\\${executableRefSeparator}[^${executableRefSeparator}]+$`,
)

export const isStableExecutableRef = isExecutableRef
