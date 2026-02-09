---
title: "@effectify/solid-effect-atom"
description: Referencia de API para @effectify/solid-effect-atom
sidebar:
  label: Solid Effect Atom Reference
---

## Hooks

### useAtom

Se suscribe a un átomo y retorna una tupla `[accessor, setter]`.

```ts
function useAtom<R, W>(
  atom: Atom.Writable<R, W>,
): [Accessor<R>, (value: W) => void]
```

### useAtomValue

Se suscribe a un átomo y retorna su valor como un accessor.

```ts
function useAtomValue<A>(atom: Atom.Atom<A>): Accessor<A>
function useAtomValue<A, B>(atom: Atom.Atom<A>, f: (a: A) => B): Accessor<B>
```

### useAtomSet

Retorna una función setter para el átomo sin suscribirse a su valor.

```ts
function useAtomSet<R, W>(atom: Atom.Writable<R, W>): (value: W) => void
```

### useAtomSubscribe

Se suscribe a cambios en el valor de un átomo.

```ts
function useAtomSubscribe<A>(
  atom: Atom.Atom<A>,
  f: (value: A) => void,
  options?: { immediate?: boolean },
): void
```

### useAtomMount

Monta un átomo en el registro sin suscribirse a su valor. Es útil para mantener un átomo vivo.

```ts
function useAtomMount<A>(atom: Atom.Atom<A>): void
```

### useAtomRefresh

Retorna una función que fuerza al átomo a refrescar su valor.

```ts
function useAtomRefresh<A>(atom: Atom.Atom<A>): () => void
```

### useAtomInitialValues

Establece valores iniciales para átomos en el registro actual. Útil para SSR o inicialización.

```ts
function useAtomInitialValues(
  initialValues: Iterable<[Atom.Atom<any>, any]>,
): void
```

### useAtomRef

Se suscribe a un `AtomRef` y retorna su valor como un accessor.

```ts
function useAtomRef<A>(ref: AtomRef.ReadonlyRef<A>): Accessor<A>
```

### useAtomRefProp

Crea un `AtomRef` derivado para una propiedad específica de un objeto almacenado en un `AtomRef`.

```ts
function useAtomRefProp<A, K extends keyof A>(
  ref: AtomRef.AtomRef<A>,
  prop: K,
): AtomRef.AtomRef<A[K]>
```

### useAtomRefPropValue

Se suscribe a una propiedad específica de un objeto almacenado en un `AtomRef`.

```ts
function useAtomRefPropValue<A, K extends keyof A>(
  ref: AtomRef.AtomRef<A>,
  prop: K,
): Accessor<A[K]>
```

## Contexto

### RegistryProvider

Provee el contexto `AtomRegistry` al árbol de componentes. Esto es requerido para que funcionen los hooks de átomos.

```tsx
function RegistryProvider(props: {
  children?: JSX.Element
  initialValues?: Iterable<[Atom.Atom<any>, any]>
  scheduleTask?: (f: () => void) => () => void
  timeoutResolution?: number
  defaultIdleTTL?: number
}): JSX.Element
```
