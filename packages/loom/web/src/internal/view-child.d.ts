import * as LoomCore from "@effectify/loom-core"
export type ViewChild =
  | LoomCore.Ast.Node
  | LoomCore.Component.Definition
  | string
  | number
  | bigint
  | ReadonlyArray<ViewChild>
  | undefined
  | null
  | false
export declare const isViewChild: (value: unknown) => value is ViewChild
export declare const normalizeViewChild: (child: ViewChild) => ReadonlyArray<LoomCore.Ast.Node>
export declare const normalizeViewChildren: (children: ReadonlyArray<ViewChild>) => ReadonlyArray<LoomCore.Ast.Node>
