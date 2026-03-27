#!/usr/bin/env node

import * as Command from "effect/unstable/cli/Command"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { initCommand } from "./commands/init.js"
import { prismaCommand } from "./commands/prisma.js"
import { GeneratorService } from "./services/generator-service.js"
import { RenderService } from "./services/render-service.js"
import { FormatterService } from "./services/formatter-service.js"
import { GenerateSchemnaService } from "./schema-generator/index.js"

const cli = Command.run(
  prismaCommand.pipe(Command.withSubcommands([initCommand])),
  {
    version: "0.1.0",
  },
)

const GeneratorLayer = GeneratorService.layer.pipe(
  Layer.provide(RenderService.layer),
  Layer.provide(FormatterService.layer),
  Layer.provide(NodeServices.layer),
  Layer.provide(GenerateSchemnaService.layer),
)

const MainLayer = Layer.mergeAll(
  GeneratorLayer,
  RenderService.layer,
  FormatterService.layer,
  GenerateSchemnaService.layer,
).pipe(Layer.provideMerge(NodeServices.layer))

cli.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
