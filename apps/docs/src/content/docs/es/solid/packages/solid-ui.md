---
title: "@effectify/solid-ui"
description: Biblioteca de componentes de UI para aplicaciones SolidJS
---

# @effectify/solid-ui

El paquete `@effectify/solid-ui` proporciona un conjunto completo de componentes de UI construidos con SolidJS, Kobalte y Tailwind CSS. Incluye formularios, layouts, componentes interactivos y utilidades diseñadas para funcionar con aplicaciones basadas en Effect y el sistema reactivo de SolidJS.

## Instalación

```bash
npm install @effectify/solid-ui
```

**Peer Dependencies:**

```bash
npm install solid-js tailwindcss @kobalte/core
```

## Configuración

### 1. Configura Tailwind CSS

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@effectify/solid-ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```

### 2. Importa estilos globales

```tsx
// src/index.tsx
import "@effectify/solid-ui/globals.css"
```

## Componentes

### Componentes de formulario

#### Button

```tsx
import { Button } from "@effectify/solid-ui/components/button"

function MyComponent() {
  return (
    <div class="space-x-2">
      <Button variant="default">Por defecto</Button>
      <Button variant="destructive">Eliminar</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Pequeño</Button>
      <Button size="lg">Grande</Button>
    </div>
  )
}
```

#### Input

```tsx
import { Input } from "@effectify/solid-ui/components/input"
import { Label } from "@effectify/solid-ui/components/label"

function LoginForm() {
  return (
    <div class="space-y-4">
      <div>
        <Label for="email">Email</Label>
        <Input id="email" type="email" placeholder="Introduce tu email" />
      </div>
      <div>
        <Label for="password">Contraseña</Label>
        <Input id="password" type="password" placeholder="Introduce tu contraseña" />
      </div>
    </div>
  )
}
```

#### Form con TanStack Form

```tsx
import { createForm } from "@tanstack/solid-form"
import { Button } from "@effectify/solid-ui/components/button"
import { Input } from "@effectify/solid-ui/components/input"
import { Label } from "@effectify/solid-ui/components/label"
import { Show } from "solid-js"

interface LoginData {
  email: string
  password: string
}

function LoginForm() {
  const form = createForm(() => ({
    defaultValues: { email: "", password: "" } as LoginData,
    onSubmit: async ({ value }) => {
      console.log("Form data:", value)
    },
  }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      class="space-y-4"
    >
      <form.Field
        name="email"
        children={(field) => (
          <div>
            <Label for={field().name}>Email</Label>
            <Input
              id={field().name}
              name={field().name}
              value={field().state.value}
              onBlur={field().handleBlur}
              onInput={(e) => field().handleChange(e.currentTarget.value)}
              type="email"
              placeholder="Introduce tu email"
            />
            <Show when={field().state.meta.errors.length > 0}>
              <p class="text-sm text-red-600">{field().state.meta.errors.join(", ")}</p>
            </Show>
          </div>
        )}
      />

      <form.Field
        name="password"
        children={(field) => (
          <div>
            <Label for={field().name}>Contraseña</Label>
            <Input
              id={field().name}
              name={field().name}
              value={field().state.value}
              onBlur={field().handleBlur}
              onInput={(e) => field().handleChange(e.currentTarget.value)}
              type="password"
              placeholder="Introduce tu contraseña"
            />
            <Show when={field().state.meta.errors.length > 0}>
              <p class="text-sm text-red-600">{field().state.meta.errors.join(", ")}</p>
            </Show>
          </div>
        )}
      />

      <Button type="submit">Iniciar sesión</Button>
    </form>
  )
}
```

### Componentes de layout

#### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@effectify/solid-ui/components/card"
import { Button } from "@effectify/solid-ui/components/button"

function UserCard(props: { user: User }) {
  return (
    <Card class="w-[350px]">
      <CardHeader>
        <CardTitle>{props.user.name}</CardTitle>
        <CardDescription>{props.user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Miembro desde {props.user.joinDate}</p>
      </CardContent>
      <CardFooter class="flex justify-between">
        <Button variant="outline">Editar</Button>
        <Button>Ver perfil</Button>
      </CardFooter>
    </Card>
  )
}
```
