import type * as NodeContext from '@effect/platform-node/NodeContext'
import generatorHelper from '@prisma/generator-helper'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Runtime from 'effect/Runtime'
import { GeneratorContext } from '../services/generator-context.js'
import { GeneratorService } from '../services/generator-service.js'
import type { RenderService } from '../services/render-service.js'

export const runGeneratorHandler = Effect.gen(function* () {
  const generator = yield* GeneratorService
  const runtime = yield* Effect.runtime<GeneratorService | RenderService | NodeContext.NodeContext>()
  const run = Runtime.runPromise(runtime)

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
            await run(generator.generate.pipe(Effect.provide(Layer.succeed(GeneratorContext, options))))
          },
        })
      }),
  )
})
