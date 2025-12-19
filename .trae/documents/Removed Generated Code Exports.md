I have removed the exports for the generated code from `packages/prisma/package.json` as requested.

### Changes Made:
*   **Removed Exports:** Deleted `"./effect"` and `"./effect/prisma-repository"` from the `exports` field in `packages/prisma/package.json`. Now only `"./prisma"` is exported.
*   **Verified Configuration:** The `tsconfig` files and `vitest` configuration still correctly map `@prisma/effect/*` to the local generated files for *internal* development and testing within the package, so this change does not break the package's own tests.

### Verification:
*   **Tests:** `pnpm vitest` still passes all 16 tests in `packages/prisma`.
*   **Type Checking:** `pnpm exec tsc --noEmit --project tsconfig.spec.json` confirms no regressions in the test files or service files.

Consumers of this package will now need to generate their own Prisma client and Effect wrapper code, as intended.
