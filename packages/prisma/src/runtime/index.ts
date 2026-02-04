import { Schema } from "effect"
import * as AST from "effect/SchemaAST"
import type {
  ColumnType as KyselyColumnType,
  Generated as KyselyGenerated,
  Insertable as KyselyInsertable,
  Selectable as KyselySelectable,
  Updateable as KyselyUpdateable,
} from "kysely"

/**
 * Runtime helpers for Kysely schema integration
 * These are imported by generated code
 *
 * ## Type Extraction Patterns
 *
 * For Effect Schemas (recommended - full type safety):
 * ```typescript
 * import { Selectable, Insertable, Updateable } from '@effectify/prisma';
 * import { User } from './generated/types';
 *
 * type UserSelect = Selectable<User>;
 * type UserInsert = Insertable<User>;
 * type UserUpdate = Updateable<User>;
 * ```
 *
 * Note: This package exports branded versions of ColumnType and Generated that
 * are compatible with Effect Schema's type inference. These extend the base
 * select type (S) while carrying phantom insert/update type information.
 */

// Re-export Kysely's native type utilities with aliases for advanced use cases
export type { KyselyColumnType, KyselyGenerated, KyselyInsertable, KyselySelectable, KyselyUpdateable }

export const ColumnTypeId = Symbol.for("/ColumnTypeId")
export const GeneratedId = Symbol.for("/GeneratedId")

/**
 * Symbol for VariantMarker - used in mapped type pattern that survives declaration emit.
 */
export const VariantTypeId: unique symbol = Symbol.for("@effectify/prisma/VariantType")
export type VariantTypeId = typeof VariantTypeId

// ============================================================================
// Branded Type Definitions (Override Kysely's types)
// ============================================================================
// These branded types extend S while carrying phantom insert/update information.
// Unlike Kysely's ColumnType<S,I,U> = { __select__: S, __insert__: I, __update__: U },
// our branded types ARE subtypes of S, so Schema.make<ColumnType<...>>(ast) works.

/**
 * Variant marker using mapped type pattern from Effect's Brand.
 *
 * TypeScript cannot simplify mapped types that depend on generic parameters.
 * This ensures the variant information survives declaration emit (.d.ts generation).
 *
 * Pattern derived from Effect's Brand<K>:
 * ```typescript
 * readonly [BrandTypeId]: { readonly [k in K]: K }  // Mapped type - cannot be simplified!
 * ```
 *
 * Our pattern uses a conditional type within the mapped type to encode both I and U:
 * ```typescript
 * readonly [VariantTypeId]: { readonly [K in "insert" | "update"]: K extends "insert" ? I : U }
 * ```
 */
export interface VariantMarker<in out I, in out U> {
  readonly [VariantTypeId]: {
    readonly [K in "insert" | "update"]: K extends "insert" ? I : U
  }
}

/**
 * Branded ColumnType that extends S while carrying phantom insert/update type information.
 *
 * This replaces Kysely's ColumnType because:
 * 1. Kysely's ColumnType<S,I,U> = { __select__: S, __insert__: I, __update__: U } is NOT a subtype of S
 * 2. Schema.make<KyselyColumnType<...>>(ast) doesn't work because AST represents S, not the struct
 * 3. Our ColumnType<S,I,U> = S & Brand IS a subtype of S, so Schema.make works correctly
 *
 * Includes Kysely's phantom properties (__select__, __insert__, __update__) so that:
 * 1. Kysely recognizes this as a ColumnType for INSERT/UPDATE operations
 * 2. WHERE clauses work with plain S values (not branded)
 *
 * Uses VariantMarker with mapped types to survive TypeScript declaration emit.
 *
 * Usage is identical to Kysely's ColumnType:
 * ```typescript
 * type IdField = ColumnType<string, never, never>;  // Read-only ID
 * type CreatedAt = ColumnType<Date, Date | undefined, Date>;  // Optional on insert
 * ```
 */
export type ColumnType<S, I = S, U = S> =
  & S
  & VariantMarker<I, U>
  & {
    /** Kysely extracts this type for SELECT and WHERE */
    readonly __select__: S
    /** Kysely uses this for INSERT */
    readonly __insert__: I
    /** Kysely uses this for UPDATE */
    readonly __update__: U
  }

/**
 * Base Generated brand without Kysely phantom properties.
 * Used as the __select__ return type to preserve branding on SELECT.
 *
 * Uses VariantMarker<T | undefined, T> so that Generated fields are:
 * - Optional on insert (T | undefined) - can be provided or omitted
 * - Required on update (T) - must provide value if updating
 *
 * This differs from ColumnType<S, never, never> which completely excludes
 * the field from insert (used for auto-generated IDs).
 */
type GeneratedBrand<T> =
  & T
  & VariantMarker<T | undefined, T>
  & {
    readonly [GeneratedId]: true
  }

/**
 * Branded Generated type for database-generated fields.
 *
 * Follows @effect/sql Model.Generated pattern - the field is:
 * - Required on select (T) - Kysely returns the base type
 * - Optional on insert (T | undefined) - Kysely recognizes this
 * - Allowed on update (T)
 *
 * Includes Kysely's phantom properties (__select__, __insert__, __update__) so that:
 * 1. Kysely recognizes this as a ColumnType and makes it optional on INSERT
 * 2. WHERE clauses work with plain T values (not branded)
 *
 * The Selectable<T> type utility preserves the full Generated<T> type for schema alignment.
 * Kysely operations work with the underlying T type.
 *
 * Uses VariantMarker with mapped types to survive TypeScript declaration emit.
 */
export type Generated<T> = GeneratedBrand<T> & {
  /** Kysely extracts this type for SELECT and WHERE - base type for compatibility */
  readonly __select__: T
  /** Kysely uses this for INSERT - optional */
  readonly __insert__: T | undefined
  /** Kysely uses this for UPDATE */
  readonly __update__: T
}

// ============================================================================
// Runtime Annotation Schemas
// ============================================================================

interface ColumnTypeSchemas<SType, SEncoded, SR, IType, IEncoded, IR, UType, UEncoded, UR> {
  selectSchema: Schema.Schema<SType, SEncoded, SR>
  insertSchema: Schema.Schema<IType, IEncoded, IR>
  updateSchema: Schema.Schema<UType, UEncoded, UR>
}

/**
 * Interface for ColumnType schema - preserves type parameters in declaration emit.
 *
 * Named interfaces with type parameters are preserved by TypeScript in declaration files,
 * unlike anonymous intersection types which may be simplified.
 *
 * This follows the Schema.brand pattern from Effect which returns a named interface.
 */
export interface ColumnTypeSchema<S extends Schema.Schema.All, IType, UType> extends
  Schema.Schema<
    ColumnType<Schema.Schema.Type<S>, IType, UType>,
    ColumnType<Schema.Schema.Encoded<S>, IType, UType>,
    Schema.Schema.Context<S>
  >
{
  /** The original select schema */
  readonly selectSchema: S
}

/**
 * Mark a field as having different types for select/insert/update
 * Used for ID fields with @default (read-only)
 *
 * The insert/update schemas are stored in annotations and used at runtime
 * to determine which fields to include in Insertable/Updateable schemas.
 *
 * Returns a ColumnTypeSchema which:
 * 1. Is a named interface (preserved in declaration emit)
 * 2. Contains the ColumnType<S, I, U> brand with Kysely phantom properties
 * 3. Includes the original schema via `selectSchema` property
 *
 * This enables Kysely to recognize fields with `__insert__: never` and omit them from INSERT.
 */
export const columnType = <SType, SEncoded, SR, IType, IEncoded, IR, UType, UEncoded, UR>(
  selectSchema: Schema.Schema<SType, SEncoded, SR>,
  insertSchema: Schema.Schema<IType, IEncoded, IR>,
  updateSchema: Schema.Schema<UType, UEncoded, UR>,
) => {
  const schemas: ColumnTypeSchemas<SType, SEncoded, SR, IType, IEncoded, IR, UType, UEncoded, UR> = {
    selectSchema,
    insertSchema,
    updateSchema,
  }
  // Return annotated schema with ColumnType brand at type level
  // The runtime annotation enables filtering in Insertable() function
  // The type-level brand enables Kysely to recognize INSERT/UPDATE constraints
  const annotated = selectSchema.annotations({ [ColumnTypeId]: schemas })
  return Object.assign(annotated, { selectSchema }) as ColumnTypeSchema<
    Schema.Schema<SType, SEncoded, SR>,
    IType,
    UType
  >
}

/**
 * Interface for Generated schema - preserves type parameter in declaration emit.
 *
 * Named interfaces with type parameters are preserved by TypeScript in declaration files,
 * unlike anonymous intersection types which may be simplified.
 *
 * This follows the Schema.brand pattern from Effect which returns a named interface.
 */
export interface GeneratedSchema<S extends Schema.Schema.All> extends
  Schema.Schema<
    Generated<Schema.Schema.Type<S>>,
    Generated<Schema.Schema.Encoded<S>>,
    Schema.Schema.Context<S>
  >
{
  /** The original schema before Generated wrapper */
  readonly from: S
}

/**
 * Mark a field as database-generated (omitted from insert)
 * Used for fields with @default
 *
 * Follows @effect/sql Model.Generated pattern:
 * - Present in select and update schemas
 * - OMITTED from insert schema (not optional, completely absent)
 *
 * Returns a GeneratedSchema<S> which:
 * 1. Is a named interface (preserved in declaration emit)
 * 2. Contains the Generated<T> brand using VariantMarker (mapped types survive emit)
 * 3. Includes the original schema via `from` property
 *
 * This enables CustomInsertable to filter out generated fields at compile time.
 */
export const generated = <S extends Schema.Schema.All>(schema: S) => {
  // Return annotated schema with Generated brand at type level
  // The runtime annotation enables filtering in Insertable() function
  // The type-level brand enables filtering in CustomInsertable type utility
  const annotated = schema.annotations({ [GeneratedId]: true })
  return Object.assign(annotated, { from: schema }) as GeneratedSchema<S>
}

// ============================================================================
// Type Helpers (defined early for use in schema functions)
// ============================================================================

type AnyColumnTypeSchemas = ColumnTypeSchemas<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

/**
 * Schema for validating column type annotations structure
 */
const ColumnTypeSchemasValidator = Schema.Struct({
  selectSchema: Schema.Any,
  insertSchema: Schema.Any,
  updateSchema: Schema.Any,
})

/**
 * Extract and validate column type schemas from AST annotations
 * Returns null if not a column type or validation fails
 */
function getColumnTypeSchemas(ast: AST.AST) {
  if (!(ColumnTypeId in ast.annotations)) {
    return null
  }

  const annotation = ast.annotations[ColumnTypeId]
  const decoded = Schema.decodeUnknownOption(ColumnTypeSchemasValidator)(annotation)

  if (decoded._tag === "None") {
    return null
  }

  // The decoded value has the correct structure, and the annotation
  // was created by columnType() which ensures proper Schema types
  return annotation as AnyColumnTypeSchemas
}

const isGeneratedType = (ast: AST.AST) => GeneratedId in ast.annotations

const isOptionalType = (ast: AST.AST) => {
  // Check for Union(T, Undefined) or Union(T, null) patterns
  // These are optional on insert because omitting = NULL in DB
  if (!AST.isUnion(ast)) {
    return false
  }

  return (
    ast.types.some((t: AST.AST) => AST.isUndefinedKeyword(t)) ||
    ast.types.some((t: AST.AST) => isNullType(t))
  )
}

const isNullType = (ast: AST.AST) =>
  AST.isLiteral(ast) &&
  Object.entries(ast.annotations).find(
    ([sym, value]) => sym === AST.IdentifierAnnotationId.toString() && value === "null",
  )

/**
 * Strip null from a union type for Insertable fields.
 * For INSERT operations, omitting a field = null in DB, so we don't need explicit null.
 * Returns the non-null type if it's a union with null, otherwise returns the original type.
 */
const stripNullFromUnion = (ast: AST.AST): AST.AST => {
  if (!AST.isUnion(ast)) {
    return ast
  }

  // Filter out null types from the union
  const nonNullTypes = ast.types.filter((t: AST.AST) => !isNullType(t))

  // If only one type remains, return it directly (unwrap single-element union)
  if (nonNullTypes.length === 1) {
    return nonNullTypes[0]
  }

  // If multiple types remain, create a new union without null
  if (nonNullTypes.length > 1) {
    return AST.Union.make(nonNullTypes)
  }

  // Edge case: all types were null (shouldn't happen in practice)
  return ast
}

const extractParametersFromTypeLiteral = (
  ast: AST.TypeLiteral,
  schemaType: keyof AnyColumnTypeSchemas,
) => {
  return ast.propertySignatures
    .map((prop: AST.PropertySignature) => {
      const columnSchemas = getColumnTypeSchemas(prop.type)

      if (columnSchemas !== null) {
        const targetSchema = columnSchemas[schemaType]

        // Check for Schema.Never BEFORE mutable transformation
        // Schema.mutable() wraps in Transformation node, changing _tag
        if (AST.isNeverKeyword(targetSchema.ast)) {
          return null // Will be filtered out
        }

        // Use Schema.mutable() for insert/update schema to make arrays mutable
        // Kysely expects mutable T[] for insert/update operations
        const shouldBeMutable = schemaType === "updateSchema" || schemaType === "insertSchema"
        return new AST.PropertySignature(
          prop.name,
          shouldBeMutable ? Schema.mutable(targetSchema).ast : targetSchema.ast,
          prop.isOptional,
          prop.isReadonly,
          prop.annotations,
        )
      }

      // Handle Generated fields for Selectable - need to unwrap the base type
      // Generated<T> annotates the schema but we want plain T for select
      if (schemaType === "selectSchema" && isGeneratedType(prop.type)) {
        // Generated fields have the base schema stored in annotations
        // The AST is the annotated version of the base schema, so just strip annotations
        // Get the underlying type by removing the Generated annotation
        const baseAst = AST.annotations(prop.type, {
          ...prop.type.annotations,
          [GeneratedId]: undefined,
          [ColumnTypeId]: undefined,
        })
        return new AST.PropertySignature(
          prop.name,
          baseAst,
          prop.isOptional,
          prop.isReadonly,
          prop.annotations,
        )
      }

      // Apply Schema.mutable() to regular fields for insert/updateSchema to make arrays mutable
      // Safe for all types - no-op for non-arrays
      if (schemaType === "updateSchema" || schemaType === "insertSchema") {
        return new AST.PropertySignature(
          prop.name,
          Schema.mutable(Schema.asSchema(Schema.make(prop.type))).ast,
          prop.isOptional,
          prop.isReadonly,
          prop.annotations,
        )
      }

      // Regular fields - return as-is
      return prop
    })
    .filter((prop): prop is AST.PropertySignature => prop !== null)
}

// ============================================================================
// Custom Type Utilities for Insert/Update
// ============================================================================
// Kysely's Insertable/Updateable don't properly omit fields with `never` insert types.
// These custom types handle ColumnType and Generated correctly.

/**
 * Extract the insert type from a field using the __insert__ phantom property:
 * - ColumnType<S, I, U> -> I (via __insert__)
 * - Generated<T> -> T | undefined (via __insert__)
 * - Other types -> as-is
 *
 * Uses the __insert__ property which is always present on ColumnType and Generated.
 * This approach is more reliable across module boundaries than using VariantMarker
 * with unique symbols, which can cause type matching failures when TypeScript
 * compiles from source files with different symbol references.
 */
type ExtractInsertType<T> = T extends { readonly __insert__: infer I } ? I
  : T extends { [VariantTypeId]: { insert: infer I } } ? I
  : T

/**
 * Check if a type is nullable (includes null or undefined).
 * Matches Kysely's IfNullable behavior:
 *   type IfNullable<T, K> = undefined extends T ? K : null extends T ? K : never;
 *
 * A field is optional for insert if its InsertType can be null or undefined.
 */
type IsOptionalInsert<T> = undefined extends ExtractInsertType<T> ? true
  : null extends ExtractInsertType<T> ? true
  : false

/**
 * Extract the base type without null/undefined for optional fields.
 * Keeps the type as-is (including null) for the property type,
 * since the optionality is expressed via `?` not the type itself.
 */
type ExtractInsertBaseType<T> = ExtractInsertType<T>

/**
 * Extract the update type from a field using the __update__ phantom property:
 * - ColumnType<S, I, U> -> U (via __update__)
 * - Generated<T> -> T (via __update__)
 * - Other types -> as-is
 *
 * Uses the __update__ property which is always present on ColumnType and Generated.
 * This approach is more reliable across module boundaries than using VariantMarker
 * with unique symbols, which can cause type matching failures when TypeScript
 * compiles from source files with different symbol references.
 */
type ExtractUpdateType<T> = T extends { readonly __update__: infer U } ? U
  : T extends { [VariantTypeId]: { update: infer U } } ? U
  : T

/**
 * Custom Insertable type that:
 * - Omits fields with `never` insert type (read-only IDs)
 * - Makes fields with `T | undefined` insert type optional with type T
 * - Keeps other fields required
 */
type CustomInsertable<T> =
  & {
    [
      K in keyof T as ExtractInsertType<T[K]> extends never ? never
        : IsOptionalInsert<T[K]> extends true ? never
        : K
    ]: ExtractInsertType<T[K]>
  }
  & {
    // Optional fields (insert type includes undefined)
    [
      K in keyof T as ExtractInsertType<T[K]> extends never ? never
        : IsOptionalInsert<T[K]> extends true ? K
        : never
    ]?: ExtractInsertBaseType<T[K]>
  }

/**
 * Custom Updateable type that properly omits fields with `never` update types.
 */
type CustomUpdateable<T> = {
  [K in keyof T as ExtractUpdateType<T[K]> extends never ? never : K]?: ExtractUpdateType<T[K]>
}

// Legacy aliases for backwards compatibility
type MutableInsert<Type> = CustomInsertable<Type>
type MutableUpdate<Type> = CustomUpdateable<Type>

// ============================================================================
// Stripping Type Utilities (needed for Selectable function return type)
// ============================================================================

/**
 * Strip Generated<T> wrapper, returning the underlying type T.
 * For non-Generated types, returns as-is.
 * Preserves branded foreign keys (UserId, ProductId, etc.).
 */
type StripGeneratedWrapper<T> = T extends GeneratedBrand<infer U> ? U : T

/**
 * Strip ColumnType wrapper, extracting the select type S.
 * Must check AFTER Generated because Generated<T> also has __select__.
 * Uses __insert__ existence to differentiate ColumnType from other types.
 */
type StripColumnTypeWrapper<T> = T extends {
  readonly __select__: infer S
  readonly __insert__: unknown
} ? S
  : T

/**
 * Strip all Kysely wrappers (Generated, ColumnType) from a field type.
 * Order matters: check Generated first, then ColumnType.
 * Preserves branded foreign keys (UserId, ProductId, etc.).
 */
type StripKyselyWrapper<T> = StripColumnTypeWrapper<StripGeneratedWrapper<T>>

/**
 * Strip Kysely wrappers from all fields in a type.
 * Preserves branded foreign keys (UserId, ProductId, etc.).
 */
type StripKyselyWrappersFromObject<T> = {
  readonly [K in keyof T]: StripKyselyWrapper<T[K]>
}

// ============================================================================
// Schema Functions
// ============================================================================

export function Selectable<Type, Encoded>(
  schema: Schema.Schema<Type, Encoded>,
): Schema.Schema<
  StripKyselyWrappersFromObject<Type>,
  StripKyselyWrappersFromObject<Encoded>,
  never
> {
  // Strip Generated/ColumnType wrappers to match what Kysely returns from queries
  // Branded foreign keys (UserId, ProductId) are preserved
  const { ast } = schema
  if (!AST.isTypeLiteral(ast)) {
    // Non-struct schemas: use as identity
    // Internal cast needed because Schema.make(ast) returns unknown types
    // The return type annotation is what TypeScript uses for declaration emit
    return Schema.asSchema(Schema.make(ast)) as Schema.Schema<
      StripKyselyWrappersFromObject<Type>,
      StripKyselyWrappersFromObject<Encoded>,
      never
    >
  }
  // Extract select schemas from annotated fields (strips wrappers at runtime)
  return Schema.asSchema(
    Schema.make(
      new AST.TypeLiteral(
        extractParametersFromTypeLiteral(ast, "selectSchema"),
        ast.indexSignatures,
        ast.annotations,
      ),
    ),
  ) as Schema.Schema<
    StripKyselyWrappersFromObject<Type>,
    StripKyselyWrappersFromObject<Encoded>,
    never
  >
}

/**
 * Create Insertable schema from base schema
 * Generated fields (@default) are made optional, not excluded
 */
export function Insertable<Type, Encoded>(schema: Schema.Schema<Type, Encoded>) {
  const { ast } = schema
  if (!AST.isTypeLiteral(ast)) {
    // Internal cast - return type annotation is what TypeScript uses for declaration emit
    return Schema.asSchema(Schema.make(ast)) as Schema.Schema<
      MutableInsert<Type>,
      MutableInsert<Encoded>,
      never
    >
  }

  const extracted = extractParametersFromTypeLiteral(ast, "insertSchema")

  const fields = extracted.map((prop) => {
    // Check if this is a Generated field - make it optional
    const isGenerated = isGeneratedType(prop.type)

    // Make Union(T, null) fields optional and strip null from the type
    // For INSERT, omitting a field = null in DB, so explicit null is unnecessary
    const isOptional = isOptionalType(prop.type) || isGenerated

    // For generated fields, unwrap the base type from the Generated annotation
    let fieldType = prop.type
    if (isGenerated) {
      // Strip the Generated annotation to get the base type
      fieldType = AST.annotations(prop.type, {
        ...prop.type.annotations,
        [GeneratedId]: undefined,
      })
    } else if (isOptionalType(prop.type)) {
      fieldType = stripNullFromUnion(prop.type)
    }

    return new AST.PropertySignature(
      prop.name,
      fieldType,
      isOptional,
      prop.isReadonly,
      prop.annotations,
    )
  })

  return Schema.asSchema(
    Schema.make(new AST.TypeLiteral(fields, ast.indexSignatures, ast.annotations)),
  ) as Schema.Schema<MutableInsert<Type>, MutableInsert<Encoded>, never>
}

/**
 * Create Updateable schema from base schema
 */
export function Updateable<Type, Encoded>(schema: Schema.Schema<Type, Encoded>) {
  const { ast } = schema
  if (!AST.isTypeLiteral(ast)) {
    // Internal cast - return type annotation is what TypeScript uses for declaration emit
    return Schema.asSchema(Schema.make(ast)) as Schema.Schema<
      MutableUpdate<Type>,
      MutableUpdate<Encoded>,
      never
    >
  }

  const extracted = extractParametersFromTypeLiteral(ast, "updateSchema")

  const res = new AST.TypeLiteral(
    extracted.map(
      (prop) =>
        new AST.PropertySignature(
          prop.name,
          AST.Union.make([prop.type, new AST.UndefinedKeyword()]),
          true,
          prop.isReadonly,
          prop.annotations,
        ),
    ),
    ast.indexSignatures,
    ast.annotations,
  )

  return Schema.asSchema(Schema.make(res)) as Schema.Schema<
    MutableUpdate<Type>,
    MutableUpdate<Encoded>,
    never
  >
}

// ============================================================================
// Type Utilities (Work directly with Schema types)
// Usage: Selectable<User>, Insertable<User>, Updateable<User>
// Note: Stripping types are defined earlier in the file (before schema functions)
// ============================================================================

/**
 * Extract SELECT type from schema.
 * - Preserves branded foreign keys (UserId, ProductId, etc.)
 * - Strips Generated<T> and ColumnType<S,I,U> wrappers to match what Kysely returns
 *
 * Kysely extracts __select__ for SELECT results.
 * Generated<T>/ColumnType remain in the DB interface for INSERT recognition,
 * but Selectable<T> gives you the clean type matching query results.
 *
 * @example type UserSelect = Selectable<User>;
 */
export type Selectable<T extends Schema.Schema.All> = StripKyselyWrappersFromObject<
  Schema.Schema.Type<T>
>

/**
 * Extract INSERT type from schema.
 * Omits fields with `never` insert type (read-only IDs, generated fields).
 * @example type UserInsert = Insertable<User>;
 */
export type Insertable<T extends Schema.Schema.All> = CustomInsertable<Schema.Schema.Type<T>>

/**
 * Extract UPDATE type from schema.
 * Omits fields with `never` update type, makes all fields optional.
 * @example type UserUpdate = Updateable<User>;
 */
export type Updateable<T extends Schema.Schema.All> = CustomUpdateable<Schema.Schema.Type<T>>
