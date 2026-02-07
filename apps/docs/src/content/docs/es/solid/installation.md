---
title: Instalación
description: Cómo instalar los paquetes de SolidJS de Effectify en tu proyecto
---

# Instalación

Esta guía cubre cómo instalar y configurar los paquetes de SolidJS de Effectify en tu proyecto.

## Gestor de paquetes

Usa tu gestor favorito. Los ejemplos usan npm, pero puedes usar yarn, pnpm o bun.

## Paquetes principales

### @effectify/solid-query

Integración de Effect con TanStack Query para SolidJS:

```bash
npm install @effectify/solid-query
```

**Peer Dependencies:**

```bash
npm install @tanstack/solid-query effect solid-js
```

### @effectify/solid-ui

Biblioteca de componentes de UI con Kobalte y Tailwind CSS:

```bash
npm install @effectify/solid-ui
```

**Peer Dependencies:**

```bash
npm install solid-js tailwindcss @kobalte/core
```

### @effectify/chat-solid

Componentes de chat en tiempo real:

```bash
npm install @effectify/chat-solid
```

**Peer Dependencies:**

```bash
npm install @effectify/solid-query @effectify/chat-domain solid-js
```

## Configuración específica por framework

### Vite + SolidJS

```bash
npm create solid@latest mi-app
cd mi-app
npm install @effectify/solid-query @tanstack/solid-query effect
```

Configura TanStack Query en `src/index.tsx`:

```tsx
import { render } from "solid-js/web"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import App from "./App"

const queryClient = new QueryClient()

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  ),
  document.getElementById("root")!,
)
```

### SolidStart

```bash
npm create solid@latest mi-app -- --template solid-start
cd mi-app
npm install @effectify/solid-query @tanstack/solid-query effect
```

Crea `src/root.tsx`:

```tsx
// @refresh reload
import { Suspense } from "solid-js"
import { Body, ErrorBoundary, FileRoutes, Head, Html, Meta, Routes, Scripts, Title } from "solid-start"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"

const queryClient = new QueryClient()

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Title>SolidStart - Con Effectify</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <Routes>
                <FileRoutes />
              </Routes>
            </QueryClientProvider>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
```

### Astro + SolidJS

```bash
npx astro add solid
npm install @effectify/solid-query @tanstack/solid-query effect
```

Crea un proveedor:

```tsx
// src/components/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import type { ParentComponent } from "solid-js"

const queryClient = new QueryClient()

export const QueryProvider: ParentComponent = (props) => {
  return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
}
```

Úsalo en Astro:

```astro
---
// src/pages/index.astro
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Astro + SolidJS + Effectify</title>
  </head>
  <body>
    <QueryProvider client:load>
      <App client:load />
    </QueryProvider>
  </body>
</html>
```

## Configuración de Tailwind CSS

Si usas `@effectify/solid-ui`, configura Tailwind:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@effectify/solid-ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```

Directivas en CSS:

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```
