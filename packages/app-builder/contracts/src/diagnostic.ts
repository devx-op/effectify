import * as Schema from "effect/Schema"
import { decodeStrict, MalformedDiagnostic } from "./outcome-failure.js"

export const DiagnosticSeverity = Schema.Literals(["info", "warning", "error"])
export type DiagnosticSeverity = typeof DiagnosticSeverity.Type

export const DiagnosticPathSegment = Schema.Union([Schema.String, Schema.Number])
export type DiagnosticPathSegment = typeof DiagnosticPathSegment.Type

export const Diagnostic = Schema.Struct({
  severity: DiagnosticSeverity,
  code: Schema.NonEmptyString,
  message: Schema.NonEmptyString,
  path: Schema.optionalKey(Schema.Array(DiagnosticPathSegment)),
})
export type Diagnostic = typeof Diagnostic.Type

export const decodeDiagnostic = (input: unknown) => decodeStrict(Diagnostic, input, () => new MalformedDiagnostic())
