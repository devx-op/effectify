/**
 * Runtime helpers for Kysely schema integration
 *
 * ## v4 Migration Note
 *
 * This module provides branded types for ColumnType and Generated that work with
 * Effect Schema v4. The runtime AST manipulation functions (columnType, generated,
 * Selectable, Insertable, Updateable) have been simplified.
 *
 * For full v4 Schema integration, consider using:
 * import { Model } from "effect/unstable/schema"
 *
 * which provides Model.Class, Model.Generated, etc.
 */

import type {
  ColumnType as KyselyColumnType,
  Generated as KyselyGenerated,
  Insertable as KyselyInsertable,
  Selectable as KyselySelectable,
  Updateable as KyselyUpdateable,
} from "kysely"

// Re-export Kysely's native type utilities with aliases for advanced use cases
export type { KyselyColumnType, KyselyGenerated, KyselyInsertable, KyselySelectable, KyselyUpdateable }

export const ColumnTypeId = Symbol.for("/ColumnTypeId")
export const GeneratedId = Symbol.for("/GeneratedId")

/**
 * Symbol for VariantMarker - used in mapped type pattern that survives declaration emit.
 */
export const VariantTypeId: unique symbol = Symbol.for(
  "@effectify/prisma/VariantType",
)
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
 * 2. Our ColumnType<S,I,U> = S & Brand IS a subtype of S, so Schema.make works correctly
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
  [
    K in keyof T as ExtractUpdateType<T[K]> extends never ? never
      : K
  ]?: ExtractUpdateType<T[K]>
}

// Legacy aliases for backwards compatibility (exported for external use)
export type MutableInsert<Type> = CustomInsertable<Type>
export type MutableUpdate<Type> = CustomUpdateable<Type>

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
// Type Utilities (Work directly with Schema types)
// Usage: Selectable<User>, Insertable<User>, Updateable<User>
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
export type Selectable<T> = StripKyselyWrappersFromObject<T>

/**
 * Extract INSERT type from schema.
 * Omits fields with `never` insert type (read-only IDs, generated fields).
 * @example type UserInsert = Insertable<User>;
 */
export type Insertable<T> = CustomInsertable<T>

/**
 * Extract UPDATE type from schema.
 * Omits fields with `never` update type, makes all fields optional.
 * @example type UserUpdate = Updateable<User>;
 */
export type Updateable<T> = CustomUpdateable<T>

// ============================================================================
// Schema Helpers for v4
// ============================================================================
// Note: The runtime schema manipulation functions have been removed.
// For full Effect Schema v4 integration with select/insert/update variants,
// use the Model system: import { Model } from "effect/unstable/schema"
//
// Example usage with Model:
//
// import { Schema } from "effect"
// import { Model } from "effect/unstable/schema"
//
// export const UserId = Schema.Number.pipe(Schema.brand("UserId"))
//
// export class User extends Model.Class<User>("User")({
//   id: Model.Generated(UserId),
//   name: Schema.String,
//   createdAt: Model.DateTimeInsertFromDate,
// }) {}
//
// User        // Select schema
// User.insert // Insert schema
// User.update // Update schema
