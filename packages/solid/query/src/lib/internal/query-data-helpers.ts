import type { QueryClient } from "@tanstack/query-core"

type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P]
}

export type QueryDataUpdater<TData> = (draft: DeepMutable<TData>) => void

// Simple deep clone function to replace mutative
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T
  }
  if (typeof obj === "object") {
    const cloned = {} as T
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  return obj
}

type QueryKey<TKey extends string, TVariables = void> = TVariables extends void ? readonly [TKey]
  : readonly [TKey, TVariables]

/**
 * Creates a type-safe query key factory that can be used with or without variables
 * @template TKey The string literal type for the query key
 * @template TVariables Optional variables type. If not provided, the factory will not accept variables
 * @param key The query key string
 * @returns A function that creates a query key tuple
 *
 * @example Without variables:
 * ```typescript
 * const userKey = createQueryKey("user");
 * const key = userKey(); // returns ["user"]
 * ```
 *
 * @example With variables:
 * ```typescript
 * type UserVars = { id: string };
 * const userKey = createQueryKey<"user", UserVars>("user");
 * const key = userKey({ id: "123" }); // returns ["user", { id: "123" }]
 * ```
 */
export function createQueryKey<TKey extends string, TVariables = void>(key: TKey) {
  return ((variables?: TVariables) =>
    variables === undefined ? ([key] as const) : ([key, variables] as const)) as TVariables extends void
      ? () => QueryKey<TKey>
      : (variables: TVariables) => QueryKey<TKey, TVariables>
}

type QueryDataHelpers<TData, TVariables> = {
  removeQuery: (variables: TVariables) => void
  removeAllQueries: () => void
  setData: (variables: TVariables, updater: QueryDataUpdater<TData>) => TData | undefined
  invalidateQuery: (variables: TVariables) => Promise<void>
  invalidateAllQueries: () => Promise<void>
  refetchQuery: (variables: TVariables) => Promise<void>
  refetchAllQueries: () => Promise<void>
}

/**
 * Creates a set of helpers to manage query data in the cache
 * @template TData The type of data stored in the query
 * @template TVariables Automatically inferred from the queryKey function parameter
 * @param queryKey A function that creates a query key tuple from variables
 * @returns An object with methods to remove, update, invalidate, and invalidate all query data
 *
 * @example Without variables:
 * ```typescript
 * const userKey = createQueryKey("user");
 * type User = { name: string };
 *
 * // Types are inferred from userKey
 * const helpers = createQueryDataHelpers<User>(userKey);
 * helpers.setData(undefined, (draft) => {
 *   draft.name = "New Name";
 * });
 * ```
 *
 * @example With variables and explicit types:
 * ```typescript
 * type UserVars = { id: string };
 * type User = { id: string; name: string };
 *
 * const userKey = createQueryKey<"user", UserVars>("user");
 * const helpers = createQueryDataHelpers<User, UserVars>(userKey);
 *
 * helpers.setData({ id: "123" }, (draft) => {
 *   draft.name = "New Name";
 * });
 *
 * // Other helper methods
 * await helpers.invalidateQuery({ id: "123" });
 * await helpers.refetchQuery({ id: "123" });
 * helpers.removeQuery({ id: "123" });
 * ```
 */
export const makeCreateQueryDataHelpers = (queryClient: QueryClient) =>
<TData, TVariables = void>(
  queryKey: (variables: TVariables) => readonly [string, ...unknown[]],
): QueryDataHelpers<TData, TVariables> => {
  const [namespaceKey] = queryKey(undefined as TVariables)

  return {
    removeQuery: (variables: TVariables) => {
      queryClient.removeQueries({ queryKey: queryKey(variables) })
    },
    removeAllQueries: () => {
      queryClient.removeQueries({ queryKey: [namespaceKey], exact: false })
    },
    setData: (variables: TVariables, updater: QueryDataUpdater<TData>) => {
      return queryClient.setQueryData<TData>(queryKey(variables), (oldData) => {
        if (oldData === undefined) {
          return oldData
        }
        const clonedData = deepClone(oldData)
        updater(clonedData as DeepMutable<TData>)
        return clonedData
      })
    },
    invalidateQuery: (variables: TVariables) => queryClient.invalidateQueries({ queryKey: queryKey(variables) }),
    invalidateAllQueries: () => queryClient.invalidateQueries({ queryKey: [namespaceKey], exact: false }),
    refetchQuery: (variables: TVariables) => queryClient.refetchQueries({ queryKey: queryKey(variables) }),
    refetchAllQueries: () => queryClient.refetchQueries({ queryKey: [namespaceKey], exact: false }),
  }
}
