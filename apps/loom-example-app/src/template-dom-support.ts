import { isPromise } from "effect/Predicate"

const jsdomModuleId = "jsdom"

type GlobalDocumentOwner = typeof globalThis & {
  document?: Document
}

const serverTemplateDocument = typeof document === "undefined"
  ? new (await import(/* @vite-ignore */ jsdomModuleId)).JSDOM("<!doctype html><html><body></body></html>").window
    .document
  : undefined

export const ensureTemplateDocument = (): Document => {
  const documentOwner: GlobalDocumentOwner = globalThis

  if (documentOwner.document !== undefined) {
    return documentOwner.document
  }

  if (serverTemplateDocument === undefined) {
    throw new Error("Template DOM support is unavailable without an ambient document.")
  }

  documentOwner.document = serverTemplateDocument
  return serverTemplateDocument
}

export function withTemplateDocument<Value>(evaluate: () => Promise<Value>): Promise<Value>
export function withTemplateDocument<Value>(evaluate: () => Value): Value
export function withTemplateDocument<Value>(evaluate: () => Value | Promise<Value>): Value | Promise<Value> {
  const documentOwner: GlobalDocumentOwner = globalThis

  if (documentOwner.document !== undefined) {
    return evaluate()
  }

  if (serverTemplateDocument === undefined) {
    throw new Error("Template DOM support is unavailable without an ambient document.")
  }

  documentOwner.document = serverTemplateDocument

  const restoreDocument = (): void => {
    Reflect.deleteProperty(documentOwner, "document")
  }

  let result: Value | Promise<Value>

  try {
    result = evaluate()
  } catch (error) {
    restoreDocument()
    throw error
  }

  if (isPromise(result)) {
    return result.finally(() => restoreDocument())
  }

  restoreDocument()
  return result
}
