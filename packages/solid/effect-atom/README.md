# @effectify/solid-effect-atom

[Documentation](https://devx-op.github.io/effectify/solid/packages/solid-effect-atom/)

SolidJS bindings for Effect's `Atom` primitive. This library allows you to use Effect's reactive state (`Atom`) within SolidJS components efficiently and safely.

## Installation

```bash
npm install @effectify/solid-effect-atom @effect-atom/atom effect solid-js
```

## Configuration

To use atoms, you must wrap your application (or the part using them) with `RegistryProvider`. This provides the necessary context for atom registration.

```tsx
import { RegistryProvider } from "@effectify/solid-effect-atom"

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

Use `Atom.make` from the `@effect-atom/atom` package.

```ts
import * as Atom from "@effect-atom/atom/Atom"

const counterAtom = Atom.make(0)
```

### useAtom

Hook to read and write an atom. Similar to Solid's `createSignal`.

```tsx
import { useAtom } from "@effectify/solid-effect-atom"

function Counter() {
  const [count, setCount] = useAtom(counterAtom)

  return <button onClick={() => setCount((c) => c + 1)}>Count: {count()}</button>
}
```

### useAtomValue

Hook to only read an atom's value. You can pass a selector function to transform the value (computed).

```tsx
import { useAtomValue } from "@effectify/solid-effect-atom"

function Display() {
  const count = useAtomValue(counterAtom)
  const doubled = useAtomValue(counterAtom, (n) => n * 2)

  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
    </div>
  )
}
```

## Advanced Usage

### useAtomSet

Useful when you only need to update the atom without subscribing to its changes.

```tsx
import { useAtomSet } from "@effectify/solid-effect-atom"

function ResetButton() {
  const setCount = useAtomSet(counterAtom)
  return <button onClick={() => setCount(0)}>Reset</button>
}
```

### useAtomSubscribe

Subscribes to atom changes manually. Useful for side effects (logging, analytics, etc.).

```tsx
import { useAtomSubscribe } from "@effectify/solid-effect-atom"

function Logger() {
  useAtomSubscribe(counterAtom, (val) => {
    console.log("Counter changed:", val)
  })
  return null
}
```

### useAtomMount

Manually mounts an atom. Useful if you want to keep an atom alive in the registry without rendering its value.

```tsx
import { useAtomMount } from "@effectify/solid-effect-atom"

function Keeper() {
  useAtomMount(counterAtom)
  return null
}
```

### useAtomInitialValues

Useful for SSR or initializing state from props.

```tsx
import { useAtomInitialValues } from "@effectify/solid-effect-atom"

function Initializer() {
  useAtomInitialValues([[counterAtom, 100]])
  return null
}
```

### useAtomRefresh

Forces an atom to re-evaluate or reset.

```tsx
import { useAtomRefresh } from "@effectify/solid-effect-atom"

function Refresher() {
  const refresh = useAtomRefresh(counterAtom)
  return <button onClick={refresh}>Reset Atom</button>
}
```

### useAtomRef

For working with mutable references (`AtomRef`).

```tsx
import * as AtomRef from "@effect-atom/atom/AtomRef"
import { useAtomRef } from "@effectify/solid-effect-atom"

const configRef = AtomRef.make({ theme: "dark" })

function Config() {
  const config = useAtomRef(configRef)

  return (
    <button onClick={() => configRef.set({ theme: "light" })}>
      Theme: {config().theme}
    </button>
  )
}
```

## API Reference

### Hooks

- **`useAtom(atom)`**: Returns `[accessor, setter]`.
- **`useAtomValue(atom, selector?)`**: Returns `accessor`.
- **`useAtomSet(atom)`**: Returns only the `setter`.
- **`useAtomSubscribe(atom, callback)`**: Subscribes to changes.
- **`useAtomMount(atom)`**: Mounts the atom in the registry.
- **`useAtomInitialValues(values)`**: Initializes atoms in the current registry.
- **`useAtomRefresh(atom)`**: Returns a function to refresh the atom.
- **`useAtomRef(ref)`**: Subscribes to an `AtomRef`.

### Components

- **`RegistryProvider`**: Context provider for atom registry.

---

> **Note**: This library is designed to work with Effect v3 and `@effect-atom/atom`.
