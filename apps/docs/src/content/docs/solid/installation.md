---
title: Installation
description: How to install Effectify SolidJS packages in your project
---

# Installation

This guide covers how to install and configure Effectify SolidJS packages in your project.

## Package Manager

We recommend using your preferred package manager. All examples use npm, but you can substitute with yarn, pnpm, or bun.

## Core Packages

### @effectify/solid-query

Effect integration with TanStack Query for SolidJS:

```bash
npm install @effectify/solid-query
```

**Peer Dependencies:**

```bash
npm install @tanstack/solid-query effect solid-js
```

### @effectify/solid-ui

UI component library with Kobalte and Tailwind CSS:

```bash
npm install @effectify/solid-ui
```

**Peer Dependencies:**

```bash
npm install solid-js tailwindcss @kobalte/core
```

### @effectify/chat-solid

Real-time chat components:

```bash
npm install @effectify/chat-solid
```

**Peer Dependencies:**

```bash
npm install @effectify/solid-query @effectify/chat-domain solid-js
```

## Framework-Specific Setup

### Vite + SolidJS

1. Create a new SolidJS project:

```bash
npm create solid@latest my-app
cd my-app
npm install @effectify/solid-query @tanstack/solid-query effect
```

2. Configure TanStack Query in `src/index.tsx`:

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

1. Create a new SolidStart project:

```bash
npm create solid@latest my-app -- --template solid-start
cd my-app
npm install @effectify/solid-query @tanstack/solid-query effect
```

2. Create `src/root.tsx`:

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
        <Title>SolidStart - With Effectify</Title>
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

1. Add SolidJS to your Astro project:

```bash
npx astro add solid
npm install @effectify/solid-query @tanstack/solid-query effect
```

2. Create a provider component:

```tsx
// src/components/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import type { ParentComponent } from "solid-js"

const queryClient = new QueryClient()

export const QueryProvider: ParentComponent = (props) => {
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  )
}
```

3. Use in your Astro pages:

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

## Tailwind CSS Setup

If you're using `@effectify/solid-ui`, you'll need to configure Tailwind CSS:

1. Install Tailwind CSS:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. Configure `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@effectify/solid-ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

3. Add Tailwind directives to your CSS:

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Import the CSS in your entry file:

```tsx
// src/index.tsx
import "./index.css"
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes proper configuration for SolidJS:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Vite Configuration

For optimal development experience, configure Vite:

```ts
// vite.config.ts
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
})
```

## Development Tools

### SolidJS DevTools

Install the SolidJS DevTools browser extension for better debugging:

```tsx
// src/App.tsx
import { DEV } from "solid-js"

function App() {
  // DevTools will automatically connect in development
  return <YourAppComponents />
}
```

### TanStack Query DevTools

Add query devtools for debugging queries:

```tsx
import { SolidQueryDevtools } from "@tanstack/solid-query-devtools"

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourAppComponents />
      <SolidQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

## Verification

Create a simple component to verify everything is working:

```tsx
// src/components/TestComponent.tsx
import { createResource } from "solid-js"
import { Effect } from "effect"

const testEffect = Effect.succeed("Effectify with SolidJS is working!")

export function TestComponent() {
  const [data] = createResource(() => Effect.runPromise(testEffect))

  return <div>{data()}</div>
}
```

Add it to your App:

```tsx
// src/App.tsx
import { TestComponent } from "./components/TestComponent"

function App() {
  return (
    <div>
      <h1>My SolidJS + Effectify App</h1>
      <TestComponent />
    </div>
  )
}

export default App
```

If you see "Effectify with SolidJS is working!" rendered, your installation is successful!

## Performance Optimization

### Bundle Size Optimization

Configure your bundler to tree-shake unused Effect modules:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [solid()],
  build: {
    rollupOptions: {
      external: (id) => {
        // Externalize large dependencies if needed
        return false
      },
    },
  },
})
```

### Code Splitting

Use dynamic imports for large Effect modules:

```tsx
import { lazy } from "solid-js"

const HeavyComponent = lazy(() => import("./HeavyComponent"))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## Next Steps

- [Getting Started Guide](/solid/getting-started/) - Learn the basics
- [Solid Query Package](/solid/packages/solid-query/) - Explore data fetching patterns
- [UI Components](/solid/packages/solid-ui/) - Browse available components
- [Chat Components](/solid/packages/chat-solid/) - Add real-time features

## Troubleshooting

### Common Issues

1. **JSX Transform Issues**: Make sure `jsxImportSource` is set to `"solid-js"` in tsconfig.json
2. **Hydration Mismatches**: Ensure server and client render the same content
3. **Effect Import Errors**: Check that all peer dependencies are installed
4. **Build Failures**: Verify your Vite/bundler configuration supports SolidJS

### Getting Help

- [SolidJS Documentation](https://www.solidjs.com/docs)
- [Effect Documentation](https://effect.website/)
- [GitHub Issues](https://github.com/devx-op/effectify/issues)
- [SolidJS Discord](https://discord.com/invite/solidjs)
