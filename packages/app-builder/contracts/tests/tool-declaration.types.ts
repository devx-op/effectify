import type { EncodedDeclaration } from "../src/tool-declaration-projection.js"
import type { Declaration } from "../src/tool-declaration.js"

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false
type Expect<Value extends true> = Value

interface Input {
  readonly path: string
}

interface Output {
  readonly text: string
}

interface OtherInput {
  readonly id: number
}

interface OtherOutput {
  readonly bytes: Uint8Array
}

interface Failure {
  readonly message: string
}

interface WorkspaceRead {
  readonly grant: "workspace:read"
}

interface WorkspaceWrite {
  readonly grant: "workspace:write"
}

declare const declaration: Declaration<Input, Output, Failure, WorkspaceRead>
declare const encoded: EncodedDeclaration<Input, Output, Failure, WorkspaceRead>

export type InputChannel = Expect<Equal<typeof declaration.input.document, import("../src/json.js").Json>>
export type OutputChannel = Expect<Equal<typeof declaration.output.document, import("../src/json.js").Json>>
export type ErrorChannel = Expect<Equal<typeof declaration.error.document, import("../src/json.js").Json>>
export type EncodedKeys = Expect<Equal<keyof typeof encoded, "ref" | "input" | "output" | "error" | "requirements">>

const preservedDeclaration: Declaration<Input, Output, Failure, WorkspaceRead> = declaration
const preservedEncoded: EncodedDeclaration<Input, Output, Failure, WorkspaceRead> = encoded

// @ts-expect-error input channels remain distinct through the passive declaration.
const rejectedInput: Declaration<OtherInput, Output, Failure, WorkspaceRead> = declaration
// @ts-expect-error output channels remain distinct through encoded projection.
const rejectedOutput: EncodedDeclaration<Input, OtherOutput, Failure, WorkspaceRead> = encoded
// @ts-expect-error the erased R channel remains invariant.
const rejectedDeclaration: Declaration<Input, Output, Failure, WorkspaceWrite> = declaration
// @ts-expect-error encoded declarations preserve invariant R without an encoded key.
const rejectedEncoded: EncodedDeclaration<Input, Output, Failure, WorkspaceWrite> = encoded

void rejectedDeclaration
void rejectedEncoded
void rejectedInput
void rejectedOutput
void preservedDeclaration
void preservedEncoded
