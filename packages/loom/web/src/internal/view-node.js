import * as pipeable from "./pipeable.js"
export const wrap = (node) => pipeable.make(node)
export const mapElement = (node, transform) => wrap(node._tag === "Element" ? transform(node) : node)
