import * as Command from '@effect/cli/Command'
import type * as NodeContext from '@effect/platform-node/NodeContext'
import generatorHelper from '@prisma/generator-helper'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Runtime from 'effect/Runtime'
import { GeneratorContext } from '../services/generator-context.js'
import { GeneratorService } from '../services/generator-service.js'
import type { RenderService } from '../services/render-service.js'

// Main CLI command
export const prismaCommand = Command.make('prisma', {}, () =>
  Effect.gen(function* () {
    if (!process.env.PRISMA_GENERATOR_INVOCATION) {
      yield* Console.log('🚀 prisma CLI - Use --help to see available commands')
    }

    const generator = yield* GeneratorService

    // We need to capture the current runtime to run the generator effect inside the Prisma callback
    // This is because Prisma's onGenerate is a callback-based API that expects a Promise
    // We use Effect.runtime() to get the current runtime which includes all the provided services
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
  }),
)
