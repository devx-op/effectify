// Uncomment this line to use CSS modules
// import styles from './app.module.css';
export function App() {
  return (
    <main className="container">
      <header>
        <h1>React Router + Effect examples</h1>
        <p>
          Stable reference app for the core flows we want to keep working while the dedicated e2e slice is on hold.
        </p>
      </header>

      <section>
        <article>
          <h2>Authentication</h2>
          <p>
            Use the login and signup routes to validate the app auth wiring.
          </p>
        </article>

        <article>
          <h2>Todo workflow</h2>
          <p>
            Exercise loader and action behavior through the protected todo app.
          </p>
        </article>

        <article>
          <h2>Chat demo</h2>
          <p>
            Keep a simple interactive screen available for UI/runtime smoke checks.
          </p>
        </article>
      </section>
    </main>
  )
}

export default App
