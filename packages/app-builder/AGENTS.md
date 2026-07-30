# App Builder Conventions

## Private Effect Schema Contracts

- Name candidate-owned TypeScript source and test files in lowercase kebab-case.
- Infer exported schema values with `typeof Value.Type`; brand scalar values only after their validation constraints.
- Use `Schema.Literals([...])` for finite literal sets supported by the pinned Effect v4 API.
- Model immutable wire contracts with `Schema.Struct`; use `Schema.Class` only when construction validation plus methods or inheritance are actual domain needs. Keep `Schema.TaggedErrorClass` for typed Effect failures.
- Keep modules leaf-imported and acyclic until the exports/compatibility slice owns a public surface.
- Prefer `Result` for eager, synchronous, environment-free, non-interruptible value validation when callers need immediate success/failure inspection. `Schema.decodeUnknownResult` is the matching pure boundary adapter; use `Result.gen`, `flatMap`, `all`, and `filterOrFail` to compose dependent validation steps instead of manually extracting success/failure branches.
- Prefer `Effect` only when its semantics are meaningful: lazy execution, required services/environment, interruption, async or concurrent work, tracing, resource scope, or composition into an existing Effect workflow. Do not wrap an eager `Result` in `Effect.succeed`/`Effect.fail` for style alone.
- Use ordinary synchronous `it` tests for `Result`-only APIs. Use `@effect/vitest` `it.effect` only when the subject returns or requires an `Effect` (for example TestClock, services, scope, interruption, or async behavior). Retain nominal `@ts-expect-error` proofs beside the behavior test they protect.

Reference: `.effect-reference/effect` commit `96ced89`; `packages/effect/src/{Result,Effect,Schema}.ts`, `packages/vitest/{README.md,src/index.ts,src/internal/internal.ts}`, and `AGENTS.md`.
