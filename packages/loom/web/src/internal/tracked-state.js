const collectorStack = []
export const trackStateAtomRead = (atom) => {
  collectorStack.at(-1)?.add(atom)
}
export const withStateTracking = (render) => {
  const atoms = new Set()
  collectorStack.push(atoms)
  try {
    return {
      value: render(),
      atoms,
    }
  } finally {
    collectorStack.pop()
  }
}
