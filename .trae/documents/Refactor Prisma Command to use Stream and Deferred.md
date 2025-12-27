I will refactor the Prisma command to use `Stream` and `Deferred` (Promise-like synchronization primitive in Effect) to handle the generation requests. This decouples the "event listener" (Prisma callback) from the "business logic" (Generator Service).

### Proposed Implementation

1.  **Create a Stream Source**:
    *   Use `Stream.async` to bridge the `generatorHandler` callback.
    *   Inside `onGenerate`:
        *   Create a `Deferred` to track completion.
        *   Emit the `options` and the `deferred` to the stream.
        *   Await the `deferred` to block the callback until processing is done.

2.  **Process the Stream**:
    *   Use `Stream.runForEach` to handle incoming generation requests.
    *   For each request:
        *   Run `generator.generate`.
        *   Provide the `GeneratorContext` with the received `options`.
        *   Connect the result (success or failure) to the `deferred` using `Effect.intoDeferred`.

3.  **Benefits**:
    *   **Context Injection**: The `GeneratorContext` is provided naturally in the Effect pipeline.
    *   **Runtime Reuse**: The main logic runs in the main Effect loop. The callback only acts as a dispatcher.
    *   **Separation of Concerns**: Request handling is separated from execution.

### Code Snippet (Preview)

```typescript
const events = Stream.async<[GeneratorOptions, Deferred.Deferred<void, unknown>]>((emit) => {
  generatorHelper.generatorHandler({
    onManifest: () => ({ ... }),
    onGenerate: async (options) => {
      // Dispatch and wait
      await runPromise(Effect.gen(function* () {
        const deferred = yield* Deferred.make<void, unknown>()
        yield* Effect.promise(() => emit.single([options, deferred]))
        yield* Deferred.await(deferred)
      }))
    }
  })
})

yield* events.pipe(
  Stream.runForEach(([options, deferred]) => 
    generator.generate.pipe(
      Effect.provideService(GeneratorContext, options),
      Effect.intoDeferred(deferred)
    )
  )
)
```

I will implement this refactoring now.
