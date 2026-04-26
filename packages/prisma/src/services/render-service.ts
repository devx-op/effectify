import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Eta } from "eta"
import { fileURLToPath } from "node:url"
import * as Path from "effect/Path"
import * as Data from "effect/Data"

export class RenderError extends Data.TaggedError("RenderError")<{
  templateName: string
  error: unknown
}> {
  override get message(): string {
    return `Failed to render template ${this.templateName}: ${this.error}`
  }
}

export class RenderService extends Context.Service<
  RenderService,
  {
    readonly render: (
      templateName: string,
      data: Record<string, unknown>,
    ) => Effect.Effect<string, RenderError>
  }
>()("RenderService", {
  make: Effect.gen(function*() {
    const path = yield* Path.Path
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const templatesDir = path.resolve(__dirname, "../templates")

    const eta = new Eta({
      views: templatesDir,
      autoEscape: false,
    })

    const render = (templateName: string, data: Record<string, unknown>) =>
      Effect.try({
        try: () => eta.render(templateName, data),
        catch: (error) => new RenderError({ templateName, error }),
      })
    return {
      render,
    }
  }),
}) {
  static readonly layer = Layer.effect(RenderService, this.make)
}
