import * as Schema from "effect/Schema"

export class MalformedCertification extends Schema.TaggedErrorClass<MalformedCertification>()(
  "MalformedCertification",
  {},
) {}
export class UnknownModule extends Schema.TaggedErrorClass<UnknownModule>()("UnknownModule", {}) {}
export class DuplicateModule extends Schema.TaggedErrorClass<DuplicateModule>()("DuplicateModule", {}) {}
export class UndeclaredModuleVersion extends Schema.TaggedErrorClass<UndeclaredModuleVersion>()(
  "UndeclaredModuleVersion",
  {},
) {}
export class UndeclaredProtocolVersion extends Schema.TaggedErrorClass<UndeclaredProtocolVersion>()(
  "UndeclaredProtocolVersion",
  {},
) {}
export class SchemaMismatch extends Schema.TaggedErrorClass<SchemaMismatch>()("SchemaMismatch", {}) {}

export type CompatibilityFailure =
  | MalformedCertification
  | UnknownModule
  | DuplicateModule
  | UndeclaredModuleVersion
  | UndeclaredProtocolVersion
  | SchemaMismatch
