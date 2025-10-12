#!/usr/bin/env bun

import * as Command from '@effect/cli/Command'
import * as NodeContext from '@effect/platform-node/NodeContext'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import { generateEffectCommand } from './commands/generate-effect.js'
import { generateSqlSchemaCommand } from './commands/generate-sql-schema.js'
import { initCommand } from './commands/init.js'

// Main CLI command
const prisma = Command.make('prisma', {}, () =>
  Console.log('🚀 prisma CLI - Use --help to see available commands'),
).pipe(Command.withSubcommands([initCommand, generateEffectCommand, generateSqlSchemaCommand]))

// Run the CLI
const cli = Command.run(prisma, {
  name: '@effectify/prisma CLI',
  version: '0.1.0',
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
