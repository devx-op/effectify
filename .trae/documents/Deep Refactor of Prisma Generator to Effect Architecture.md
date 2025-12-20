I have restored the specific path mappings for `@prisma/effect` and `@prisma/effect/*`.

### Explanation

You were right that `src/services/prisma.service.ts` was failing. The reason is that `moduleResolution: "nodenext"` (which is enabled in this project) is very strict. It does not automatically resolve directory indexes (like `index.ts`) when using a wildcard alias that points to a directory. It expects an explicit mapping to the file.

### Changes Made

1. **Restored Mappings:** I added back:

   * `"@prisma/effect": ["./prisma/generated/effect/index.ts"]`

   * `"@prisma/effect/*": ["./prisma/generated/effect/*"]`
     to both `tsconfig.lib.json` and `tsconfig.spec.json`.

### Verification

* **Tests:** `pnpm vitest` passed all tests.

* **Type Checking:** `pnpm exec tsc` confirmed that `src/services/prisma.service.ts` no longer has the "Cannot find module" error. (The remaining errors in the log are unrelated technical debt in other files).

