import * as Command from '@effect/cli/Command'
import type * as NodeContext from '@effect/platform-node/NodeContext'
import type { GeneratorOptions } from '@prisma/generator-helper'
import generatorHelper from '@prisma/generator-helper'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Runtime from 'effect/Runtime'
import * as Stream from 'effect/Stream'
import { GeneratorContext } from '../services/generator-context.js'
import { GeneratorService } from '../services/generator-service.js'
import type { RenderService } from '../services/render-service.js'

export const prismaCommand = Command.make('prisma', {}, () =>
  Effect.gen(function* () {
    const generator = yield* GeneratorService
    const runtime = yield* Effect.runtime<GeneratorService | RenderService | NodeContext.NodeContext>()
    const run = Runtime.runPromise(runtime)

    const events = Stream.async<[GeneratorOptions, Deferred.Deferred<void, unknown>]>((emit) => {
      generatorHelper.generatorHandler({
        onManifest() {
          return {
            defaultOutput: '../generated/effect',
            prettyName: 'Prisma Effect Generator',
            requiresEngines: [],
          }
        },
        async onGenerate(options) {
          await run(
            Effect.gen(function* () {
              const deferred = yield* Deferred.make<void, unknown>()
              yield* Effect.promise(() => emit.single([options, deferred]))
              yield* Deferred.await(deferred)
            }),
          )
          // Cerrar el stream después de procesar la generación
          emit.end()
        },
      })
    })

    yield* events.pipe(
      Stream.runForEach(([options, deferred]) =>
        generator.generate.pipe(
          Effect.provide(Layer.succeed(GeneratorContext, options)),
          Effect.intoDeferred(deferred),
        ),
      ),
    )
  }),
)
