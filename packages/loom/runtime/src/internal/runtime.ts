import { AtomRegistry, Hydration as EffectHydration } from "effect/unstable/reactivity"
import type * as LoomCore from "@effectify/loom-core"
import * as Hydration from "../hydration.js"
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
          : current.events.map(({ event, handler, mode }) => ({
            nodeId,
            event,
            mode,
            handler,
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

const isComment = (value: ChildNode | null): value is Comment => value?.nodeType === commentNodeType

const findMarkerSibling = (node: Element, marker: string, direction: "previous" | "next"): Comment | undefined => {
  const sibling = direction === "previous" ? node.previousSibling : node.nextSibling

  if (!isComment(sibling)) {
    return undefined
  }

  return sibling.data === marker ? sibling : undefined
}

const createCommentWalker = (root: ParentNode): TreeWalker => {
  const document = root instanceof Document ? root : root.ownerDocument

  if (document === null) {
    throw new Error("expected ParentNode to have an ownerDocument")
  }

  return document.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
}

const findCommentMarker = (root: ParentNode, marker: string): Comment | undefined => {
  const walker = createCommentWalker(root)
  let current = walker.nextNode()

  while (current !== null) {
    if (current instanceof Comment && current.data === marker) {
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
  source: Runtime.ActivationSource | Runtime.SsrRenderResult,
): source is Runtime.SsrRenderResult => "plan" in source

const serializeNode = (
  node: LoomCore.Ast.Node,
  state: {
    nextBoundaryId: number
    nextLiveRegionId: number
    boundaries: Array<Runtime.HydrationBoundary>
    liveRegions: Array<Runtime.LiveRegionPlan>
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
    }

    return LiveRegion.wrapHtml(liveId, serializeStaticNode(rendered))
  }

  switch (node._tag) {
    case "Text":
      return escapeText(node.value)
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

export const makeEventBinding = <Handler>(event: string, handler: Handler): Runtime.EventBinding<Handler> => ({
  _tag: "EventBinding",
  event,
  mode: typeof handler === "function" ? "contextual" : "effect",
  handler,
})

export const makeRenderPlan = (root: LoomCore.Ast.Node, options?: Runtime.SsrOptions): Runtime.RenderPlan =>
  renderToHtml(root, options).plan

export const renderToHtml = (root: LoomCore.Ast.Node, options: Runtime.SsrOptions = {}): Runtime.SsrRenderResult => {
  const serializationState: {
    nextBoundaryId: number
    nextLiveRegionId: number
    boundaries: Array<Runtime.HydrationBoundary>
    liveRegions: Array<Runtime.LiveRegionPlan>
    deferred: Array<Runtime.DeferredNode>
    registry: AtomRegistry.AtomRegistry
  } = {
    nextBoundaryId: 0,
    nextLiveRegionId: 0,
    boundaries: [],
    liveRegions: [],
    deferred: [],
    registry: options.registry ?? AtomRegistry.make(),
  }

  const html = serializeNode(root, serializationState, undefined, undefined)
  const handlers: Record<string, LoomCore.Ast.EventBinding["handler"]> = {}
  let nextHandlerId = 0

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
    dehydratedAtoms: EffectHydration.dehydrate(serializationState.registry, options.dehydrate),
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

  return {
    boundaries: inspections.flatMap((inspection) => inspection.boundary === undefined ? [] : [inspection.boundary]),
    mismatches: inspections.flatMap((inspection) => inspection.mismatches),
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

export const activateHydration = (
  root: ParentNode,
  source: Runtime.ActivationSource | Runtime.SsrRenderResult,
  options: Runtime.HydrationActivationOptions = {},
): Runtime.HydrationActivationResult => {
  const activationSource = isSsrRenderResult(source) ? source.activation : source
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
        const target = event.target instanceof EventTarget ? event.target : element
        const context = {
          event,
          target,
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
    dispose,
  }
}
