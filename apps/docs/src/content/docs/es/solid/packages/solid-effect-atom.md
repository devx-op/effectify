---
title: Atom de Effect v4 con SolidJS
description: Usa Atom y AtomRef de Effect v4 con los bindings oficiales para SolidJS
sidebar:
  label: Effect Atom para SolidJS
  order: 1
---

El paquete oficial `@effect/atom-solid` conecta los módulos principales `Atom` y `AtomRef` de Effect v4 con SolidJS. Proporciona accessors reactivos, setters, suscripciones y alcance de registros sin un paquete adaptador de Effectify.

## Instalación

```bash
npm install effect @effect/atom-solid solid-js
```

## Configuración

Usa `RegistryProvider` cuando el estado de los átomos deba limitarse a un subárbol de Solid. Sin un provider, los hooks usan el registro independiente predeterminado.

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

## Uso básico

### Crear un átomo

Importa `Atom` desde los módulos de reactividad de Effect v4.

```ts
import * as Atom from "effect/unstable/reactivity/Atom"

const counterAtom = Atom.make(0)
```

### useAtom

`useAtom` lee y escribe un átomo, de forma similar a `createSignal` de Solid. Los hooks reciben una función para respetar el modelo de propiedad reactiva de Solid.

```tsx
import { useAtom } from "@effect/atom-solid"

function Counter() {
  const [count, setCount] = useAtom(() => counterAtom)

  return <button onClick={() => setCount((value) => value + 1)}>Count: {count()}</button>
}
```

### useAtomValue

Usa `useAtomValue` cuando un componente solo necesite un accessor reactivo. Un selector opcional permite derivar un valor.

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

## Uso avanzado

### Escribir sin suscribirse

```tsx
import { useAtomSet } from "@effect/atom-solid"

function ResetButton() {
  const setCount = useAtomSet(() => counterAtom)
  return <button onClick={() => setCount(0)}>Reset</button>
}
```

### Suscribirse o mantener un átomo montado

`useAtomSubscribe` ejecuta un callback ante los cambios, mientras que `useAtomMount` mantiene un átomo montado durante la vida del owner actual de Solid.

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

### Inicializar y refrescar valores

```tsx
import { useAtomInitialValues, useAtomRefresh } from "@effect/atom-solid"

function Controls() {
  useAtomInitialValues([[counterAtom, 100]])
  const refresh = useAtomRefresh(() => counterAtom)
  return <button onClick={refresh}>Refresh</button>
}
```

### Trabajar con AtomRef

`AtomRef` forma parte del núcleo de Effect v4. `useAtomRef` conecta un accessor de Solid directamente con una referencia.

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

## Resumen de la API

- **`RegistryProvider`**: Limita un registro de átomos a un subárbol de Solid.
- **`useAtom(() => atom)`**: Retorna un accessor reactivo y un setter.
- **`useAtomValue(() => atom, selector?)`**: Retorna un accessor reactivo.
- **`useAtomSet(() => atom)`**: Retorna un setter sin suscribirse al valor.
- **`useAtomSubscribe(() => atom, callback)`**: Se suscribe a cambios.
- **`useAtomMount(() => atom)`**: Mantiene un átomo montado para el owner actual de Solid.
- **`useAtomInitialValues(values)`**: Inicializa átomos en el registro actual.
- **`useAtomRefresh(() => atom)`**: Retorna un callback para refrescar.
- **`useAtomResource(() => atom)`**: Convierte un átomo de `AsyncResult` en un recurso de Solid.
- **`useAtomRef(() => ref)`**: Se suscribe a un `AtomRef`.
- **`useAtomRefProp(() => ref, key)`**: Deriva una referencia de propiedad.
- **`useAtomRefPropValue(() => ref, key)`**: Se suscribe al valor de una propiedad.
