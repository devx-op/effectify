---
title: Installation
description: How to install Effectify React packages in your project
---

# Installation

This guide covers how to install and configure Effectify React packages in your project.

## Package Manager

We recommend using your preferred package manager. All examples use npm, but you can substitute with yarn, pnpm, or bun.

## Core Packages

### @effectify/react-query

Effect integration with TanStack Query for React:

```bash
npm install @effectify/react-query
```

**Peer Dependencies:**
```bash
npm install @tanstack/react-query effect react
```

### @effectify/react-ui

UI component library with Radix UI and Tailwind CSS:

```bash
npm install @effectify/react-ui
```

**Peer Dependencies:**
```bash
npm install react react-dom tailwindcss
```

### @effectify/chat-react

Real-time chat components:

```bash
npm install @effectify/chat-react
```

**Peer Dependencies:**
```bash
npm install @effectify/react-query @effectify/chat-domain react
```

## Framework-Specific Setup

### Create React App

1. Install the packages:
```bash
npx create-react-app my-app --template typescript
cd my-app
npm install @effectify/react-query @tanstack/react-query effect
```

2. Configure TanStack Query in `src/index.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
```

### Vite

1. Create a new Vite project:
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @effectify/react-query @tanstack/react-query effect
```

2. Configure in `src/main.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
```

### Next.js

1. Create a new Next.js project:
```bash
npx create-next-app@latest my-app --typescript
cd my-app
npm install @effectify/react-query @tanstack/react-query effect
```

2. Create `app/providers.tsx`:
```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

3. Update `app/layout.tsx`:
```tsx
import { Providers } from './providers'

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

## Tailwind CSS Setup

If you're using `@effectify/react-ui`, you'll need to configure Tailwind CSS:

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
    "./node_modules/@effectify/react-ui/**/*.{js,ts,jsx,tsx}"
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

## TypeScript Configuration

Ensure your `tsconfig.json` includes proper configuration:

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
  "include": [
    "src"
  ]
}
```

## Verification

Create a simple component to verify everything is working:

```tsx
// src/components/TestComponent.tsx
import { useQuery } from '@tanstack/react-query'
import { Effect } from 'effect'

const testEffect = Effect.succeed("Effectify is working!")

export function TestComponent() {
  const { data } = useQuery({
    queryKey: ['test'],
    queryFn: () => Effect.runPromise(testEffect)
  })

  return <div>{data}</div>
}
```

If you see "Effectify is working!" rendered, your installation is successful!

## Next Steps

- [Getting Started Guide](/react/getting-started/) - Learn the basics
- [React Query Package](/react/packages/react-query/) - Explore data fetching patterns
- [UI Components](/react/packages/react-ui/) - Browse available components
