import type { GeneratorOptions } from "@prisma/generator-helper"
import * as ServiceMap from "effect/ServiceMap"

export class GeneratorContext extends ServiceMap.Service<
  GeneratorContext,
  GeneratorOptions
>()("GeneratorContext") {}
