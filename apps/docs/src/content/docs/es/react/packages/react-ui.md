---
title: "@effectify/react-ui"
description: Biblioteca de componentes de UI para aplicaciones React
---

# @effectify/react-ui

El paquete `@effectify/react-ui` proporciona un conjunto completo de componentes de UI construidos con React, Radix UI y Tailwind CSS. Incluye formularios, layouts, componentes interactivos y utilidades diseñadas para funcionar con aplicaciones basadas en Effect.

## Instalación

```bash
npm install @effectify/react-ui
```

**Peer Dependencies:**

```bash
npm install react react-dom tailwindcss
```

## Configuración

### 1. Configura Tailwind CSS

Añade el paquete a tu configuración de Tailwind:

```js
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@effectify/react-ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```

### 2. Importa estilos globales

```tsx
// src/index.tsx o src/main.tsx
import "@effectify/react-ui/globals.css"
```

## Componentes

### Componentes de formulario

#### Button

```tsx
import { Button } from "@effectify/react-ui/components/button"

function MyComponent() {
  return (
    <div>
      <Button variant="default">Botón por defecto</Button>
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
import { Input } from "@effectify/react-ui/components/input"
import { Label } from "@effectify/react-ui/components/label"

function LoginForm() {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Introduce tu email" />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" placeholder="Introduce tu contraseña" />
      </div>
    </div>
  )
}
```

#### Form con TanStack Form

```tsx
import { useForm } from "@tanstack/react-form"
import { Button } from "@effectify/react-ui/components/button"
import { Input } from "@effectify/react-ui/components/input"
import { Label } from "@effectify/react-ui/components/label"

interface LoginData {
  email: string
  password: string
}

function LoginForm() {
  const form = useForm<LoginData>({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      console.log("Form data:", value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.Field
        name="email"
        children={(field) => (
          <div>
            <Label htmlFor={field.name}>Email</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              type="email"
              placeholder="Introduce tu email"
            />
            {field.state.meta.errors && <p className="text-sm text-red-600">{field.state.meta.errors.join(", ")}</p>}
          </div>
        )}
      />

      <form.Field
        name="password"
        children={(field) => (
          <div>
            <Label htmlFor={field.name}>Contraseña</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              type="password"
              placeholder="Introduce tu contraseña"
            />
            {field.state.meta.errors && <p className="text-sm text-red-600">{field.state.meta.errors.join(", ")}</p>}
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
} from "@effectify/react-ui/components/card"
import { Button } from "@effectify/react-ui/components/button"

function UserCard({ user }) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Miembro desde {user.joinDate}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Editar</Button>
        <Button>Ver perfil</Button>
      </CardFooter>
    </Card>
  )
}
```
