import type * as LoomCore from "@effectify/loom-core"
import * as pipeable from "./pipeable.js"

export type Type = pipeable.Value<LoomCore.Ast.Node>

export const wrap = (node: LoomCore.Ast.Node): Type => pipeable.make(node)

export const mapElement = (
  node: LoomCore.Ast.Node,
  transform: (element: LoomCore.Ast.ElementNode) => LoomCore.Ast.ElementNode,
): Type => wrap(node._tag === "Element" ? transform(node) : node)
