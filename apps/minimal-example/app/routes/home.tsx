import { Link } from "react-router"

export default function Home() {
  return (
    <article>
      <header>
        <h2>Welcome to Effect v4 Beta Demo</h2>
      </header>

      <p>
        This is a minimal example demonstrating Effect v4 beta integration with React Router and TanStack Query.
      </p>

      <section>
        <h3>Available Demos</h3>
        <ul>
          <li>
            <Link to="/react-query">
              <strong>React Query Demo</strong>
            </Link>
            <br />
            <small>Effect v4 + @effectify/react-query</small>
          </li>
        </ul>
      </section>

      <footer>
        <small>
          Packages: @effectify/react-query v4 beta, @effectify/solid-query v4 beta
        </small>
      </footer>
    </article>
  )
}
