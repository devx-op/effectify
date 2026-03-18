import * as ServiceMap from "effect/ServiceMap"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { createFromBuffer } from "@dprint/formatter"
import { getPath } from "@dprint/typescript"
import * as fs from "node:fs"


export class FormatterService extends ServiceMap.Service<FormatterService, {
  readonly format: (code: string) => Effect.Effect<string, Error>
}>()("FormatterService", {
  make: Effect.gen(function*() {
    const buffer = fs.readFileSync(getPath())
    const formatter = createFromBuffer(buffer)

    return {
      format: (code: string) =>
        Effect.try({
          try: () => formatter.formatText({ filePath: "file.ts", fileText: code }),
          catch: (error) => new Error(`Failed to format code: ${error}`),
        }),
    }
  }),
}) {
  static readonly layer = Layer.effect(FormatterService, this.make)
}
