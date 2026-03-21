import * as Cause from "effect/Cause"
import * as Command from "effect/unstable/cli/Command"
import type * as NodeServices from "@effect/platform-node/NodeServices"
import type { GeneratorOptions } from "@prisma/generator-helper"
import generatorHelper from "@prisma/generator-helper"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { GeneratorContext } from "../services/generator-context.js"
import { GeneratorService } from "../services/generator-service.js"
import type { RenderService } from "../services/render-service.js"

// Pattern based on: .effect-reference/packages/platform-node-shared/src/NodeFileSystem.ts (watchNode)
// Stream.callback receives a queue, and we use Effect.runFork to execute effects from callbacks

export const prismaCommand = Command.make("prisma", {}, () =>
  Effect.gen(function*() {
    const generator = yield* GeneratorService
    const runtime = yield* Effect.services<
      GeneratorService | RenderService | NodeServices.NodeServices
    >()
    const run = Effect.runForkWith(runtime)

    // Stream.callback pattern from v4
    // The callback receives a queue and must return an Effect for setup/cleanup
    const events = Stream.callback<
      [GeneratorOptions, Deferred.Deferred<void, unknown>],
      never
    >((queue) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          // Setup del generator handler de Prisma (sync callback)
          generatorHelper.generatorHandler({
            onManifest() {
              return {
                defaultOutput: "../generated/effect",
                prettyName: "Prisma Effect Generator",
                requiresEngines: [],
              }
            },
            async onGenerate(options) {
              // Use Effect.runFork to execute effects from async callback
              // This maintains effect tracking while being called from external async code
              run(
                Effect.gen(function*() {
                  const deferred = yield* Deferred.make<void, unknown>()
                  // Emit to stream via Queue.offer (v4 API)
                  yield* Queue.offer(queue, [options, deferred])
                  // Wait for generator.generate to complete (Stream.runForEach will complete deferred)
                  yield* Deferred.await(deferred)
                }),
              )
            },
          })
        }),
        // Cleanup - nothing to release for prisma generator
        () => Effect.void,
      )
    )

    yield* events.pipe(
      Stream.runForEach((item) => {
        const [options, deferred] = item
        return generator.generate.pipe(
          Effect.provide(Layer.succeed(GeneratorContext, options)),
          Effect.flatMap(() => Deferred.complete(deferred, Effect.void)),
          Effect.catchCause((cause: Cause.Cause<unknown>) => Deferred.complete(deferred, Effect.failCause(cause))),
        )
      }),
    )
  }))
