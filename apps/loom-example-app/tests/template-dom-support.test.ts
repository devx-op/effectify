import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import { ensureTemplateDocument, withTemplateDocument } from "../src/template-dom-support.js"

describe.sequential("loom example app template DOM support", () => {
  it("can eagerly install a reusable document before node-only module evaluation", () => {
    expect(globalThis.document).toBeUndefined()

    const installedDocument = ensureTemplateDocument()

    expect(installedDocument.createElement("template").tagName).toBe("TEMPLATE")
    expect(globalThis.document).toBe(installedDocument)

    Reflect.deleteProperty(globalThis, "document")
  })

  it("provides a temporary document for server-side template authoring and restores globals afterward", () => {
    expect(globalThis.document).toBeUndefined()

    const tagName = withTemplateDocument(() => document.createElement("template").tagName)

    expect(tagName).toBe("TEMPLATE")
    expect(globalThis.document).toBeUndefined()
  })

  it("reuses the ambient document when one already exists", () => {
    const ambientDocument = new JSDOM("<!doctype html><html><body></body></html>").window.document
    globalThis.document = ambientDocument

    try {
      const observedDocument = withTemplateDocument(() => document)

      expect(observedDocument).toBe(ambientDocument)
    } finally {
      Reflect.deleteProperty(globalThis, "document")
    }
  })

  it("keeps the temporary document available until async work finishes", async () => {
    expect(globalThis.document).toBeUndefined()

    const tagName = await withTemplateDocument(async () => {
      await Promise.resolve()
      return document.createElement("template").tagName
    })

    expect(tagName).toBe("TEMPLATE")
    expect(globalThis.document).toBeUndefined()
  })
})
