import "./app.css"
import { startClientApp } from "./entry-client.js"

export const bootClientDocument = (document: Document) => startClientApp(document)

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void bootClientDocument(document)
}
