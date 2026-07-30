import * as Schema from "effect/Schema"
import { JsonFailureReason } from "./json-failure.js"

export class UnsupportedDeclarationJson extends Schema.TaggedErrorClass<UnsupportedDeclarationJson>()(
  "UnsupportedDeclarationJson",
  { reason: JsonFailureReason },
) {}

export class MalformedDeclarationMetadata extends Schema.TaggedErrorClass<MalformedDeclarationMetadata>()(
  "MalformedDeclarationMetadata",
  {},
) {}

export class DuplicateDeclarationIdentity extends Schema.TaggedErrorClass<DuplicateDeclarationIdentity>()(
  "DuplicateDeclarationIdentity",
  {},
) {}

export class IncompatibleDeclarationVersion extends Schema.TaggedErrorClass<IncompatibleDeclarationVersion>()(
  "IncompatibleDeclarationVersion",
  {},
) {}

export class DeclarationMetadataMismatch extends Schema.TaggedErrorClass<DeclarationMetadataMismatch>()(
  "DeclarationMetadataMismatch",
  {},
) {}

export class DeclarationProjectionFailure extends Schema.TaggedErrorClass<DeclarationProjectionFailure>()(
  "DeclarationProjectionFailure",
  {},
) {}

export type DeclarationFailure =
  | UnsupportedDeclarationJson
  | MalformedDeclarationMetadata
  | DuplicateDeclarationIdentity
  | IncompatibleDeclarationVersion
  | DeclarationMetadataMismatch
  | DeclarationProjectionFailure

export type DeclarationProjectionError = DeclarationFailure
