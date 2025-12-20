import * as NodeContext from '@effect/platform-node/NodeContext'
import generatorHelper from '@prisma/generator-helper'
import * as Effect from 'effect/Effect'
import { GeneratorService } from '../services/generator-service.js'
import { RenderService } from '../services/render-service.js'

export const runGeneratorHandler = Effect.gen(function* () {
  const generator = yield* GeneratorService

  yield* Effect.promise(
    () =>
      new Promise<void>((_resolve) => {
        generatorHelper.generatorHandler({
          onManifest() {
            return {
              defaultOutput: '../generated/effect',
              prettyName: 'Prisma Effect Generator',
              requiresEngines: [],
            }
          },
          async onGenerate(options) {
            await Effect.runPromise(
              generator.generate(options).pipe(
                // We need to provide the context here because onGenerate is called by Prisma
                // and we are starting a new Effect run
                Effect.provide(RenderService.Live),
                Effect.provide(NodeContext.layer),
              ),
            )
          },
        })
      }),
  )
})
