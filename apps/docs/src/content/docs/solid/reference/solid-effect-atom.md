---
title: "@effectify/solid-effect-atom"
description: API Reference for @effectify/solid-effect-atom
sidebar:
  label: Solid Effect Atom Reference
---

## Hooks

### useAtom

Subscribes to an atom and returns a tuple of `[accessor, setter]`.

```ts
function useAtom<R, W>(
  atom: Atom.Writable<R, W>,
): [Accessor<R>, (value: W) => void]
```

### useAtomValue

Subscribes to an atom and returns its value as an accessor.

```ts
function useAtomValue<A>(atom: Atom.Atom<A>): Accessor<A>
function useAtomValue<A, B>(atom: Atom.Atom<A>, f: (a: A) => B): Accessor<B>
```

### useAtomSet

Returns a setter function for the atom without subscribing to its value.

```ts
function useAtomSet<R, W>(atom: Atom.Writable<R, W>): (value: W) => void
```

### useAtomSubscribe

Subscribes to changes in an atom's value.

```ts
function useAtomSubscribe<A>(
  atom: Atom.Atom<A>,
  f: (value: A) => void,
  options?: { immediate?: boolean },
): void
```

### useAtomMount

Mounts an atom in the registry without subscribing to its value. This is useful for keeping an atom alive.

```ts
function useAtomMount<A>(atom: Atom.Atom<A>): void
```

### useAtomRefresh

Returns a function that forces an atom to refresh its value.

```ts
function useAtomRefresh<A>(atom: Atom.Atom<A>): () => void
```

### useAtomInitialValues

Sets initial values for atoms in the current registry. Useful for SSR or initialization.

```ts
function useAtomInitialValues(
  initialValues: Iterable<[Atom.Atom<any>, any]>,
): void
```

### useAtomRef

Subscribes to an `AtomRef` and returns its value as an accessor.

```ts
function useAtomRef<A>(ref: AtomRef.ReadonlyRef<A>): Accessor<A>
```

### useAtomRefProp

Creates a derived `AtomRef` for a specific property of an object stored in an `AtomRef`.

```ts
function useAtomRefProp<A, K extends keyof A>(
  ref: AtomRef.AtomRef<A>,
  prop: K,
): AtomRef.AtomRef<A[K]>
```

### useAtomRefPropValue

Subscribes to a specific property of an object stored in an `AtomRef`.

```ts
function useAtomRefPropValue<A, K extends keyof A>(
  ref: AtomRef.AtomRef<A>,
  prop: K,
): Accessor<A[K]>
```

## Context

### RegistryProvider

Provides the `AtomRegistry` context to the component tree. This is required for all atom hooks to work.

```tsx
function RegistryProvider(props: {
  children?: JSX.Element
  initialValues?: Iterable<[Atom.Atom<any>, any]>
  scheduleTask?: (f: () => void) => () => void
  timeoutResolution?: number
  defaultIdleTTL?: number
}): JSX.Element
```
