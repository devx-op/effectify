import { Atom, AtomRegistry, Hydration as EffectHydration } from "effect/unstable/reactivity"
import type * as LoomCore from "@effectify/loom-core"
import * as Diagnostics from "./diagnostics.js"
import * as Hydration from "../hydration.js"
import * as Resumability from "../resumability.js"
import * as LiveRegion from "./live-region.js"
import type * as Runtime from "../runtime.js"

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const escapeAttribute = (value: string): string =>
  escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const collectHydrationAttributes = (
  node: LoomCore.Ast.Node,
): ReadonlyArray<readonly [key: string, value: string]> => {
  switch (node._tag) {
    case "Text":
      return []
    case "DynamicText":
      return []
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

const collectRegisteredEvents = (
  node: LoomCore.Ast.Node,
  boundaryId: string,
): ReadonlyArray<Runtime.RegisteredEventBinding> => {
  const state = {
    nextNodeId: 0,
  }

  const loop = (current: LoomCore.Ast.Node, isBoundaryRoot: boolean): ReadonlyArray<Runtime.RegisteredEventBinding> => {
    switch (current._tag) {
      case "Text":
        return []
      case "DynamicText":
        return []
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

const serializeAttributes = (attributes: Readonly<Record<string, string>>): string => {
  const entries = Object.entries(attributes)

  if (entries.length === 0) {
    return ""
  }

  return entries.map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("")
}

const commentNodeType = 8
const documentNodeType = 9
const showCommentNodeMask = 128

const isComment = (value: ChildNode | null): value is Comment => value?.nodeType === commentNodeType

const isCommentNode = (value: Node | null): value is Comment => value?.nodeType === commentNodeType

const findMarkerSibling = (node: Element, marker: string, direction: "previous" | "next"): Comment | undefined => {
  const sibling = direction === "previous" ? node.previousSibling : node.nextSibling

  if (!isComment(sibling)) {
    return undefined
  }

  return sibling.data === marker ? sibling : undefined
}

const createCommentWalker = (root: ParentNode): TreeWalker => {
  const document = root.nodeType === documentNodeType
    ? (root as Document)
    : root.ownerDocument

  if (document === null) {
    throw new Error("expected ParentNode to have an ownerDocument")
  }

  return document.createTreeWalker(root, showCommentNodeMask)
}

const findCommentMarker = (root: ParentNode, marker: string): Comment | undefined => {
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

const replaceOwnedDomRange = (startMarker: Comment, endMarker: Comment, html: string): void => {
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

const isSsrRenderResult = (
  source: Runtime.ActivationSource | Runtime.SsrRenderResult | Resumability.ResumabilityActivationSource,
): source is Runtime.SsrRenderResult => "plan" in source

const isResumabilityActivationSource = (
  source: Runtime.ActivationSource | Runtime.SsrRenderResult | Resumability.ResumabilityActivationSource,
): source is Resumability.ResumabilityActivationSource => "contract" in source && "localRegistry" in source

const isReferencedHandler = <Handler>(
  value: Handler | Resumability.ReferencedHandler<Handler>,
): value is Resumability.ReferencedHandler<Handler> =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "ReferencedHandler"

const getSerializableAtomKey = (atom: Atom.Atom<unknown>): string | undefined =>
  Atom.isSerializable(atom) ? atom[Atom.SerializableTypeId].key : undefined

const isDehydratedAtom = (value: unknown): value is EffectHydration.DehydratedAtom =>
  typeof value === "object" && value !== null && "~effect/reactivity/DehydratedAtom" in value

const readDehydratedAtoms = (value: ReadonlyArray<unknown>): ReadonlyArray<EffectHydration.DehydratedAtom> =>
  value.flatMap((entry) => isDehydratedAtom(entry) ? [entry] : [])

const serializeNode = (
  node: LoomCore.Ast.Node,
  state: {
    nextBoundaryId: number
    nextLiveRegionId: number
    boundaries: Array<Runtime.HydrationBoundary>
    liveRegions: Array<Runtime.LiveRegionPlan>
    resumableLiveRegions: Array<Resumability.LiveRegionDescriptor>
    resumabilityIssues: Array<Resumability.RenderResumabilityIssue>
    deferred: Array<Runtime.DeferredNode>
    registry: AtomRegistry.AtomRegistry
  },
  boundaryId: string | undefined,
  nextBoundaryNodeId:
    | {
      current: number
    }
    | undefined,
  isBoundaryRoot = false,
): string => {
  const serializeStaticNode = (current: LoomCore.Ast.Node): string => {
    switch (current._tag) {
      case "Text":
        return escapeText(current.value)
      case "DynamicText":
        return escapeText(String(current.render()))
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

  const serializeLiveNode = (
    current: LoomCore.Ast.LiveNode<unknown>,
    currentBoundaryId: string | undefined,
  ): string => {
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

      const attributes: Record<string, string> = { ...node.attributes }
      const activeBoundaryId = isBoundaryRoot ? `b${state.nextBoundaryId++}` : boundaryId
      const activeBoundaryNodeId = isBoundaryRoot ? { current: 0 } : nextBoundaryNodeId

      let nodeId: string | undefined
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

export const makeEventBinding = <Handler>(event: string, handler: Handler): Runtime.EventBinding<Handler> => {
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

export const makeRenderPlan = (root: LoomCore.Ast.Node, options?: Runtime.SsrOptions): Runtime.RenderPlan =>
  renderToHtml(root, options).plan

export const renderToHtml = (root: LoomCore.Ast.Node, options: Runtime.SsrOptions = {}): Runtime.SsrRenderResult => {
  const serializationState: {
    nextBoundaryId: number
    nextLiveRegionId: number
    boundaries: Array<Runtime.HydrationBoundary>
    liveRegions: Array<Runtime.LiveRegionPlan>
    resumableLiveRegions: Array<Resumability.LiveRegionDescriptor>
    resumabilityIssues: Array<Resumability.RenderResumabilityIssue>
    deferred: Array<Runtime.DeferredNode>
    registry: AtomRegistry.AtomRegistry
  } = {
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
  const handlers: Record<string, LoomCore.Ast.EventBinding["handler"]> = {}
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
      } satisfies Runtime.ActivationEventBinding
    }),
  }))
  let resumability: Resumability.RenderResumabilityResult

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
              } satisfies Resumability.HandlerDescriptor,
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

export const createResumabilityContract = async (
  render: Runtime.SsrRenderResult,
  identity: Runtime.ResumabilityIdentity,
): Promise<Resumability.CreatedRenderContractResult> => {
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
      const draft: Resumability.RenderContractDraft = render.resumability.draft

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

const resolveContractActivationSource = (
  source: Resumability.ResumabilityActivationSource,
): Runtime.ActivationSource => {
  const handlers: Record<string, LoomCore.Ast.EventBinding["handler"]> = {}
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
            } satisfies Runtime.ActivationEventBinding
          }),
      })),
      deferred: source.contract.state.deferred,
    },
    handlers,
  }
}

const isElement = (value: ParentNode): value is Element =>
  "hasAttribute" in value && typeof value.hasAttribute === "function"

const collectHydrationElements = (root: ParentNode): ReadonlyArray<Element> => {
  const selector = `[${Hydration.boundaryIdAttributeName}]`

  return [
    ...(isElement(root) && root.hasAttribute(Hydration.boundaryIdAttributeName) ? [root] : []),
    ...Array.from(root.querySelectorAll(selector)),
  ]
}

const inspectHydrationBoundary = (
  element: Element,
): {
  readonly boundary: Runtime.HydrationBoundaryHandle | undefined
  readonly mismatches: ReadonlyArray<Runtime.HydrationMismatch>
} => {
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
  const mismatches: Array<Runtime.HydrationMismatch> = []

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

export const discoverHydrationBoundaries = (root: ParentNode): ReadonlyArray<Runtime.HydrationBoundaryHandle> => {
  return collectHydrationElements(root).flatMap((element) => {
    const inspection = inspectHydrationBoundary(element)
    return inspection.boundary === undefined ? [] : [inspection.boundary]
  })
}

export const bootstrapHydration = (root: ParentNode): Runtime.HydrationBootstrapResult => {
  const inspections = collectHydrationElements(root).map(inspectHydrationBoundary)
  const mismatches = inspections.flatMap((inspection) => inspection.mismatches)

  return {
    boundaries: inspections.flatMap((inspection) => inspection.boundary === undefined ? [] : [inspection.boundary]),
    mismatches,
    diagnostics: Diagnostics.fromHydrationMismatches(mismatches),
  }
}

const findEventTarget = (boundaryElement: Element, nodeId: string): Element | undefined => {
  if (boundaryElement.getAttribute(Hydration.nodeIdAttributeName) === nodeId) {
    return boundaryElement
  }

  return boundaryElement.querySelector(`[${Hydration.nodeIdAttributeName}="${nodeId}"]`) ?? undefined
}

const isContextualHandler = (
  handler: LoomCore.Ast.EventBinding["handler"],
): handler is (context: Runtime.EventContext) => unknown => typeof handler === "function"

const isEffectHandler = (
  handler: LoomCore.Ast.EventBinding["handler"],
): handler is LoomCore.Component.EffectLike => typeof handler === "object" && handler !== null && "_tag" in handler

const isEventTarget = (value: unknown): value is EventTarget =>
  typeof value === "object" && value !== null && "addEventListener" in value && "dispatchEvent" in value

export const activateHydration = (
  root: ParentNode,
  source: Runtime.ActivationSource | Runtime.SsrRenderResult | Resumability.ResumabilityActivationSource,
  options: Runtime.HydrationActivationOptions = {},
): Runtime.HydrationActivationResult => {
  const activationSource = isSsrRenderResult(source)
    ? source.activation
    : isResumabilityActivationSource(source)
    ? resolveContractActivationSource(source)
    : source
  const bootstrap = bootstrapHydration(root)
  const runtimeBoundaries = new Map(activationSource.manifest.boundaries.map((boundary) => [boundary.id, boundary]))
  const discoveredBoundaries = new Map(bootstrap.boundaries.map((boundary) => [boundary.id, boundary]))
  const issues: Array<Runtime.HydrationActivationIssue> = []
  const cleanup: Array<() => void> = []
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

      const listener = (event: Event) => {
        const target = isEventTarget(event.target) ? event.target : element
        const context = {
          event,
          target,
          currentTarget: element,
          runtime: {
            root: boundary.element,
          },
        } satisfies Runtime.EventContext

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
        } satisfies Runtime.ActivatedEventBinding,
      ]
    })

    return [
      {
        ...boundary,
        eventBindings,
      } satisfies Runtime.ActivatedBoundary,
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

      const renderValue = (value: unknown) => {
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
        } satisfies Runtime.ActivatedLiveRegion,
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
      const renderValue = (value: unknown) => {
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
          } satisfies Runtime.ActivatedLiveRegion,
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
