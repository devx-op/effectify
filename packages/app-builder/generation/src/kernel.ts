import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
const IdentifierSchema = Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]*$/))
const SafeRelativePathSchema = Schema.String.check(
  Schema.isPattern(/^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/),
)
const SourceDigestSchema = Schema.String.check(Schema.isPattern(/^sha256:[A-Za-z0-9._-]+$/))
const ScopeSchema = Schema.String.check(Schema.isPattern(/^@[a-z][a-z0-9-]*$/))
const PackageNameSchema = Schema.String.check(Schema.isPattern(/^@[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/))
export const Identifier = IdentifierSchema.pipe(Schema.brand("Identifier"))
export const SafeRelativePath = SafeRelativePathSchema.pipe(Schema.brand("SafeRelativePath"))
export const SourceDigest = SourceDigestSchema.pipe(Schema.brand("SourceDigest"))
const CapabilitySchema = IdentifierSchema.pipe(Schema.brand("Capability"))
export type Identifier = Schema.Schema.Type<typeof Identifier>
export type GeneratorId = Identifier
export type OwnerId = Identifier
export type PackageId = Identifier
export type SafeRelativePath = Schema.Schema.Type<typeof SafeRelativePath>
export type SourceDigest = Schema.Schema.Type<typeof SourceDigest>
export type SurfaceId = Identifier
export type Capability<Name extends string = string> = Schema.Schema.Type<typeof CapabilitySchema> & Name
export const capability = <const Name extends string>(value: Name): Capability<Name> =>
  Schema.decodeUnknownSync(CapabilitySchema)(value) as Capability<Name>
export const capabilities = <const Names extends readonly string[]>(...values: Names) =>
  values.map(capability) as { readonly [Index in keyof Names]: Capability<Extract<Names[Index], string>> }
export const identifier = (value: unknown): Identifier => Schema.decodeUnknownSync(Identifier)(value)
export const safeRelativePath = (value: unknown): SafeRelativePath => Schema.decodeUnknownSync(SafeRelativePath)(value)
export const sourceDigest = (value: unknown): SourceDigest => Schema.decodeUnknownSync(SourceDigest)(value)
export interface FileContribution {
  readonly bytes: Uint8Array
  readonly mode: string
  readonly owner: OwnerId
  readonly package: PackageId | "workspace"
  readonly path: SafeRelativePath
  readonly sourceDigest: SourceDigest
  readonly surface: SurfaceId
}
export interface AtomicGenerator<
  Input,
  Provides extends Capability = Capability,
  Requires extends Capability = Capability,
> {
  readonly InputSchema: Schema.ConstraintDecoder<Input>
  readonly id: GeneratorId
  readonly provides: ReadonlyArray<Provides>
  readonly requires: ReadonlyArray<Requires>
  readonly version: string
  render(input: Input, context: RenderContext): Effect.Effect<ReadonlyArray<FileContribution>, GenerationFailure>
}
export const atomicGenerator = <Input, Provides extends Capability, Requires extends Capability>(
  generator: AtomicGenerator<Input, Provides, Requires>,
): AtomicGenerator<Input, Provides, Requires> =>
  Object.freeze({
    ...generator,
    provides: Object.freeze([...generator.provides]),
    requires: Object.freeze([...generator.requires]),
  })
type CatalogGenerator = AtomicGenerator<unknown>
type CatalogTuple = readonly [CatalogGenerator, ...CatalogGenerator[]]
type ProvidesOf<Generators extends CatalogTuple> =
  Generators[number] extends AtomicGenerator<unknown, infer Provides> ? Provides : never
type RequiresOf<Generators extends CatalogTuple> =
  Generators[number] extends AtomicGenerator<unknown, Capability, infer Requires> ? Requires : never
declare const FiniteCatalogTypeId: unique symbol
export type FiniteCatalog<Generators extends CatalogTuple = CatalogTuple> = Readonly<Generators> & {
  readonly [FiniteCatalogTypeId]: "effectify.finite-catalog/1"
}
export const defineCatalog = <const Generators extends CatalogTuple>(
  generators: Generators & (Exclude<RequiresOf<Generators>, ProvidesOf<Generators>> extends never ? unknown : never),
): FiniteCatalog<Generators> => Object.freeze(generators.map(atomicGenerator)) as FiniteCatalog<Generators>
export class SchemaContextFailure extends Schema.TaggedErrorClass<SchemaContextFailure>()("SchemaContextFailure", {
  boundary: Schema.Literals(["intent", "context"]),
  reason: Schema.Literals(["schema", "derived-identity"]),
}) {}
export class CapabilityGraphFailure extends Schema.TaggedErrorClass<CapabilityGraphFailure>()(
  "CapabilityGraphFailure",
  {
    capability: Schema.String,
    reason: Schema.Literals(["missing-capability", "cyclic-capability", "duplicate-generator-id"]),
  },
) {}
export class ContributionConflict extends Schema.TaggedErrorClass<ContributionConflict>()("ContributionConflict", {
  identity: Schema.String,
  reason: Schema.Literals(["duplicate-provider", "duplicate-owner", "duplicate-path"]),
}) {}
export class RenderFailure extends Schema.TaggedErrorClass<RenderFailure>()("RenderFailure", {
  generatorId: Schema.String,
  path: Schema.optionalKey(Schema.String),
  reason: Schema.Literals(["nondeterministic-render", "unsafe-path"]),
}) {}
export const PackageTargetSchema = Schema.Struct({ id: Identifier, name: PackageNameSchema, root: SafeRelativePath })
export type PackageTarget = Schema.Schema.Type<typeof PackageTargetSchema>
export const RenderContextSchema = Schema.Struct({
  version: Schema.Literal("effectify.render-context/1"),
  workspace: Schema.Struct({ name: IdentifierSchema, npmScope: ScopeSchema }),
  domain: Schema.Struct({ id: IdentifierSchema, importName: PackageNameSchema }),
  entity: Schema.Struct({
    id: IdentifierSchema,
    singular: Schema.String.check(Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/)),
    plural: Schema.String.check(Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/)),
    importName: PackageNameSchema,
  }),
  packages: Schema.Array(PackageTargetSchema),
})
export type RenderContext = Schema.Schema.Type<typeof RenderContextSchema>
const unique = (values: ReadonlyArray<string>): boolean => new Set(values).size === values.length
const validate = (context: RenderContext): Effect.Effect<RenderContext, SchemaContextFailure> => {
  const packages = context.packages
  const names = new Set(packages.map((target) => target.name))
  const valid =
    packages.length > 0 &&
    unique(packages.map((target) => target.id)) &&
    unique(packages.map((target) => target.name)) &&
    unique(packages.map((target) => target.root)) &&
    packages.every((target) => target.name.startsWith(`${context.workspace.npmScope}/`)) &&
    names.has(context.domain.importName) &&
    names.has(context.entity.importName)
  return valid
    ? Effect.succeed(
        Object.freeze({ ...context, packages: Object.freeze(packages.map((target) => Object.freeze({ ...target }))) }),
      )
    : Effect.fail(new SchemaContextFailure({ boundary: "context", reason: "derived-identity" }))
}
export const decodeRenderContext = (input: unknown): Effect.Effect<RenderContext, SchemaContextFailure> =>
  Schema.decodeUnknownEffect(RenderContextSchema, { onExcessProperty: "error" })(input).pipe(
    Effect.mapError(() => new SchemaContextFailure({ boundary: "context", reason: "schema" })),
    Effect.flatMap(validate),
  )
export type GenerationFailure = SchemaContextFailure | CapabilityGraphFailure | ContributionConflict | RenderFailure
