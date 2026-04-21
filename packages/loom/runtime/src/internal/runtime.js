import { Atom, AtomRegistry, Hydration as EffectHydration } from "effect/unstable/reactivity"
import * as LoomCore from "@effectify/loom-core"
import * as Diagnostics from "./diagnostics.js"
import * as Hydration from "../hydration.js"
import * as Resumability from "../resumability.js"
import * as LiveRegion from "./live-region.js"
const escapeText = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
const escapeAttribute = (value) =>
  escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
const collectHydrationAttributes = (node) => {
  switch (node._tag) {
    case "Text":
      return []
    case "DynamicText":
      return []
    case "If":
      return collectHydrationAttributes(node.condition() ? node.then : (node.else ?? LoomCore.Ast.fragment([])))
    case "For": {
      const items = Array.from(node.each())
      const nodes = items.length === 0
        ? node.fallback === undefined ? [] : [node.fallback]
        : items.map((item, index) => node.render(item, index))
      return nodes.flatMap(collectHydrationAttributes)
    }
    case "ComponentUse":
      return collectHydrationAttributes(node.component.node)
    case "Live":
      return []
    case "Fragment":
      return node.children.flatMap(collectHydrationAttributes)
    case "Element": {
      const own = node.hydration === undefined ? [] : Object.entries(node.hydration.attributes)
      return [...own, ...node.children.flatMap(collectHydrationAttributes)]
    }
  }
}
const collectRegisteredEvents = (node, boundaryId) => {
  const state = {
    nextNodeId: 0,
  }
  const loop = (current, isBoundaryRoot) => {
    switch (current._tag) {
      case "Text":
        return []
      case "DynamicText":
        return []
      case "If":
        return loop(current.condition() ? current.then : (current.else ?? LoomCore.Ast.fragment([])), isBoundaryRoot)
      case "For": {
        const items = Array.from(current.each())
        const nodes = items.length === 0
          ? current.fallback === undefined ? [] : [current.fallback]
          : items.map((item, index) => current.render(item, index))
        return nodes.flatMap((child) => loop(child, false))
      }
      case "Live":
        return []
      case "ComponentUse":
        return loop(current.component.node, isBoundaryRoot)
      case "Fragment":
        return current.children.flatMap((child) => loop(child, false))
      case "Element": {
        if (!isBoundaryRoot && current.hydration !== undefined) {
          return []
        }
        const nodeId = current.events.length > 0 ? `${boundaryId}.n${state.nextNodeId++}` : undefined
        const own = nodeId === undefined
          ? []
          : current.events.map(({ event, handler, mode, ref }) => ({
            nodeId,
            event,
            mode,
            handler,
            ref,
          }))
        return [...own, ...current.children.flatMap((child) => loop(child, false))]
      }
    }
  }
  return loop(node, true)
}
const serializeAttributes = (attributes) => {
  const entries = Object.entries(attributes)
  if (entries.length === 0) {
    return ""
  }
  return entries.map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("")
}
const commentNodeType = 8
const documentNodeType = 9
const showCommentNodeMask = 128
const isComment = (value) => value?.nodeType === commentNodeType
const isCommentNode = (value) => value?.nodeType === commentNodeType
const findMarkerSibling = (node, marker, direction) => {
  const sibling = direction === "previous" ? node.previousSibling : node.nextSibling
  if (!isComment(sibling)) {
    return undefined
  }
  return sibling.data === marker ? sibling : undefined
}
const createCommentWalker = (root) => {
  const document = root.nodeType === documentNodeType
    ? root
    : root.ownerDocument
  if (document === null) {
    throw new Error("expected ParentNode to have an ownerDocument")
  }
  return document.createTreeWalker(root, showCommentNodeMask)
}
const findCommentMarker = (root, marker) => {
  const walker = createCommentWalker(root)
  let current = walker.nextNode()
  while (current !== null) {
    if (isCommentNode(current) && current.data === marker) {
      return current
    }
    current = walker.nextNode()
  }
  return undefined
}
const replaceOwnedDomRange = (startMarker, endMarker, html) => {
  const parent = endMarker.parentNode
  if (parent === null || startMarker.parentNode !== parent) {
    return
  }
  let current = startMarker.nextSibling
  while (current !== null && current !== endMarker) {
    const next = current.nextSibling
    parent.removeChild(current)
    current = next
  }
  const template = endMarker.ownerDocument.createElement("template")
  template.innerHTML = html
  parent.insertBefore(template.content, endMarker)
}
const isSsrRenderResult = (source) => "plan" in source
const isResumabilityActivationSource = (source) => "contract" in source && "localRegistry" in source
const isReferencedHandler = (value) =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "ReferencedHandler"
const getSerializableAtomKey = (atom) => Atom.isSerializable(atom) ? atom[Atom.SerializableTypeId].key : undefined
const isDehydratedAtom = (value) =>
  typeof value === "object" && value !== null && "~effect/reactivity/DehydratedAtom" in value
const readDehydratedAtoms = (value) => value.flatMap((entry) => isDehydratedAtom(entry) ? [entry] : [])
const serializeNode = (node, state, boundaryId, nextBoundaryNodeId, isBoundaryRoot = false) => {
  const serializeStaticNode = (current) => {
    switch (current._tag) {
      case "Text":
        return escapeText(current.value)
      case "DynamicText":
        return escapeText(String(current.render()))
      case "If":
        return serializeStaticNode(current.condition() ? current.then : (current.else ?? LoomCore.Ast.fragment([])))
      case "For": {
        const items = Array.from(current.each())
        const nodes = items.length === 0
          ? current.fallback === undefined ? [] : [current.fallback]
          : items.map((item, index) => current.render(item, index))
        return nodes.map(serializeStaticNode).join("")
      }
      case "Fragment":
        return current.children.map(serializeStaticNode).join("")
      case "ComponentUse":
        return serializeStaticNode(current.component.node)
      case "Live":
        return serializeLiveNode(current, boundaryId)
      case "Element": {
        const attributes = LiveRegion.stripRuntimeManagedAttributes(current.attributes)
        return `<${current.tagName}${serializeAttributes(attributes)}>${
          current.children.map(serializeStaticNode).join("")
        }</${current.tagName}>`
      }
    }
  }
  const serializeLiveNode = (current, currentBoundaryId) => {
    const liveId = `l${state.nextLiveRegionId++}`
    const rendered = current.render(state.registry.get(current.atom))
    state.liveRegions.push(LiveRegion.makePlan(liveId, currentBoundaryId))
    if (currentBoundaryId !== undefined) {
      state.deferred.push({
        id: liveId,
        kind: "live",
        reason: "activation-pending",
      })
      if (current.ref === undefined) {
        state.resumabilityIssues.push({
          path: `liveRegions[${state.resumableLiveRegions.length}].ref`,
          reason: "missing-live-region-ref",
          message: `Live region ${liveId} requires an explicit resumability ref.`,
        })
      } else {
        const atomKey = getSerializableAtomKey(current.atom)
        if (atomKey === undefined) {
          state.resumabilityIssues.push({
            path: `liveRegions[${state.resumableLiveRegions.length}].atomKey`,
            reason: "non-serializable-live-atom",
            message: `Live region ${liveId} requires a serializable Atom key to resume.`,
          })
        } else {
          state.resumableLiveRegions.push({
            id: liveId,
            boundaryId: currentBoundaryId,
            ref: current.ref,
            atomKey,
            startMarker: LiveRegion.startMarker(liveId),
            endMarker: LiveRegion.endMarker(liveId),
          })
        }
      }
    }
    return LiveRegion.wrapHtml(liveId, serializeStaticNode(rendered))
  }
  switch (node._tag) {
    case "Text":
      return escapeText(node.value)
    case "DynamicText":
      return escapeText(String(node.render()))
    case "If":
      return serializeNode(
        node.condition() ? node.then : (node.else ?? LoomCore.Ast.fragment([])),
        state,
        boundaryId,
        nextBoundaryNodeId,
      )
    case "For": {
      const items = Array.from(node.each())
      const nodes = items.length === 0
        ? node.fallback === undefined ? [] : [node.fallback]
        : items.map((item, index) => node.render(item, index))
      return nodes.map((child) => serializeNode(child, state, boundaryId, nextBoundaryNodeId)).join("")
    }
    case "Fragment":
      return node.children.map((child) => serializeNode(child, state, boundaryId, nextBoundaryNodeId)).join("")
    case "ComponentUse":
      return serializeNode(node.component.node, state, boundaryId, nextBoundaryNodeId, isBoundaryRoot)
    case "Live":
      return serializeLiveNode(node, boundaryId)
    case "Element": {
      if (!isBoundaryRoot && node.hydration !== undefined) {
        return serializeNode(node, state, undefined, undefined, true)
      }
      const attributes = { ...node.attributes }
      const activeBoundaryId = isBoundaryRoot ? `b${state.nextBoundaryId++}` : boundaryId
      const activeBoundaryNodeId = isBoundaryRoot ? { current: 0 } : nextBoundaryNodeId
      let nodeId
      let nodeEventNames = ""
      if (activeBoundaryId !== undefined && activeBoundaryNodeId !== undefined && node.events.length > 0) {
        nodeId = `${activeBoundaryId}.n${activeBoundaryNodeId.current++}`
        nodeEventNames = Hydration.formatEventNames(node.events.map(({ event }) => event))
      }
      if (isBoundaryRoot && activeBoundaryId !== undefined) {
        const eventBindings = collectRegisteredEvents(node, activeBoundaryId)
        const eventNames = Hydration.formatEventNames(eventBindings.map(({ event }) => event))
        attributes[Hydration.boundaryIdAttributeName] = activeBoundaryId
        if (eventNames.length > 0) {
          attributes[Hydration.eventNamesAttributeName] = eventNames
        }
        if (nodeId !== undefined) {
          attributes[Hydration.nodeIdAttributeName] = nodeId
          attributes[Hydration.nodeEventNamesAttributeName] = nodeEventNames
        }
        state.boundaries.push({
          id: activeBoundaryId,
          strategy: node.hydration?.strategy ?? "manual",
          attributes: node.hydration?.attributes ?? {},
          eventBindings,
        })
        const html = `<${node.tagName}${serializeAttributes(attributes)}>${
          node.children
            .map((child) => serializeNode(child, state, activeBoundaryId, activeBoundaryNodeId))
            .join("")
        }</${node.tagName}>`
        return `<!--${Hydration.startMarker(activeBoundaryId)}-->${html}<!--${Hydration.endMarker(activeBoundaryId)}-->`
      }
      if (nodeId !== undefined) {
        attributes[Hydration.nodeIdAttributeName] = nodeId
        attributes[Hydration.nodeEventNamesAttributeName] = nodeEventNames
      }
      return `<${node.tagName}${serializeAttributes(attributes)}>${
        node.children
          .map((child) => serializeNode(child, state, activeBoundaryId, activeBoundaryNodeId))
          .join("")
      }</${node.tagName}>`
    }
  }
}
export const makeEventBinding = (event, handler) => {
  const normalized = isReferencedHandler(handler)
    ? handler
    : {
      handler,
      ref: undefined,
    }
  return {
    _tag: "EventBinding",
    event,
    mode: typeof normalized.handler === "function" ? "contextual" : "effect",
    handler: normalized.handler,
    ref: normalized.ref,
  }
}
export const makeRenderPlan = (root, options) => renderToHtml(root, options).plan
export const renderToHtml = (root, options = {}) => {
  const serializationState = {
    nextBoundaryId: 0,
    nextLiveRegionId: 0,
    boundaries: [],
    liveRegions: [],
    resumableLiveRegions: [],
    resumabilityIssues: [],
    deferred: [],
    registry: options.registry ?? AtomRegistry.make(),
  }
  const html = serializeNode(root, serializationState, undefined, undefined)
  const dehydratedAtoms = EffectHydration.dehydrate(serializationState.registry, options.dehydrate)
  const serializedDehydratedAtoms = EffectHydration.toValues(dehydratedAtoms).map((
    { resultPromise: _resultPromise, ...entry },
  ) => entry)
  const handlers = {}
  let nextHandlerId = 0
  let missingHandlerRefIndex = 0
  for (const boundary of serializationState.boundaries) {
    for (const binding of boundary.eventBindings) {
      if (binding.ref === undefined) {
        serializationState.resumabilityIssues.push({
          path: `handlers[${missingHandlerRefIndex++}].ref`,
          reason: "missing-handler-ref",
          message: `Hydration binding ${binding.event} on ${binding.nodeId} requires an explicit resumability ref.`,
        })
      }
    }
  }
  const activationBoundaries = serializationState.boundaries.map((boundary) => ({
    id: boundary.id,
    strategy: boundary.strategy,
    eventBindings: boundary.eventBindings.map((binding) => {
      const handlerId = `h${nextHandlerId++}`
      handlers[handlerId] = binding.handler
      return {
        nodeId: binding.nodeId,
        event: binding.event,
        mode: binding.mode,
        handlerId,
      }
    }),
  }))
  let resumability
  if (activationBoundaries.length === 0 && serializationState.deferred.length === 0) {
    resumability = {
      status: "none",
      issues: [],
    }
  } else if (serializationState.resumabilityIssues.length > 0) {
    resumability = {
      status: "unsupported",
      issues: serializationState.resumabilityIssues,
    }
  } else {
    resumability = {
      status: "ready",
      draft: {
        boundaries: serializationState.boundaries.map((boundary) => ({
          id: boundary.id,
          strategy: boundary.strategy,
          nodeIds: [...new Set(boundary.eventBindings.map(({ nodeId }) => nodeId))],
        })),
        handlers: serializationState.boundaries.flatMap((boundary) =>
          boundary.eventBindings.flatMap((binding) => {
            if (binding.ref === undefined) {
              return []
            }
            return [
              {
                ref: binding.ref,
                boundaryId: boundary.id,
                nodeId: binding.nodeId,
                event: binding.event,
                mode: binding.mode,
              },
            ]
          })
        ),
        liveRegions: serializationState.resumableLiveRegions,
        state: {
          dehydratedAtoms: serializedDehydratedAtoms,
          deferred: serializationState.deferred,
        },
      },
      issues: [],
    }
  }
  return {
    html,
    plan: {
      root,
      hydrationAttributes: collectHydrationAttributes(root),
      boundaries: serializationState.boundaries,
      liveRegions: serializationState.liveRegions,
      deferred: serializationState.deferred,
    },
    activation: {
      manifest: {
        boundaries: activationBoundaries,
        deferred: serializationState.deferred,
      },
      handlers,
    },
    dehydratedAtoms,
    resumability,
    diagnostics: Diagnostics.fromRenderResumability(resumability),
  }
}
export const createResumabilityContract = async (render, identity) => {
  switch (render.resumability.status) {
    case "none": {
      return {
        status: "none",
        issues: [],
      }
    }
    case "unsupported": {
      return {
        status: "unsupported",
        issues: render.resumability.issues,
      }
    }
    case "ready": {
      const draft = render.resumability.draft
      return {
        status: "ready",
        contract: await Resumability.createContract({
          buildId: identity.buildId,
          rootId: identity.rootId,
          boundaries: draft.boundaries,
          handlers: draft.handlers,
          liveRegions: draft.liveRegions,
          state: draft.state,
        }),
        issues: [],
      }
    }
  }
}
const resolveContractActivationSource = (source) => {
  const handlers = {}
  let nextHandlerId = 0
  return {
    manifest: {
      boundaries: source.contract.boundaries.map((boundary) => ({
        id: boundary.id,
        strategy: boundary.strategy,
        eventBindings: source.contract.handlers
          .filter((handler) => handler.boundaryId === boundary.id)
          .map((handler) => {
            const handlerId = `contract-h${nextHandlerId++}`
            handlers[handlerId] = Resumability.resolveHandler(source.localRegistry, handler.ref)
            return {
              nodeId: handler.nodeId,
              event: handler.event,
              mode: handler.mode,
              handlerId,
            }
          }),
      })),
      deferred: source.contract.state.deferred,
    },
    handlers,
  }
}
const isElement = (value) => "hasAttribute" in value && typeof value.hasAttribute === "function"
const collectHydrationElements = (root) => {
  const selector = `[${Hydration.boundaryIdAttributeName}]`
  return [
    ...(isElement(root) && root.hasAttribute(Hydration.boundaryIdAttributeName) ? [root] : []),
    ...Array.from(root.querySelectorAll(selector)),
  ]
}
const inspectHydrationBoundary = (element) => {
  const id = element.getAttribute(Hydration.boundaryIdAttributeName)
  if (id === null) {
    return {
      boundary: undefined,
      mismatches: [],
    }
  }
  const strategy = element.getAttribute(Hydration.attributeName)
  const eventNames = Hydration.parseEventNames(element.getAttribute(Hydration.eventNamesAttributeName) ?? "")
  const startMarker = findMarkerSibling(element, Hydration.startMarker(id), "previous")
  const endMarker = findMarkerSibling(element, Hydration.endMarker(id), "next")
  const mismatches = []
  if (strategy === null) {
    mismatches.push({
      id,
      reason: "missing-strategy",
      element,
    })
  }
  if (startMarker === undefined) {
    mismatches.push({
      id,
      reason: "missing-start-marker",
      element,
    })
  }
  if (endMarker === undefined) {
    mismatches.push({
      id,
      reason: "missing-end-marker",
      element,
    })
  }
  if (strategy === null || startMarker === undefined || endMarker === undefined) {
    return {
      boundary: undefined,
      mismatches,
    }
  }
  return {
    boundary: {
      id,
      strategy,
      element,
      eventNames,
      startMarker,
      endMarker,
    },
    mismatches,
  }
}
export const discoverHydrationBoundaries = (root) => {
  return collectHydrationElements(root).flatMap((element) => {
    const inspection = inspectHydrationBoundary(element)
    return inspection.boundary === undefined ? [] : [inspection.boundary]
  })
}
export const bootstrapHydration = (root) => {
  const inspections = collectHydrationElements(root).map(inspectHydrationBoundary)
  const mismatches = inspections.flatMap((inspection) => inspection.mismatches)
  return {
    boundaries: inspections.flatMap((inspection) => inspection.boundary === undefined ? [] : [inspection.boundary]),
    mismatches,
    diagnostics: Diagnostics.fromHydrationMismatches(mismatches),
  }
}
const findEventTarget = (boundaryElement, nodeId) => {
  if (boundaryElement.getAttribute(Hydration.nodeIdAttributeName) === nodeId) {
    return boundaryElement
  }
  return boundaryElement.querySelector(`[${Hydration.nodeIdAttributeName}="${nodeId}"]`) ?? undefined
}
const isContextualHandler = (handler) => typeof handler === "function"
const isEffectHandler = (handler) => typeof handler === "object" && handler !== null && "_tag" in handler
const isEventTarget = (value) =>
  typeof value === "object" && value !== null && "addEventListener" in value && "dispatchEvent" in value
export const activateHydration = (root, source, options = {}) => {
  const activationSource = isSsrRenderResult(source)
    ? source.activation
    : isResumabilityActivationSource(source)
    ? resolveContractActivationSource(source)
    : source
  const bootstrap = bootstrapHydration(root)
  const runtimeBoundaries = new Map(activationSource.manifest.boundaries.map((boundary) => [boundary.id, boundary]))
  const discoveredBoundaries = new Map(bootstrap.boundaries.map((boundary) => [boundary.id, boundary]))
  const issues = []
  const cleanup = []
  const registry = options.registry ?? AtomRegistry.make()
  if (options.dehydratedState !== undefined) {
    EffectHydration.hydrate(registry, options.dehydratedState)
  } else if (isSsrRenderResult(source)) {
    EffectHydration.hydrate(registry, source.dehydratedAtoms)
  } else if (isResumabilityActivationSource(source)) {
    EffectHydration.hydrate(registry, readDehydratedAtoms(source.contract.state.dehydratedAtoms))
  }
  const boundaries = bootstrap.boundaries.flatMap((boundary) => {
    const runtimeBoundary = runtimeBoundaries.get(boundary.id)
    if (runtimeBoundary === undefined) {
      issues.push({
        boundaryId: boundary.id,
        nodeId: "",
        event: "",
        reason: "missing-runtime-boundary",
      })
      return []
    }
    const eventBindings = runtimeBoundary.eventBindings.flatMap((binding) => {
      const element = findEventTarget(boundary.element, binding.nodeId)
      const handler = activationSource.handlers[binding.handlerId]
      if (element === undefined) {
        issues.push({
          boundaryId: boundary.id,
          nodeId: binding.nodeId,
          event: binding.event,
          reason: "missing-event-target",
        })
        return []
      }
      if (handler === undefined) {
        issues.push({
          boundaryId: boundary.id,
          nodeId: binding.nodeId,
          event: binding.event,
          reason: "missing-handler",
        })
        return []
      }
      if (!isContextualHandler(handler) && options.onEffect === undefined) {
        issues.push({
          boundaryId: boundary.id,
          nodeId: binding.nodeId,
          event: binding.event,
          reason: "missing-effect-dispatcher",
        })
        return []
      }
      if (!isContextualHandler(handler) && !isEffectHandler(handler)) {
        issues.push({
          boundaryId: boundary.id,
          nodeId: binding.nodeId,
          event: binding.event,
          reason: "missing-handler",
        })
        return []
      }
      const listener = (event) => {
        const target = isEventTarget(event.target) ? event.target : element
        const context = {
          event,
          target,
          currentTarget: element,
          runtime: {
            root: boundary.element,
          },
        }
        if (isContextualHandler(handler)) {
          handler(context)
          return
        }
        options.onEffect?.(handler, context)
      }
      element.addEventListener(binding.event, listener)
      cleanup.push(() => element.removeEventListener(binding.event, listener))
      return [
        {
          nodeId: binding.nodeId,
          event: binding.event,
          mode: binding.mode,
          element,
        },
      ]
    })
    return [
      {
        ...boundary,
        eventBindings,
      },
    ]
  })
  const liveRegions = isSsrRenderResult(source)
    ? source.plan.liveRegions.flatMap((plan, index) => {
      if (plan.boundaryId === undefined) {
        return []
      }
      const liveNode = LiveRegion.collectLiveNodes(source.plan.root)[index]
      if (liveNode === undefined) {
        issues.push({
          boundaryId: plan.boundaryId ?? "",
          liveRegionId: plan.id,
          nodeId: "",
          event: "",
          reason: "live-plan-mismatch",
        })
        return []
      }
      const markerRoot = plan.boundaryId === undefined
        ? root
        : (discoveredBoundaries.get(plan.boundaryId)?.element ?? root)
      const startMarker = findCommentMarker(markerRoot, plan.startMarker)
      const endMarker = findCommentMarker(markerRoot, plan.endMarker)
      if (startMarker === undefined) {
        issues.push({
          boundaryId: plan.boundaryId ?? "",
          liveRegionId: plan.id,
          nodeId: "",
          event: "",
          reason: "missing-live-start-marker",
        })
        return []
      }
      if (endMarker === undefined) {
        issues.push({
          boundaryId: plan.boundaryId ?? "",
          liveRegionId: plan.id,
          nodeId: "",
          event: "",
          reason: "missing-live-end-marker",
        })
        return []
      }
      let unsupported = false
      const renderValue = (value) => {
        const rendered = LiveRegion.serializeStaticNode(liveNode.render(value))
        if (rendered._tag === "Unsupported") {
          if (!unsupported) {
            unsupported = true
            issues.push({
              boundaryId: plan.boundaryId ?? "",
              liveRegionId: plan.id,
              nodeId: "",
              event: "",
              reason: "unsupported-live-content",
            })
          }
          return
        }
        replaceOwnedDomRange(startMarker, endMarker, rendered.html)
      }
      const unsubscribe = registry.subscribe(liveNode.atom, renderValue, { immediate: true })
      cleanup.push(unsubscribe)
      return [
        {
          id: plan.id,
          boundaryId: plan.boundaryId,
          startMarker,
          endMarker,
          unsubscribe,
        },
      ].filter(() => !unsupported)
    })
    : isResumabilityActivationSource(source)
    ? source.contract.liveRegions.flatMap((plan) => {
      const markerRoot = plan.boundaryId === undefined
        ? root
        : (discoveredBoundaries.get(plan.boundaryId)?.element ?? root)
      const startMarker = findCommentMarker(markerRoot, plan.startMarker)
      const endMarker = findCommentMarker(markerRoot, plan.endMarker)
      if (startMarker === undefined) {
        issues.push({
          boundaryId: plan.boundaryId ?? "",
          liveRegionId: plan.id,
          nodeId: "",
          event: "",
          reason: "missing-live-start-marker",
        })
        return []
      }
      if (endMarker === undefined) {
        issues.push({
          boundaryId: plan.boundaryId ?? "",
          liveRegionId: plan.id,
          nodeId: "",
          event: "",
          reason: "missing-live-end-marker",
        })
        return []
      }
      let unsupported = false
      const executable = Resumability.resolveLiveRegion(source.localRegistry, plan.ref)
      const renderValue = (value) => {
        const rendered = LiveRegion.serializeStaticNode(executable.render(value))
        if (rendered._tag === "Unsupported") {
          if (!unsupported) {
            unsupported = true
            issues.push({
              boundaryId: plan.boundaryId ?? "",
              liveRegionId: plan.id,
              nodeId: "",
              event: "",
              reason: "unsupported-live-content",
            })
          }
          return
        }
        replaceOwnedDomRange(startMarker, endMarker, rendered.html)
      }
      const unsubscribe = registry.subscribe(executable.atom, renderValue, { immediate: true })
      cleanup.push(unsubscribe)
      return unsupported
        ? []
        : [
          {
            id: plan.id,
            boundaryId: plan.boundaryId,
            startMarker,
            endMarker,
            unsubscribe,
          },
        ]
    })
    : []
  const activatedLiveRegionIds = new Set(liveRegions.map((region) => region.id))
  const deferred = activationSource.manifest.deferred.filter((node) => !activatedLiveRegionIds.has(node.id))
  let disposed = false
  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true
    for (let index = cleanup.length - 1; index >= 0; index--) {
      cleanup[index]?.()
    }
  }
  return {
    boundaries,
    liveRegions,
    mismatches: bootstrap.mismatches,
    issues,
    deferred,
    registry,
    diagnostics: Diagnostics.fromHydrationActivation({
      mismatches: bootstrap.mismatches,
      issues,
    }),
    dispose,
  }
}
