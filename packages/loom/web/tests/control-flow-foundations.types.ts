import * as LoomCore from "@effectify/loom-core"
import { View } from "../src/index.js"

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
  ? true
  : false
type Expect<Value extends true> = Value

let visible = true
let items = ["alpha", "beta"]

const branch = LoomCore.Ast.ifNode(
  () => visible,
  View.text("visible"),
  View.text("hidden"),
)

const list = LoomCore.Ast.forEach(
  () => items,
  (item, index) => View.text(`${index}:${item}`),
  View.text("empty"),
)

const reactiveWhen = View.when(() => visible, View.text("yes"), View.text("no"))

type IfNodeContract = Expect<Equal<typeof branch, LoomCore.Ast.IfNode>>
type ForNodeContract = Expect<Equal<typeof list, LoomCore.Ast.ForNode<string, number>>>
type ViewWhenContract = Expect<Equal<typeof reactiveWhen, View.Type>>

export const typecheckControlFlow = {
  branch,
  list,
  reactiveWhen,
}

export type { ForNodeContract, IfNodeContract, ViewWhenContract }
