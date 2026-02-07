---
title: "@effectify/node-auth-app"
description: Aplicación completa de servidor de autenticación con Effect y better-auth
---

# @effectify/node-auth-app

El paquete `@effectify/node-auth-app` proporciona una aplicación de servidor de autenticación lista para producción construida con Effect, better-auth y patrones modernos de Node.js. Puede desplegarse como servicio standalone o integrarse en aplicaciones existentes.

## Instalación

```bash
npm install @effectify/node-auth-app
```

**Dependencias:**

```bash
npm install express cors helmet dotenv better-auth better-sqlite3
```

## Inicio rápido

### 1. Variables de entorno

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=file:./auth.db
BETTER_AUTH_SECRET=tu-super-secreto
BETTER_AUTH_URL=http://localhost:3001
JWT_SECRET=tu-jwt-secreto
```

### 2. Uso básico

```typescript
import { createAuthApp } from "@effectify/node-auth-app"
import { Effect } from "effect"

const startAuthServer = Effect.gen(function*() {
  const app = yield* createAuthApp({
    port: 3001,
    corsOrigin: "http://localhost:3000",
    database: { provider: "sqlite", url: "file:./auth.db" },
  })
  console.log("Auth server running on port 3001")
  return app
})

Effect.runPromise(startAuthServer)
```

### 3. Configuración personalizada

```typescript
import { AuthAppConfig, createAuthApp } from "@effectify/node-auth-app"

const config: AuthAppConfig = {
  port: 3001,
  corsOrigin: ["http://localhost:3000", "https://myapp.com"],
  database: { provider: "postgresql", url: process.env.DATABASE_URL! },
  auth: {
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    emailVerification: { enabled: true, expiresIn: 60 * 60 * 24 },
    passwordReset: { enabled: true, expiresIn: 60 * 60 },
  },
}

const app = await Effect.runPromise(createAuthApp(config))
```

## Endpoints de API

### Autenticación

- POST `/api/auth/sign-up` - Registrar nuevo usuario
- POST `/api/auth/sign-in` - Iniciar sesión
- POST `/api/auth/sign-out` - Cerrar sesión
- GET `/api/auth/session` - Obtener sesión actual

### Gestión de usuario

- GET `/api/auth/user` - Perfil actual
