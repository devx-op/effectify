#!/usr/bin/env -S pnpm dlx tsx

import * as Command from '@effect/cli/Command'
import * as NodeContext from '@effect/platform-node/NodeContext'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import generatorHelper from '@prisma/generator-helper'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { generateEffectCommand } from './commands/generate-effect.js'
import { generateSqlSchemaCommand } from './commands/generate-sql-schema.js'
import { initCommand } from './commands/init.js'
import { GeneratorService } from './services/generator-service.js'
import { RenderService } from './services/render-service.js'

const runGeneratorHandler = Effect.gen(function* () {
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

// Main CLI command
const prisma = Command.make('prisma', {}, () =>
  Effect.gen(function* () {
    // Check if running as a generator via Prisma
    if (process.env.PRISMA_GENERATOR_INVOCATION) {
      yield* runGeneratorHandler
    } else {
      yield* Console.log('🚀 prisma CLI - Use --help to see available commands')
    }
  }),
).pipe(Command.withSubcommands([initCommand, generateEffectCommand, generateSqlSchemaCommand]))

// Run the CLI
const cli = Command.run(prisma, {
  name: '@effectify/prisma CLI',
  version: '0.1.0',
})

// Layer composition for the CLI execution
const GeneratorLayer = GeneratorService.Live.pipe(Layer.provide(RenderService.Live), Layer.provide(NodeContext.layer))

const MainLayer = Layer.mergeAll(GeneratorLayer, NodeContext.layer)

cli(process.argv).pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
