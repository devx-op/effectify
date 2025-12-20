import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Eta } from 'eta'

export class RenderService extends Context.Tag('RenderService')<
  RenderService,
  {
    readonly render: (templateName: string, data: Record<string, unknown>) => Effect.Effect<string, Error>
  }
>() {
  static Live = Layer.sync(RenderService, () => {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const templatesDir = path.resolve(__dirname, '../templates')

    const eta = new Eta({
      views: templatesDir,
      autoEscape: false,
    })

    return {
      render: (templateName: string, data: Record<string, unknown>) =>
        Effect.try({
          try: () => eta.render(templateName, data),
          catch: (error) => new Error(`Failed to render template ${templateName}: ${error}`),
        }),
    }
  })
}
