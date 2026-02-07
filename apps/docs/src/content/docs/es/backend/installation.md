---
title: Instalación
description: Cómo instalar los paquetes de backend de Effectify en Node.js
---

# Instalación

Esta guía cubre cómo instalar y configurar los paquetes de backend de Effectify en tu proyecto Node.js.

## Gestor de paquetes

Usa tu gestor favorito. Los ejemplos usan npm, pero puedes usar yarn, pnpm o bun.

## Paquetes principales

### @effectify/node-better-auth

Integración de Effect con better-auth para Node.js:

```bash
npm install @effectify/node-better-auth
```

**Peer Dependencies:**

```bash
npm install better-auth effect @effect/platform @effect/platform-node
```

### @effectify/node-auth-app

Aplicación completa de autenticación:

```bash
npm install @effectify/node-auth-app
```

**Dependencias:**

```bash
npm install express cors helmet dotenv better-sqlite3
```

## Configuración por framework

### Express.js

```bash
mkdir mi-backend && cd mi-backend
npm init -y
npm install express cors helmet dotenv
npm install -D @types/express @types/cors @types/node typescript ts-node nodemon
```

Inicializa TypeScript:

```bash
npx tsc --init
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Scripts en `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Fastify

```bash
mkdir mi-fastify-backend && cd mi-fastify-backend
npm init -y
npm install fastify @fastify/cors @fastify/helmet
npm install -D @types/node typescript ts-node nodemon
```

Configuración básica con Effect:

```typescript
import Fastify from "fastify"
import { Effect } from "effect"

const fastify = Fastify({ logger: true })
fastify.register(require("@fastify/cors"))
fastify.register(require("@fastify/helmet"))

fastify.get("/health", async () => {
  const healthCheck = Effect.succeed({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
  return await Effect.runPromise(healthCheck)
})

await fastify.listen({ port: 3000 })
```

### NestJS

```bash
npm i -g @nestjs/cli
nest new mi-nest-backend
cd mi-nest-backend
npm install @effectify/node-better-auth effect
```

Servicio Effect:

```typescript
import { Injectable } from "@nestjs/common"
import { Effect } from "effect"

@Injectable()
export class EffectService {
  runEffect<A, E>(effect: Effect.Effect<A, E, never>): Promise<A> {
    return Effect.runPromise(effect)
  }
}
```
