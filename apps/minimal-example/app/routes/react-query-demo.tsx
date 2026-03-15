import * as Effect from "effect/Effect"
import { useState } from "react"
import { Link } from "react-router"

// Simple demo without complex Effect hooks for now
// Shows the setup works with v4

interface DemoItem {
  id: string
  title: string
  description: string
  effectVersion: string
}

const demoData: DemoItem[] = [
  {
    id: "1",
    title: "Effect v4 Beta",
    description: "Using unified versioning across all Effect packages",
    effectVersion: "4.0.0-beta.31",
  },
  {
    id: "2",
    title: "Service Pattern",
    description: "Migrated from Context.Tag to ServiceMap.Service",
    effectVersion: "4.0.0-beta.31",
  },
  {
    id: "3",
    title: "Bundle Size",
    description: "Minimal Effect program bundles to ~6.3 KB (minified + gzipped)",
    effectVersion: "4.0.0-beta.31",
  },
]

// Simple Effect demo
const getDemoData = Effect.sync(() => demoData)

export default function ReactQueryDemo() {
  const [items] = useState<DemoItem[]>(demoData)
  const [effectResult, setEffectResult] = useState<string>(
    "Click to run Effect",
  )

  const runEffect = () => {
    const result = Effect.runSync(getDemoData)
    setEffectResult(`Loaded ${result.length} items via Effect v4`)
  }

  return (
    <article>
      <header>
        <h2>Effect v4 + React Query Demo</h2>
        <p>@effectify/react-query integration</p>
      </header>

      <section>
        <h3>Effect Runtime Test</h3>
        <button onClick={runEffect}>Run Effect.sync()</button>
        <p>
          <kbd>{effectResult}</kbd>
        </p>
      </section>

      <section>
        <h3>Features</h3>
        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
          {items.map((item) => (
            <article key={item.id} style={{ marginBottom: "1rem" }}>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <small>
                Version: <code>{item.effectVersion}</code>
              </small>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3>Package Versions</h3>
        <ul>
          <li>
            <code>effect</code>: 4.0.0-beta.31
          </li>
          <li>
            <code>@effectify/react-query</code>: workspace (v4 compatible)
          </li>
          <li>
            <code>@tanstack/react-query</code>: 5.90.10
          </li>
        </ul>
      </section>

      <footer>
        <p>
          <Link to="/">← Back to Home</Link>
        </p>
        <small>This demo uses @effectify/react-query with Effect v4 beta</small>
      </footer>
    </article>
  )
}
