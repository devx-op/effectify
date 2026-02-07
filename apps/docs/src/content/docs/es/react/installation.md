---
title: Instalación
description: Cómo instalar los paquetes de React de Effectify en tu proyecto
---

# Instalación

Esta guía cubre cómo instalar y configurar los paquetes de React de Effectify en tu proyecto.

## Gestor de paquetes

Usa tu gestor favorito. Los ejemplos usan npm, pero puedes usar yarn, pnpm o bun.

## Paquetes principales

### @effectify/react-query

Integración de Effect con TanStack Query para React:

```bash
npm install @effectify/react-query
```

**Peer Dependencies:**

```bash
npm install @tanstack/react-query effect react
```

### @effectify/react-ui

Biblioteca de UI con Radix UI y Tailwind CSS:

```bash
npm install @effectify/react-ui
```

**Peer Dependencies:**

```bash
npm install react react-dom tailwindcss
```

### @effectify/chat-react

Componentes de chat en tiempo real:

```bash
npm install @effectify/chat-react
```

**Peer Dependencies:**

```bash
npm install @effectify/react-query @effectify/chat-domain react
```

## Configuración por framework

### Create React App

```bash
npx create-react-app my-app --template typescript
cd my-app
npm install @effectify/react-query @tanstack/react-query effect
```

Configura TanStack Query en `src/index.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
```

### Vite

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @effectify/react-query @tanstack/react-query effect
```

Configura en `src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
```

### Next.js

```bash
npx create-next-app@latest my-app --typescript
cd my-app
npm install @effectify/react-query @tanstack/react-query effect
```

Crea `app/providers.tsx`:

```tsx
"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Actualiza `app/layout.tsx`:

```tsx
import { Providers } from "./providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Configuración de Tailwind CSS

Si usas `@effectify/react-ui`, configura Tailwind:

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
    "./node_modules/@effectify/react-ui/**/*.{js,ts,jsx,tsx}",
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

## Configuración de TypeScript

Asegura que tu `tsconfig.json` incluya:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

## Verificación

Crea un componente simple:

```tsx
// src/components/TestComponent.tsx
import { useQuery } from "@tanstack/react-query"
import { Effect } from "effect"

const testEffect = Effect.succeed("Effectify funciona!")

export function TestComponent() {
  const { data } = useQuery({
    queryKey: ["test"],
    queryFn: () => Effect.runPromise(testEffect),
  })
  return <div>{data}</div>
}
```

Si ves "Effectify funciona!" renderizado, la instalación fue exitosa.

## Siguientes pasos

- [Guía de inicio](getting-started/)
- [React Query](packages/react-query/)
- [Componentes UI](packages/react-ui/)
