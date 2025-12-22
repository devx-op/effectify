#!/usr/bin/env -S pnpm dlx tsx

import * as Command from '@effect/cli/Command'
import * as NodeContext from '@effect/platform-node/NodeContext'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { initCommand } from './commands/init.js'
import { prismaCommand } from './commands/prisma.js'
import { GeneratorService } from './services/generator-service.js'
import { RenderService } from './services/render-service.js'

// Run the CLI
const cli = Command.run(prismaCommand.pipe(Command.withSubcommands([initCommand])), {
  name: '@effectify/prisma CLI',
  version: '0.1.0',
})

// Layer composition for the CLI execution
const GeneratorLayer = GeneratorService.Live.pipe(Layer.provide(RenderService.Live), Layer.provide(NodeContext.layer))

const MainLayer = Layer.mergeAll(GeneratorLayer, RenderService.Live, NodeContext.layer)

cli(process.argv).pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
