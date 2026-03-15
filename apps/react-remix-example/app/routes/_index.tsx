import { Link } from "@remix-run/react"

export default function Index() {
  return (
    <article>
      <h1>Welcome to Effectify + Remix</h1>
      <p>
        This is a demonstration application showing how to integrate <strong>Effect</strong> with <strong>Remix</strong>
        {" "}
        using the <code>@effectify/react-remix</code> package.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Type-safe functional programming with Effect</li>
        <li>Full CRUD operations with mock data storage</li>
        <li>PicoCSS classless styling</li>
        <li>Effect runtime wrappers for loaders and actions</li>
      </ul>

      <h2>Get Started</h2>
      <p>
        Check out the{" "}
        <Link to="/todos" style={{ color: "#007bff" }}>
          Todo App
        </Link>{" "}
        to see Effect in action with Remix!
      </p>

      <hr />

      <h3>Existing Routes</h3>
      <ul>
        <li>
          <Link to="/test">/test</Link> - Form demonstration with validation
        </li>
        <li>
          <Link to="/demo">/demo</Link> - Response type demonstrations
        </li>
        <li>
          <Link to="/api/docs">/api/docs</Link> - API documentation (Scalar)
        </li>
      </ul>
    </article>
  )
}
