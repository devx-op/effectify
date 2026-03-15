import { Link } from "react-router"

export default function About() {
  return (
    <article>
      <header>
        <h2>About This Demo</h2>
      </header>

      <section>
        <h3>Effect v4 Beta</h3>
        <p>
          This demonstration uses <strong>Effect v4.0.0-beta.31</strong>, a major version with significant improvements:
        </p>
        <ul>
          <li>Unified versioning across all Effect packages</li>
          <li>ServiceMap pattern replacing Context.Tag</li>
          <li>~6.3 KB bundle size (minified + gzipped)</li>
          <li>Tree-shakeable core</li>
        </ul>
      </section>

      <section>
        <h3>Packages Used</h3>
        <ul>
          <li>
            <code>@effectify/react-query</code> - Effect v4 integration with TanStack Query
          </li>
          <li>
            <code>@effectify/solid-query</code> - Effect v4 integration for Solid.js
          </li>
          <li>
            <code>effect</code> - Core v4 beta
          </li>
        </ul>
      </section>

      <footer>
        <Link to="/">← Back to Home</Link>
      </footer>
    </article>
  )
}
