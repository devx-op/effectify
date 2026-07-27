---
title: API de Effect v4 Atom para Solid
description: Referencia de la API de Atom de Effect v4 y los bindings oficiales para SolidJS
sidebar:
  label: API de Effect Atom para Solid
---

Importa `Atom` y `AtomRef` desde el núcleo de Effect v4, y los bindings de Solid desde `@effect/atom-solid`.

```ts
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as AtomRef from "effect/unstable/reactivity/AtomRef"
import { RegistryProvider, useAtom } from "@effect/atom-solid"
import type { Accessor, ResourceOptions, ResourceReturn } from "solid-js"
```

## Hooks de Atom

Los hooks que seleccionan Atom o AtomRef aceptan funciones diferidas cuando así lo indican las firmas siguientes, lo que permite rastrear la fuente seleccionada dentro del modelo de propiedad reactiva de Solid. `useAtomInitialValues` es diferente: recibe el iterable directamente.

### useAtom

Se suscribe a un átomo escribible y retorna un accessor reactivo junto con un setter.

```ts
function useAtom<R, W>(
  atom: () => Atom.Writable<R, W>,
): readonly [Accessor<R>, (value: W | ((current: R) => W)) => void]
```

### useAtomValue

Se suscribe a un átomo y permite derivar un valor de forma opcional.

```ts
function useAtomValue<A>(atom: () => Atom.Atom<A>): Accessor<A>
function useAtomValue<A, B>(atom: () => Atom.Atom<A>, select: (value: A) => B): Accessor<B>
```

### useAtomSet

Retorna un setter sin suscribirse al valor del átomo.

```ts
function useAtomSet<R, W>(
  atom: () => Atom.Writable<R, W>,
): (value: W | ((current: R) => W)) => void
```

### useAtomSubscribe

Suscribe un callback a los cambios del átomo.

```ts
function useAtomSubscribe<A>(
  atom: () => Atom.Atom<A>,
  callback: (value: A) => void,
  options?: { readonly immediate?: boolean },
): void
```

### useAtomMount y useAtomRefresh

```ts
function useAtomMount<A>(atom: () => Atom.Atom<A>): void
function useAtomRefresh<A>(atom: () => Atom.Atom<A>): () => void
```

### useAtomInitialValues

Inicializa el primer valor proporcionado para cada átomo en el registro actual.

```ts
function useAtomInitialValues(
  initialValues: Iterable<readonly [Atom.Atom<any>, any]>,
): void
```

### useAtomResource

Convierte un átomo de `AsyncResult` en un recurso de Solid. También acepta opciones de recursos de Solid y `suspendOnWaiting`.

```ts
function useAtomResource<A, E>(
  atom: () => Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  options?: ResourceOptions<A> & { suspendOnWaiting?: boolean },
): ResourceReturn<A, void>
```

## Hooks de AtomRef

### useAtomRef

```ts
function useAtomRef<A>(ref: () => AtomRef.ReadonlyRef<A>): Accessor<A>
```

### useAtomRefProp

Retorna un accessor que contiene la referencia de propiedad derivada.

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

## Contexto del registro

`RegistryProvider` crea y descarta un `AtomRegistry` para un subárbol de Solid. Acepta valores iniciales y opciones de planificación y duración. `RegistryContext` expone el registro actual para integraciones de bajo nivel.
