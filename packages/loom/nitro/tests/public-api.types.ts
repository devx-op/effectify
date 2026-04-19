import { Html } from "@effectify/loom"
import { LoomNitro } from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

const descriptor = LoomNitro.renderer({
  rootId: "loom-root",
  render: (request) => Html.el("main", Html.children(request.url)),
})

LoomNitro.renderer({
  rootId: "loom-root",
  render: (request) => Html.el("main", Html.children(request.url)),
  // @ts-expect-error non-web renderers remain out of scope for this web-only adapter
  renderer: "native",
})

type RenderResult = Awaited<ReturnType<typeof descriptor.render>>
type ResultContract = Expect<Equal<RenderResult, LoomNitro.LoomNitroRenderResult>>

export const typecheckSmoke = {
  descriptor,
}

export type { ResultContract }
