export interface MountedRange {
  readonly owner: string
  readonly start: Comment
  readonly end: Comment
  readonly nodes: readonly [Comment, Comment]
  readonly replace: (nodes: ReadonlyArray<Node>) => void
}
export declare const makeMountedRange: (owner: string, document?: Document) => MountedRange
