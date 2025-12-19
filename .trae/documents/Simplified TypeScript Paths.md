I have removed the redundant path mappings from `tsconfig.lib.json` and `tsconfig.spec.json` as requested.

### Changes:
*   **Updated `tsconfig.lib.json` & `tsconfig.spec.json`:** Removed the explicit mappings for `@prisma/effect` and `@prisma/effect/*`.
*   **Retained:** `"@prisma/*": ["./prisma/generated/*"]` handles all resolution for the generated files now, which is cleaner and sufficient.

### Verification:
*   **Tests:** `pnpm vitest` still passes all 16 tests.
*   **Type Checking:** `pnpm exec tsc --noEmit --project tsconfig.spec.json` confirms that the test files and service files can still resolve imports correctly via the wildcard alias.
