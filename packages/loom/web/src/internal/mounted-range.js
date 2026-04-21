import { MismatchedMountedRangeParentError, MissingMountedRangeParentError } from "./control-flow-error.js"

const resolveParent = (owner, start, end) => {
  const parent = start.parentNode
  if (parent === null || end.parentNode === null) {
    throw new MissingMountedRangeParentError({ owner })
  }
  if (parent !== end.parentNode) {
    throw new MismatchedMountedRangeParentError({ owner })
  }
  return parent
}

export const makeMountedRange = (owner, document = globalThis.document) => {
  const start = document.createComment(`loom-${owner}-start`)
  const end = document.createComment(`loom-${owner}-end`)
  return {
    owner,
    start,
    end,
    nodes: [start, end],
    replace: (nodes) => {
      const parent = resolveParent(owner, start, end)
      let current = start.nextSibling
      while (current !== null && current !== end) {
        const next = current.nextSibling
        parent.removeChild(current)
        current = next
      }
      for (const node of nodes) {
        parent.insertBefore(node, end)
      }
    },
  }
}
