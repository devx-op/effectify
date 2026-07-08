import type { GeneratorOptions } from "@prisma/generator-helper"
import * as Context from "effect/Context"

export class GeneratorContext extends Context.Service<
  GeneratorContext,
  GeneratorOptions
>()("GeneratorContext") {}
