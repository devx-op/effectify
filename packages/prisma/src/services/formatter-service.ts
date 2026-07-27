import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { format as oxfmtFormat, type FormatConfig } from "oxfmt"

const formatOptions = {
  arrowParens: "always",
  endOfLine: "lf",
  printWidth: 120,
  proseWrap: "preserve",
  semi: false,
  singleQuote: false,
  sortImports: false,
  sortPackageJson: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
} satisfies FormatConfig

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (Array.isArray(error)) {
    const messages = error.flatMap((item) => {
      if (typeof item === "object" && item !== null && "message" in item && typeof item.message === "string") {
        return [item.message]
      }
      return []
    })
    if (messages.length > 0) return messages.join("; ")
  }
  return String(error)
}

export class FormatError extends Data.TaggedError("FormatError")<{
  error: unknown
}> {
  override get message(): string {
    return `Format error: ${errorMessage(this.error)}`
  }
}

export const formatTypeScript = async (fileName: string, sourceText: string): Promise<string> => {
  try {
    const result = await oxfmtFormat(fileName, sourceText, formatOptions)
    if (result.errors.length > 0) {
      throw new FormatError({ error: result.errors })
    }
    return result.code
  } catch (error) {
    if (error instanceof FormatError) throw error
    throw new FormatError({ error })
  }
}

export class FormatterService extends Context.Service<
  FormatterService,
  {
    readonly format: (code: string) => Effect.Effect<string, FormatError>
  }
>()("FormatterService", {
  make: Effect.succeed({
    format: (code: string) =>
      Effect.tryPromise({
        try: () => formatTypeScript("file.ts", code),
        catch: (error) => (error instanceof FormatError ? error : new FormatError({ error })),
      }),
  }),
}) {
  static readonly layer = Layer.effect(FormatterService, this.make)
}
