#!/usr/bin/env -S pnpm dlx tsx

import * as Command from '@effect/cli/Command'
import * as NodeContext from '@effect/platform-node/NodeContext'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { generateEffectCommand } from './commands/generate-effect.js'
import { generateSqlSchemaCommand } from './commands/generate-sql-schema.js'
import { initCommand } from './commands/init.js'
import { runGeneratorHandler } from './commands/prisma-generator-handler.js'
import { GeneratorService } from './services/generator-service.js'
import { RenderService } from './services/render-service.js'

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
)

// Run the CLI
const cli = Command.run(
  prisma.pipe(Command.withSubcommands([initCommand, generateEffectCommand, generateSqlSchemaCommand])),
  {
    name: '@effectify/prisma CLI',
    version: '0.1.0',
  },
)

// Layer composition for the CLI execution
const GeneratorLayer = GeneratorService.Live.pipe(Layer.provide(RenderService.Live), Layer.provide(NodeContext.layer))

const MainLayer = Layer.mergeAll(GeneratorLayer, NodeContext.layer)

cli(process.argv).pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
