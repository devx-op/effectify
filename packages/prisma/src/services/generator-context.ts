import type { GeneratorOptions } from '@prisma/generator-helper'
import * as Context from 'effect/Context'

export class GeneratorContext extends Context.Tag('GeneratorContext')<GeneratorContext, GeneratorOptions>() {}
