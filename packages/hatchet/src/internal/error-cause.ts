const causes = new WeakMap<object, unknown>()

export const setErrorCause = (error: object, cause: unknown): void => {
  causes.set(error, cause)
}

export const getErrorCause = (error: object): unknown => causes.get(error)
