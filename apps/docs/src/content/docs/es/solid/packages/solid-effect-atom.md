---
title: "@effectify/solid-effect-atom"
description: Herramientas reactivas para Effect con SolidJS
sidebar:
  label: "@effectify/solid-effect-atom"
  order: 1
---

Bindings de SolidJS para la primitiva `Atom` de Effect. Esta librería permite utilizar el estado reactivo de Effect (`Atom`) dentro de componentes SolidJS de manera eficiente y segura.

## Instalación

```bash
npm install @effectify/solid-effect-atom @effect-atom/atom effect solid-js
```

## Configuración

Para usar los átomos, debes envolver tu aplicación (o la parte que los use) con `RegistryProvider`. Esto provee el contexto necesario para el registro de átomos.

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

## Uso Básico

### Crear un Átomo

Utiliza `Atom.make` del paquete `@effect-atom/atom`.

```ts
import * as Atom from "@effect-atom/atom/Atom"

const counterAtom = Atom.make(0)
```

### useAtom

Hook para leer y escribir un átomo. Similar a `createSignal` de Solid.

```tsx
import { useAtom } from "@effectify/solid-effect-atom"

function Counter() {
  const [count, setCount] = useAtom(counterAtom)

  return <button onClick={() => setCount((c) => c + 1)}>Count: {count()}</button>
}
```

### useAtomValue

Hook para solo leer el valor de un átomo. Puedes pasar una función selectora para transformar el valor (computado).

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

## Uso Avanzado

### useAtomSet

Útil cuando solo necesitas actualizar el átomo sin suscribirte a sus cambios.

```tsx
import { useAtomSet } from "@effectify/solid-effect-atom"

function ResetButton() {
  const setCount = useAtomSet(counterAtom)
  return <button onClick={() => setCount(0)}>Reset</button>
}
```

### useAtomSubscribe

Se suscribe a los cambios del átomo manualmente. Útil para efectos secundarios (logging, analytics, etc.).

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

Monta manualmente un átomo. Útil si quieres mantener un átomo vivo en el registro sin leer su valor.

```tsx
import { useAtomMount } from "@effectify/solid-effect-atom"

function Keeper() {
  useAtomMount(counterAtom)
  return null
}
```

### useAtomInitialValues

Útil para SSR o inicializar estado desde props.

```tsx
import { useAtomInitialValues } from "@effectify/solid-effect-atom"

function Initializer() {
  useAtomInitialValues([[counterAtom, 100]])
  return null
}
```

### useAtomRefresh

Fuerza la reevaluación o reinicio de un átomo.

```tsx
import { useAtomRefresh } from "@effectify/solid-effect-atom"

function Refresher() {
  const refresh = useAtomRefresh(counterAtom)
  return <button onClick={refresh}>Reset Atom</button>
}
```

### useAtomRef

Para trabajar con referencias mutables (`AtomRef`).

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

## Referencia de API

### Hooks

- **`useAtom(atom)`**: Retorna `[accessor, setter]`.
- **`useAtomValue(atom, selector?)`**: Retorna `accessor`.
- **`useAtomSet(atom)`**: Retorna solo el `setter`.
- **`useAtomSubscribe(atom, callback)`**: Se suscribe a cambios.
- **`useAtomMount(atom)`**: Monta el átomo en el registro.
- **`useAtomInitialValues(values)`**: Inicializa átomos en el registro actual.
- **`useAtomRefresh(atom)`**: Retorna una función para refrescar el átomo.
- **`useAtomRef(ref)`**: Se suscribe a un `AtomRef`.

### Componentes

- **`RegistryProvider`**: Proveedor de contexto para el registro de átomos.

---

> **Nota**: Esta librería está diseñada para funcionar con Effect v3 y `@effect-atom/atom`.
