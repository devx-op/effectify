import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { createFromBuffer } from "@dprint/formatter"
import { getPath } from "@dprint/typescript"
import * as FileSystem from "effect/FileSystem"
import * as Data from "effect/Data"

export class FormatError extends Data.TaggedError("FormatError")<{
  error?: unknown
}> {
  override get message(): string {
    return `Format error: ${this.message}`
  }
}

export class FormatterService extends Context.Service<
  FormatterService,
  {
    readonly format: (code: string) => Effect.Effect<string, Error>
  }
>()("FormatterService", {
  make: Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const buffer = yield* fs.readFile(getPath())
    const formatter = createFromBuffer(buffer)

    return {
      format: (code: string) =>
        Effect.try({
          try: () => formatter.formatText({ filePath: "file.ts", fileText: code }),
          catch: (error) => new FormatError({ error }),
        }),
    }
  }),
}) {
  static readonly layer = Layer.effect(FormatterService, this.make)
}
