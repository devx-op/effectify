import type * as LoomCore from "@effectify/loom-core"
import * as Hydration from "../hydration.js"
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

const collectDeferredNodes = (node: LoomCore.Ast.Node): ReadonlyArray<Runtime.DeferredNode> => {
  const state = {
    nextDeferredId: 0,
  }

  const loop = (current: LoomCore.Ast.Node): ReadonlyArray<Runtime.DeferredNode> => {
    switch (current._tag) {
      case "Text":
        return []
      case "Live":
        return [
          {
            id: `l${state.nextDeferredId++}`,
            kind: "live",
            reason: "deferred",
          },
        ]
      case "ComponentUse":
        return loop(current.component.node)
      case "Fragment":
        return current.children.flatMap(loop)
      case "Element":
        return current.children.flatMap(loop)
    }
  }

  return loop(node)
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

const serializeNode = (
  node: LoomCore.Ast.Node,
  state: {
    nextBoundaryId: number
    nextDeferredId: number
    boundaries: Array<Runtime.HydrationBoundary>
  },
  boundaryId: string | undefined,
  nextBoundaryNodeId:
    | {
      current: number
    }
    | undefined,
  isBoundaryRoot = false,
): string => {
  switch (node._tag) {
    case "Text":
      return escapeText(node.value)
    case "Fragment":
      return node.children.map((child) => serializeNode(child, state, boundaryId, nextBoundaryNodeId)).join("")
    case "ComponentUse":
      return serializeNode(node.component.node, state, boundaryId, nextBoundaryNodeId, isBoundaryRoot)
    case "Live": {
      const deferredId = `l${state.nextDeferredId++}`
      return `<!--${Hydration.livePlaceholder(deferredId)}-->`
    }
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

export const makeRenderPlan = (root: LoomCore.Ast.Node): Runtime.RenderPlan => renderToHtml(root).plan

export const renderToHtml = (root: LoomCore.Ast.Node): Runtime.SsrRenderResult => {
  const serializationState: {
    nextBoundaryId: number
    nextDeferredId: number
    boundaries: Array<Runtime.HydrationBoundary>
  } = {
    nextBoundaryId: 0,
    nextDeferredId: 0,
    boundaries: [],
  }

  const html = serializeNode(root, serializationState, undefined, undefined)
  const deferred = collectDeferredNodes(root)
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
      deferred,
    },
    activation: {
      manifest: {
        boundaries: activationBoundaries,
        deferred,
      },
      handlers,
    },
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
  source: Runtime.ActivationSource,
  options: Runtime.HydrationActivationOptions = {},
): Runtime.HydrationActivationResult => {
  const bootstrap = bootstrapHydration(root)
  const runtimeBoundaries = new Map(source.manifest.boundaries.map((boundary) => [boundary.id, boundary]))
  const issues: Array<Runtime.HydrationActivationIssue> = []

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
      const handler = source.handlers[binding.handlerId]

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

      element.addEventListener(binding.event, (event) => {
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
      })

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

  return {
    boundaries,
    mismatches: bootstrap.mismatches,
    issues,
    deferred: source.manifest.deferred,
  }
}
