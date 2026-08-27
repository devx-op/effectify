---
title: Effect v4 Atom Solid API
description: API reference for Effect v4 Atom and the official SolidJS bindings
sidebar:
  label: Effect Atom Solid API
---

Import `Atom` and `AtomRef` from Effect v4 core, and import Solid bindings from `@effect/atom-solid`.

```ts
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as AtomRef from "effect/unstable/reactivity/AtomRef"
import { RegistryProvider, useAtom } from "@effect/atom-solid"
import type { Accessor, ResourceOptions, ResourceReturn } from "solid-js"
```

## Atom hooks

Atom and AtomRef selection hooks accept lazy thunks where their signatures below show one, allowing them to track the selected source within Solid's reactive ownership model. `useAtomInitialValues` is different: it receives the iterable directly.

### useAtom

Subscribes to a writable atom and returns a reactive accessor with a setter.

```ts
function useAtom<R, W>(
  atom: () => Atom.Writable<R, W>,
): readonly [Accessor<R>, (value: W | ((current: R) => W)) => void]
```

### useAtomValue

Subscribes to an atom and optionally derives a value.

```ts
function useAtomValue<A>(atom: () => Atom.Atom<A>): Accessor<A>
function useAtomValue<A, B>(atom: () => Atom.Atom<A>, select: (value: A) => B): Accessor<B>
```

### useAtomSet

Returns a setter without subscribing to the atom value.

```ts
function useAtomSet<R, W>(
  atom: () => Atom.Writable<R, W>,
): (value: W | ((current: R) => W)) => void
```

### useAtomSubscribe

Subscribes a callback to atom changes.

```ts
function useAtomSubscribe<A>(
  atom: () => Atom.Atom<A>,
  callback: (value: A) => void,
  options?: { readonly immediate?: boolean },
): void
```

### useAtomMount and useAtomRefresh

```ts
function useAtomMount<A>(atom: () => Atom.Atom<A>): void
function useAtomRefresh<A>(atom: () => Atom.Atom<A>): () => void
```

### useAtomInitialValues

Seeds the first value supplied for each atom in the current registry.

```ts
function useAtomInitialValues(
  initialValues: Iterable<readonly [Atom.Atom<any>, any]>,
): void
```

### useAtomResource

Converts an `AsyncResult` atom into a Solid resource. It also accepts Solid resource options and `suspendOnWaiting`.

```ts
function useAtomResource<A, E>(
  atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  options?: ResourceOptions<A> & { suspendOnWaiting?: boolean },
): ResourceReturn<A, void>
```

## AtomRef hooks

### useAtomRef

```ts
function useAtomRef<A>(ref: () => AtomRef.ReadonlyRef<A>): Accessor<A>
```

### useAtomRefProp

Returns an accessor containing the derived property ref.

```ts
function useAtomRefProp<A, K extends keyof A>(
  ref: () => AtomRef.AtomRef<A>,
  property: K,
): Accessor<AtomRef.AtomRef<A[K]>>
```

### useAtomRefPropValue

```ts
function useAtomRefPropValue<A, K extends keyof A>(
  ref: () => AtomRef.AtomRef<A>,
  property: K,
): Accessor<A[K]>
```

## Registry context

`RegistryProvider` creates and disposes an `AtomRegistry` for a Solid subtree. It accepts initial values and optional scheduling and lifetime settings. `RegistryContext` exposes the current registry for lower-level integrations.
