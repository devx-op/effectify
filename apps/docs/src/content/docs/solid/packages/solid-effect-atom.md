---
title: Effect v4 Atom with SolidJS
description: Use Effect v4 Atom and AtomRef with the official SolidJS bindings
sidebar:
  label: Effect Atom for SolidJS
  order: 1
---

The official `@effect/atom-solid` package connects Effect v4's core `Atom` and `AtomRef` modules to SolidJS. It provides reactive accessors, setters, subscriptions, and registry scoping without an Effectify wrapper package.

## Installation

```bash
npm install effect @effect/atom-solid solid-js
```

## Configuration

Use `RegistryProvider` when atom state should be scoped to a Solid subtree. Without a provider, the hooks use the default standalone registry.

```tsx
import { RegistryProvider } from "@effect/atom-solid"

function App() {
  return (
    <RegistryProvider>
      <YourApp />
    </RegistryProvider>
  )
}
```

## Basic Usage

### Create an Atom

Import `Atom` from Effect v4's reactivity modules.

```ts
import * as Atom from "effect/unstable/reactivity/Atom"

const counterAtom = Atom.make(0)
```

### useAtom

`useAtom` reads and writes an atom, similarly to Solid's `createSignal`. Atom hooks accept a thunk so they can follow Solid's reactive ownership model.

```tsx
import { useAtom } from "@effect/atom-solid"

function Counter() {
  const [count, setCount] = useAtom(() => counterAtom)

  return <button onClick={() => setCount((value) => value + 1)}>Count: {count()}</button>
}
```

### useAtomValue

Use `useAtomValue` when a component only needs a reactive accessor. An optional selector derives a value.

```tsx
import { useAtomValue } from "@effect/atom-solid"

function Display() {
  const count = useAtomValue(() => counterAtom)
  const doubled = useAtomValue(() => counterAtom, (value) => value * 2)

  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
    </div>
  )
}
```

## Advanced Usage

### Write without subscribing

```tsx
import { useAtomSet } from "@effect/atom-solid"

function ResetButton() {
  const setCount = useAtomSet(() => counterAtom)
  return <button onClick={() => setCount(0)}>Reset</button>
}
```

### Subscribe or keep an atom mounted

`useAtomSubscribe` runs a callback for changes, while `useAtomMount` keeps an atom mounted for the lifetime of the current Solid owner.

```tsx
import { useAtomMount, useAtomSubscribe } from "@effect/atom-solid"

function Observer() {
  useAtomMount(() => counterAtom)
  useAtomSubscribe(() => counterAtom, (value) => {
    console.log("Counter changed:", value)
  })
  return null
}
```

### Seed and refresh values

```tsx
import { useAtomInitialValues, useAtomRefresh } from "@effect/atom-solid"

function Controls() {
  useAtomInitialValues([[counterAtom, 100]])
  const refresh = useAtomRefresh(() => counterAtom)
  return <button onClick={refresh}>Refresh</button>
}
```

### Work with AtomRef

`AtomRef` is part of Effect v4 core. `useAtomRef` subscribes a Solid accessor directly to a ref.

```tsx
import { useAtomRef } from "@effect/atom-solid"
import * as AtomRef from "effect/unstable/reactivity/AtomRef"

const configRef = AtomRef.make({ theme: "dark" })

function Config() {
  const config = useAtomRef(() => configRef)

  return (
    <button onClick={() => configRef.set({ theme: "light" })}>
      Theme: {config().theme}
    </button>
  )
}
```

## API overview

- **`RegistryProvider`**: Scopes an atom registry to a Solid subtree.
- **`useAtom(() => atom)`**: Returns a reactive accessor and setter.
- **`useAtomValue(() => atom, selector?)`**: Returns a reactive accessor.
- **`useAtomSet(() => atom)`**: Returns a setter without subscribing to the value.
- **`useAtomSubscribe(() => atom, callback)`**: Subscribes to changes.
- **`useAtomMount(() => atom)`**: Keeps an atom mounted for the current Solid owner.
- **`useAtomInitialValues(values)`**: Seeds atoms in the current registry.
- **`useAtomRefresh(() => atom)`**: Returns a refresh callback.
- **`useAtomResource(() => atom)`**: Converts an `AsyncResult` atom into a Solid resource.
- **`useAtomRef(() => ref)`**: Subscribes to an `AtomRef`.
- **`useAtomRefProp(() => ref, key)`**: Derives a property ref.
- **`useAtomRefPropValue(() => ref, key)`**: Subscribes to a property value.
