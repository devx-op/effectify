import type { Plugin } from "vite"
import type * as Loom from "@effectify/loom"
import { LoomVite } from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const options: LoomVite.Options = {
  root: "src/app.ts",
  clientEntry: "/src/entry-client.ts",
  payloadElementId: "loom-payload",
}

const plugin: Plugin = LoomVite.loom(options)
const defaults = LoomVite.loom()
const bootstrap = LoomVite.bootstrap(document, {
  payloadElementId: "loom-payload",
})

const unsupportedRendererOptions: LoomVite.Options = {
  root: "src/app.ts",
  // @ts-expect-error non-web renderers remain out of scope for this web-only adapter
  renderer: "native",
}

LoomVite.loom(unsupportedRendererOptions)

type OptionsContract = Expect<Equal<Parameters<typeof LoomVite.loom>[0], LoomVite.Options | undefined>>
type BootstrapContract = Expect<Equal<typeof bootstrap, Promise<LoomVite.LoomBootstrapResult>>>
type BootstrapDiagnosticSummaryContract = Expect<
  Equal<Awaited<typeof bootstrap>["diagnosticSummary"], ReadonlyArray<Loom.Diagnostics.Summary>>
>

export const typecheckSmoke = {
  bootstrap,
  plugin,
  defaults,
}

export type { BootstrapContract, BootstrapDiagnosticSummaryContract, OptionsContract }
