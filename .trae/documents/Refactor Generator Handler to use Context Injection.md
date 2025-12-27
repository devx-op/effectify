I understand. The core issue is that `onGenerate` creates a *nested* `Effect.runPromise` which breaks the "one program" philosophy and makes context injection awkward. We want to structure this so that `onGenerate` just provides a layer (the "request context") to the main program, rather than starting a new one.

However, because `generatorHandler` from `@prisma/generator-helper` is an inversion of control (it calls *us*), we are forced to bridge the gap. But we can do it more idiomatically.

### Revised Plan: Context-Driven Generator

1.  **Define `GeneratorContext` Tag**:
    Create a `Context.Tag<GeneratorContext, GeneratorOptions>` to hold the options passed by Prisma. This allows `GeneratorService` to access options from the environment instead of receiving them as arguments.

2.  **Refactor `GeneratorService`**:
    Change `generate(options: GeneratorOptions)` to `generate()`. It will now `yield* GeneratorContext` to get the options.

3.  **Refactor `prisma-generator-handler.ts`**:
    Instead of manually running a new effect inside the callback, we will define a "Program" that *depends* on `GeneratorContext`.
    Inside `onGenerate(options)`, we will:
    *   Construct a `Layer.succeed(GeneratorContext, options)`.
    *   Provide this layer to the `generate` effect.
    *   Run it.
    
    *Wait, this is still running an effect inside the callback.*
    
    **Is there a better pattern in `inspiration`?**
    If we look at how `Effect` handles HTTP servers (e.g., `@effect/platform/Http/Server`), the `serve` function takes a handler (Effect) and runs it *per request*, providing the `Request` context.
    The "runtime" is created *once* (at startup), and then reused for each request.
    
    **The "Runtime" Pattern**:
    Instead of `Effect.runPromise` (which might create a fresh runtime every time if not careful, though `runPromise` is usually top-level), we can:
    1.  Create a `Runtime` *once* in the main CLI setup.
    2.  Pass this `runtime` to the `onGenerate` callback.
    3.  Use `Runtime.runPromise(runtime)(effect)` inside the callback.
    
    This ensures we share the same "world" (logging, context, etc.) and just provide the *new* context (`GeneratorOptions`) for that specific execution. This is the correct "server" pattern for Effect.

### Implementation Steps

1.  **Create `src/services/generator-context.ts`**:
    *   `export class GeneratorContext extends Context.Tag("GeneratorContext")<GeneratorContext, GeneratorOptions>() {}`

2.  **Update `src/services/generator-service.ts`**:
    *   Remove `options` argument from `generate`.
    *   Add `yield* GeneratorContext` to the generator block.

3.  **Update `src/commands/prisma-generator-handler.ts`**:
    *   Get the `Runtime` from the current effect context using `Effect.runtime()`.
    *   In `onGenerate`, use `Runtime.runPromise(runtime)(...)`.
    *   Construct the effect: `generator.generate.pipe(Effect.provideService(GeneratorContext, options))`.

This solves the "new run" issue by reusing the application runtime and treating `onGenerate` as a request that injects its own context.

### Verification
*   Run `pnpm prisma:generate` to ensure it still works.
*   The code will look much cleaner and "Effect-native".
