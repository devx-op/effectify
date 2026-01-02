I will configure a testing environment for `@effectify/node-better-auth` using Vitest, ensuring it reflects how the library is consumed in `apps/react-app-router-fm` and `packages/react/router-better-auth`.

**Plan:**

1. **Install Dependencies**:

   * Add `vitest` and `@effect/vitest` (for Effect-specific testing utilities) to `devDependencies` in `packages/node/better-auth/package.json`.

   * Add a `test` script: `"test": "vitest"`.

2. **Configure Vitest**:

   * Create `packages/node/better-auth/vitest.config.ts`.

   * Configure it to support TypeScript and alias resolution if needed (though standard Node resolution should work).

3. **Create Test Scenarios**:

   * Create `packages/node/better-auth/test/auth-service.test.ts`.

   * **Test 1: Service Layer Creation**: Verify that `AuthService.layer` creates a valid `AuthServiceContext` given a `better-auth` configuration (using an in-memory SQLite database for speed and isolation).

   * **Test 2: Context Tag Usage**: Verify that `AuthService.AuthContext` can be tagged and retrieved, mimicking the behavior in `auth-guard.ts` (simulating a session verification flow).

   * **Test 3: Handler Integration**: Simulate the `betterAuthLoader` behavior by invoking the `auth.handler` with a mock Request, ensuring the Effect pipeline works as expected.

4. **Verification**:

   * Run the tests to ensure the setup is correct and the library functions as intended.

**Key Considerations**:

* I will use `better-sqlite3` (already in workspace) for the in-memory database in tests to avoid needing a real Postgres instance.

* I will structure the tests to mimic the "Consumer" pattern seen in the React app (consuming the context via `Effect.gen`).

