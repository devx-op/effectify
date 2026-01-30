#!/usr/bin/env node

import * as Command from "@effect/cli/Command"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { addCommand } from "./commands/add.js"
import { createCommand } from "./commands/create.js"
import { initCommand } from "./commands/init.js"
import { registryCommand } from "./commands/registry.js"

// Main CLI command
const effectify = Command.make(
  "effectify",
  {},
  () => Console.log("🚀 Effectify CLI - Use --help to see available commands"),
).pipe(Command.withSubcommands([createCommand, addCommand, initCommand, registryCommand]))

// Run the CLI
const cli = Command.run(effectify, {
  name: "Effectify CLI",
  version: "0.1.0",
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
