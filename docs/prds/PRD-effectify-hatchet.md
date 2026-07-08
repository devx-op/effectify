# PRD: @effectify/hatchet

**Product Requirements Document**

---

## 1. Resumen Ejecutivo

**@effectify/hatchet** es un package npm del **monorepositorio effectify** que proporciona una capa de integración nativa entre el ecosistema [Effect](https://effect.website/) (versión 4 beta) y [Hatchet](https://hatchet.run/), un sistema de workflows y background jobs distribuido.

### Propósito en el Monorepositorio

Este package sigue la filosofía del monorepositorio de crear **bindings nativos de Effect** para herramientas de terceros. Al igual que otros packages del monorepositorio (ej. `@effectify/react-router`, `@effectify/sql`), este módulo permite que aplicaciones nativas con Effect puedan integrar dependencias de terceros de manera типово-safe y funcional.

### Propuesta de Valor

| Antes (sin la librería)                             | Después (con @effectify/hatchet)                           |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Steps escritos como funciones async (`Promise<A>`)  | Steps escritos como `Effect<A, E, R>` puro                 |
| Manejo de errores con try/catch y thrown exceptions | Errores tipados en el canal `E` de Effect                  |
| Dependencias pasadas como parámetros                | Inyección de dependencias via ServiceMap                   |
| Logging manual a Hatchet con `ctx.log()`            | Uso nativo de `Effect.log()` con sincronización automática |
| Input no tipado (`any`)                             | Validación automática con `@effect/schema`                 |
| Configuración dispersa en múltiples lugares         | Configuración centralizada via Effect Config               |
| Tests contra servicios externos complejos           | Tests contra Hatchet real en Docker Compose                |

---

## 2. Contexto Histórico: Los Ejemplos Originales (Effect v3)

> **Nota importante**: Los siguientes ejemplos fueron extraídos de una conversación inicial con un LLM realizada hace unos meses. Estos códigos están escritos en **Effect v3** y contenían varios patrones que **NO son válidos en Effect v4**. Se incluyen aquí como referencia histórica del pensamiento inicial.

### 2.1 Primera Versión del Effectifier (v3 - Obsoleto)

```typescript
// ⚠️ CÓDIGO V3 - REFERENCIA HISTÓRICA SOLAMENTE
// NO USAR - contiene patrones incorrectos para v4

import { Context, Data, Effect, Layer } from "effect"
import { Hatchet } from "@hatchet-dev/typescript-sdk"

// Este código usa Context.Tag que en v4 es ServiceMap.Service
export class HatchetClient extends Context.Tag("@effectify/hatchet/Client")<
  HatchetClient,
  Hatchet
>() {}

// ❌ PROBLEMA: Runtime.runPromiseExit NO existe así en v4
export const effectifyStep = <A, E>(
  effectStep: (ctx: HatchetContext<any, any>) => Effect.Effect<A, E, never>,
) => {
  return async (ctx: HatchetContext<any, any>): Promise<A> => {
    return await Effect.runPromise(effectStep(ctx)) // ❌ Incorrecto en v4
  }
}
```

### 2.2 Problema del Runtime (v3 - Obsoleto)

```typescript
// ⚠️ CÓDIGO V3 - REFERENCIA HISTÓRICA SOLAMENTE
// ❌ PROBLEMA: Runtime fue eliminado en v4
export const createHatchetEffectifier = <R>(runtime: Runtime.Runtime<R>) => {
  return <A, E>(effectStep) => {
    return async (ctx) => {
      // ❌ Runtime.runPromiseExit NO existe en v4
      const exit = await Runtime.runPromiseExit(runtime)(effectStep(ctx))
      // ...
    }
  }
}
```

---

## 3. Goals (Objetivos)

Los siguientes goals están basados en las features discutidas en el chat original.

### Goal 1: Integración Nativa con Effect v4

**Descripción**: Cada step de un workflow Hatchet debe poder escribirse como un `Effect<A, E, R>` puro, aprovechando todas las bondades del ecosistema Effect.

**Detalles Técnicos (v4)**:

- Usar `ServiceMap.Service` en lugar de `Context.Tag`
- El tipo `R` (dependencias) debe inferirse automáticamente
- Errores propagados correctamente para que Hatchet aplique retries
- Contexto de Hatchet disponible vía inyección de dependencias

**Criterio de Éxito**: Un developer puede escribir un step que requiera una dependencia y se inyecte automáticamente.

---

### Goal 2: Bidireccionalidad Effect ↔ Promise (Effectifier)

**Descripción**: La librería debe actuar como puente bidireccional:

1. **Effect → Promise**: Ejecutar un `Effect` dentro del runtime de Hatchet (que espera `Promise`)
2. **Promise → Effect**: Llamar a funciones del SDK de Hatchet desde Effect

**Detalles Técnicos (v4)**:

- Usar `Effect.runForkWith` junto con `Effect.services` para ejecutar Effects
- Convertir Failures a excepciones nativas para que Hatchet detecte errores
- Envolver llamadas SDK con `Effect.tryPromise` para tipar errores
- El Effectifier debe permitir que Hatchet ejecute steps definidos como Effects puros

**Criterio de Éxito**: Un workflow que falla con `Effect.fail` debe aparecer como "failed" en el dashboard de Hatchet y triggear los retries configurados.

---

### Goal 3: Inyección de Contexto de Hatchet (HatchetStepContext)

**Descripción**: El contexto de Hatchet (input, output de steps anteriores, logger) debe estar disponible vía inyección de dependencias, NO como parámetros pasados a funciones.

**Detalles Técnicos (v4)**:

- Crear `HatchetStepContext` como ServiceMap.Service
- El step NO recibe ctx como parámetro, lo obtiene con `yield* HatchetStepContext`
- Permite acceder a: `workflowInput()`, `stepOutput()`, `log()`

**Criterio de Éxito**: `yield* HatchetStepContext` devuelve el contexto con acceso a input (property `input`) y output de tasks padre (`parentOutput(taskRef)`).

---

### Goal 4: Observabilidad Integrada (HatchetLogger)

**Descripción**: Los logs generados con `Effect.log()` deben aparecer automáticamente en el dashboard de Hatchet sin necesidad de invocar `ctx.log()` manualmente.

**Detalles Técnicos (v4)**:

- Crear un Logger personalizado de Effect
- Detectar si existe `HatchetStepContext` en el Fiber actual
- Si existe, reenviar el log a `ctx.log()` de Hatchet
- Si no existe, comportarse como logger por defecto

**Criterio de Éxito**: `yield* Effect.log("mensaje")` dentro de un step aparece en la UI de Hatchet.

---

### Goal 5: Validación de Input con Schema

**Descripción**: El input de un workflow debe validarse automáticamente contra un schema de `effect` (Schema) antes de ejecutar la lógica de negocio.

**Detalles Técnicos (v4)**:

- Usar `Schema.decodeUnknown` del paquete principal `effect`
- Proveer utilidad `getValidatedInput(schema)`
- Si la validación falla, el step falla con `Schema.ParseError`
- El tipo TypeScript debe inferirse del schema

**Criterio de Éxito**: Input inválido falla con ParseError antes de ejecutar lógica.

---

### Goal 6: API Declarativa Estilo Hatchet (Workflow Builder)

**Descripción**: La API de definición de workflows debe ser muy similar a la de Hatchet, pero usando Effect. Los usuarios de Hatchet deben sentirse familiarizados.

**Detalles Técnicos (v4)**:

- Métodos similares a Hatchet: `workflow()`, `task()`, reemplazando el handler `fn` por un Effect
- Tasks definidos como Effects puros
- Inferencia automática de dependencias acumuladas
- Soporte para opciones de Hatchet: timeout, retry, parents (DAG), etc.

**Criterio de Éxito**: Un workflow completo se registra en <10 líneas de código.

---

### Goal 7: Configuración Centralizada (Effect Config)

**Descripción**: Toda la configuración de Hatchet (token, host, namespace, etc.) debe estar centralizada usando Effect Config.

**Detalles Técnicos (v4)**:

- Usar `Config.Wrap<>` para definir configuración
- Crear servicio `HatchetConfig` via `ServiceMap.Service`
- El cliente se inicializa desde la configuración
- Permite sobrescribir en testing

**Criterio de Éxito**: Un solo lugar para configurar Hatchet, usado por todos los servicios de la librería.

---

### Goal 8: Testing Robusto con Docker Compose

**Descripción**: Tests de integración contra Hatchet real en Docker, incluyendo PostgreSQL (necesario para Hatchet).

**Detalles Técnicos**:

- Docker Compose con Hatchet + PostgreSQL (no emulador)
- Tests de integración que ejecutan workflows reales
- Verificación de: registro, ejecución, retries, logs
- Helpers de testing para tests unitarios sin dependencias externas

**Criterio de Éxito**: >90% coverage en tests unitarios, tests de integración passing contra Hatchet real.

---

### Goal 9: Ejemplo en React Router Example

**Descripción**: La app `react-router-example` del monorepo debe incluir un ejemplo funcional de la librería.

**Detalles Técnicos**:

- Worker de Hatchet corriendo como proceso separado
- Routes para dispara y monitorear workflows
- docker-compose con Hatchet + PostgreSQL + App + Worker

**Criterio de Éxito**: La app ejemplo demuestra workflows funcionales.

---

### Goal 10: Documentación del Package

**Descripción**: El package debe incluir un README.md completo con setup, instalación y ejemplos.

**Detalles Técnicos**:

- Sección de instalación (npm/pnpm)
- Sección de configuración
- Ejemplos de uso básicos y avanzados
- API reference resumida

**Criterio de Éxito**: Un developer puede usar la librería siguiendo solo el README.

---

## 4. Arquitectura de Módulos

```
@effectify/hatchet/
├── src/
│   ├── index.ts                    # Exports públicos
│   │
│   ├── core/
│   │   ├── config.ts               # HatchetConfig + Effect Config
│   │   ├── client.ts               # HatchetClientService + HatchetClientLive
│   │   ├── error.ts                # HatchetError (TaggedError)
│   │   └── context.ts              # HatchetStepContext + getHatchetInput
│   │
│   ├── effectifier/
│   │   ├── execute.ts              # effectifyTask + createEffectifierFromLayer
│   │   └── types.ts                # Tipos internos
│   │
│   ├── workflow/
│   │   ├── workflow.ts             # workflow() + EffectWorkflow class
│   │   ├── task.ts                 # task() function (replaces step())
│   │   ├── register.ts             # registerWorkflow()
│   │   └── types.ts                # TaskOptions, WorkflowOptions
│   │
│   ├── logging/
│   │   ├── hatchet-logger.ts       # HatchetLogger + withHatchetLogger
│   │   └── index.ts                # Exports
│   │
│   ├── schema/
│   │   ├── get-validated-input.ts  # getValidatedInput
│   │   └── index.ts                # Exports
│   │
│   └── testing/
│       ├── mock-context.ts         # createMockStepContext + runTestTask
│       └── index.ts                # Exports
│
├── tests/
│   ├── unit/
│   │   ├── client.test.ts
│   │   ├── effectifier.test.ts
│   │   ├── logger.test.ts
│   │   ├── schema.test.ts
│   │   └── workflow.test.ts
│   │
│   └── integration/
│       ├── docker-compose.yml      # Hatchet + PostgreSQL
│       └── workflow.test.ts         # Tests contra Hatchet real
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 5. API Propuesta - Effect v4

### 5.1 Módulo: Core - Configuración (v4 Pattern)

```typescript
// src/core/config.ts
import { Config, Effect, Layer, Schema, ServiceMap } from "effect"

// Esquema de configuración
const HatchetConfigSchema = Schema.Struct({
  token: Schema.String,
  host: Schema.String.pipe(Schema.defaultTo("http://localhost:8080")),
  namespace: Schema.optional(Schema.String),
})

type HatchetConfigType = Schema.Schema.Type<typeof HatchetConfigSchema>

// ✅ ServiceMap.Service en lugar de Context.Tag
export class HatchetConfig extends ServiceMap.Service<
  HatchetConfig,
  HatchetConfigType
>()("HatchetConfig") {}

// Layer que provee la configuración
export const HatchetConfigLayer = (
  config: HatchetConfigType,
): Layer.Layer<HatchetConfig> => Layer.succeed(HatchetConfig, config)

// Layer desde Config.Wrap
export const HatchetConfigLayerFromEnv = (
  config: Config.Wrap<HatchetConfigType>,
): Layer.Layer<HatchetConfig, Config.ConfigError> =>
  Layer.effect(HatchetConfig)(Effect.map(Config.unwrap(config), (c) => c))
```

### 5.2 Módulo: Core - Cliente (v4 Pattern)

```typescript
// src/core/client.ts
import { Data, Effect, Layer, ServiceMap } from "effect"
import { HatchetClient } from "@hatchet-dev/typescript-sdk"

// ✅ Errores usando Data.TaggedError
export class HatchetError extends Data.TaggedError(
  "@effectify/hatchet/HatchetError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

// ✅ ServiceMap.Service para el cliente
export class HatchetClientService extends ServiceMap.Service<
  HatchetClientService,
  HatchetClient
>()("HatchetClient") {}

// Layer para inicializar el cliente
export const HatchetClientLive = Layer.effect(HatchetClientService)(
  Effect.gen(function*() {
    const config = yield* HatchetConfig
    // ✅ SDK real: HatchetClient.init()
    const hatchet = HatchetClient.init({
      token: config.token,
      host_port: config.host,
    })
    return hatchet
  }),
)
```

### 5.3 Módulo: Core - Contexto del Step (v4 Pattern)

```typescript
// src/core/context.ts
import { Effect, ServiceMap } from "effect"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"

export class HatchetStepContext extends ServiceMap.Service<
  HatchetStepContext,
  HatchetContext<any, any>
>()("HatchetStepContext") {}

// ✅ Utility to access input (SDK v1: input is a property, not a method)
// Usage: const input = yield* getHatchetInput<MyType>()
export const getHatchetInput = <T>() => Effect.map(HatchetStepContext, (ctx) => ctx.input as T)
```

### 5.4 Módulo: Effectifier

```typescript
// src/effectifier/execute.ts
import { Cause, Effect, ManagedRuntime } from "effect"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"
import { HatchetStepContext } from "../core/context"

// ✅ Effectifier: ejecuta un Effect en el contexto de Hatchet
// Convierte Effect → Promise para que Hatchet ejecute el task
// Si el Effect falla, hace throw para que Hatchet aplique retries

export const effectifyTask = <A, E, R>(
  effect: Effect.Effect<A, E, R | HatchetStepContext>,
  runtime: ManagedRuntime.ManagedRuntime<R, never>,
) => {
  return async (input: unknown, ctx: HatchetContext<any, any>): Promise<A> => {
    // 1. Inyectamos el contexto de Hatchet como servicio
    const effectWithContext = Effect.provideService(
      effect,
      HatchetStepContext,
      ctx,
    )

    // 2. Ejecutamos con ManagedRuntime (no Effect.runtime<R>() que no existe en v4)
    const exit = await runtime.runPromiseExit(effectWithContext)

    // 3. Convertimos el resultado
    if (exit._tag === "Success") {
      return exit.value
    } else {
      // ✅ Convertir failure a excepción para que Hatchet haga retry
      const error = Cause.squash(exit.cause)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}

// ✅ Fábrica: crea un Effectifier desde un Layer
// Usage: const effectify = createEffectifierFromLayer(MyAppLayer)
export const createEffectifierFromLayer = <R>(
  layer: Layer.Layer<R, any, never>,
) => {
  const runtime = ManagedRuntime.make(layer)
  return <A, E>(effect: Effect.Effect<A, E, R | HatchetStepContext>) => effectifyTask(effect, runtime)
}
```

### 5.5 Módulo: Workflow (API Estilo Hatchet)

```typescript
// src/workflow/types.ts
import type { RetryOpts, TaskConcurrency } from "@hatchet-dev/typescript-sdk"

export interface TaskOptions {
  readonly name: string
  readonly timeout?: string
  readonly retries?: number
  readonly rateLimits?: Array<{ key: string; limit: number; duration: string }>
  readonly concurrency?: TaskConcurrency[]
  readonly parents?: string[] // DAG: parent task names
}

export interface WorkflowOptions {
  readonly name: string
  readonly description?: string
  readonly version?: string
  readonly sticky?: boolean
  readonly concurrency?: TaskConcurrency[]
}

export interface TaskDefinition<R> {
  readonly options: TaskOptions
  readonly effect: Effect.Effect<any, any, R>
}
```

```typescript
// src/workflow/workflow.ts
import { Effect } from "effect"
import type { TaskDefinition, TaskOptions, WorkflowOptions } from "./types"

export class EffectWorkflow<R> {
  readonly tasks: TaskDefinition<R>[] = []

  constructor(
    readonly options: WorkflowOptions,
    readonly dependencies: R = undefined as R,
  ) {}

  // ✅ Adds a task (replaces step() — SDK uses .task())
  task<A, E, R2>(
    options: TaskOptions,
    effect: Effect.Effect<A, E, R2>,
  ): EffectWorkflow<R | R2> {
    this.tasks.push({ options, effect } as TaskDefinition<R | R2>)
    return this as any
  }
}

export const workflow = (options: WorkflowOptions) => new EffectWorkflow<never>(options)
```

```typescript
// src/workflow/register.ts
import { Effect, ManagedRuntime } from "effect"
import { HatchetClientService } from "../core/client"
import { HatchetStepContext } from "../core/context"
import { effectifyTask } from "../effectifier/execute"
import type { EffectWorkflow } from "./workflow"

// ✅ registerWorkflow: registra un EffectWorkflow en Hatchet
// Reemplaza el boilerplate manual de crear tasks con effectifyStep
export const registerWorkflow = <R>(
  workerName: string,
  wf: EffectWorkflow<R>,
  layer: Layer.Layer<R, any, never>,
): Effect.Effect<void, never, HatchetClientService> =>
  Effect.gen(function*() {
    const hatchet = yield* HatchetClientService
    const runtime = ManagedRuntime.make(layer)

    // ✅ SDK real: hatchet.workflow({ name })
    const hatchetWorkflow = hatchet.workflow<any, any>({
      name: wf.options.name,
      ...(wf.options.description && { description: wf.options.description }),
      ...(wf.options.version && { version: wf.options.version }),
    })

    // ✅ SDK real: workflow.task({ name, fn })
    // Convertimos cada Effect.Task a un task de Hatchet
    wf.tasks.forEach((taskDef) => {
      hatchetWorkflow.task({
        name: taskDef.options.name,
        fn: effectifyTask(taskDef.effect, runtime),
        ...(taskDef.options.retries && { retries: taskDef.options.retries }),
        ...(taskDef.options.timeout && {
          execution_timeout: taskDef.options.timeout,
        }),
        ...(taskDef.options.parents && { parents: taskDef.options.parents }),
      })
    })

    // ✅ SDK real: hatchet.worker(name, { workflows: [wf] })
    const worker = yield* Effect.tryPromise({
      try: () => hatchet.worker(workerName, { workflows: [hatchetWorkflow] }),
      catch: (e) => new HatchetError({ message: "Failed to create worker", cause: e }),
    })

    yield* Effect.log(
      `Workflow '${wf.options.name}' registered on worker '${workerName}'`,
    )

    // Iniciar el worker
    yield* Effect.tryPromise({
      try: () => worker.start(),
      catch: (e) => new HatchetError({ message: "Failed to start worker", cause: e }),
    })
  })
```

### 5.6 Módulo: Logging

```typescript
// src/logging/hatchet-logger.ts
import { Effect, Logger, Option, ServiceMap } from "effect"

export const HatchetLogger = Logger.make(({ logLevel, message, context }) => {
  const msg = typeof message === "string" ? message : String(message)

  // ✅ Buscamos el contexto de Hatchet dentro del Fiber actual
  const hatchetCtxOpt = ServiceMap.getOption(context, HatchetStepContext)

  if (Option.isSome(hatchetCtxOpt)) {
    // Estamos dentro de un task de Hatchet — enviamos log a su UI
    hatchetCtxOpt.value.log(`[${logLevel.label}] ${msg}`)
  }

  // Mantenemos el log local en consola
  console.log(`[${logLevel.label}] ${msg}`)
})

// ✅ Logger.replace NO existe en v4 — usar Effect.withLogger
export const withHatchetLogger = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.withLogger(effect, HatchetLogger)
```

### 5.7 Módulo: Schema

```typescript
// src/schema/get-validated-input.ts
import { Effect, Schema } from "effect"
import { HatchetStepContext } from "../core/context"

// ✅ Extrae y valida el input del workflow contra un schema
// ✅ Schema es parte del paquete principal 'effect', NO '@effect/schema'
export const getValidatedInput = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Effect.Effect<A, Schema.ParseError, R | HatchetStepContext> =>
  Effect.gen(function*() {
    const ctx = yield* HatchetStepContext
    // ✅ SDK v1: input es una property, no ctx.workflowInput()
    const rawInput = ctx.input
    const decode = Schema.decodeUnknown(schema)
    return yield* decode(rawInput)
  })
```

### 5.8 Módulo: Testing

```typescript
// src/testing/mock-context.ts
import { Effect, Exit, ServiceMap } from "effect"
import { HatchetStepContext } from "../core/context"

export const createMockStepContext = (input?: unknown): any => ({
  input: input ?? {}, // ✅ SDK v1: input es property
  parentOutput: async () => null,
  log: async () => {},
  logger: {
    info: async () => {},
    debug: async () => {},
    warn: async () => {},
    error: async () => {},
  },
  workflowRunId: () => "test-run-id",
  workflowName: () => "test-workflow",
  taskName: () => "test-task",
  retryCount: () => 0,
})

export const runTestTask = <A, E, R>(
  effect: Effect.Effect<A, E, R | HatchetStepContext>,
  mockContext?: any,
): Effect.Effect<Exit.Exit<A, E>, never, R> => {
  const ctx = mockContext ?? createMockStepContext()
  return effect.pipe(
    Effect.provideService(HatchetStepContext, ctx),
    Effect.exit,
  ) as any
}
```

---

## 6. Ejemplo Completo de Uso - Effect v4 (API Real del SDK)

### 6.1 Definición de Workflow

```typescript
// workflows/user-onboarding.ts
import { Effect, Schema } from "effect"
import { getValidatedInput, HatchetStepContext, task, workflow } from "@effectify/hatchet"

const UserInputSchema = Schema.Struct({
  userId: Schema.String,
  email: Schema.String.pipe(Schema.email()),
})

const fetchUserTask = task(
  { name: "fetch-user", timeout: "30s" },
  Effect.gen(function*() {
    const input = yield* getValidatedInput(UserInputSchema)
    const db = yield* Database
    yield* Effect.log(`Fetching user ${input.userId}`)
    return yield* db.findUser(input.userId)
  }),
)

const sendEmailTask = task(
  { name: "send-email", retries: 3, parents: ["fetch-user"] },
  Effect.gen(function*() {
    const ctx = yield* HatchetStepContext
    // ✅ SDK v1: parentOutput(taskRef) replaces deprecated stepOutput
    const user = yield* Effect.tryPromise({
      try: () => ctx.parentOutput<{ email: string }>(fetchUserTask),
      catch: (e) => new HatchetError({ message: "Failed to get user", cause: e }),
    })
    const emailService = yield* EmailService
    yield* Effect.log(`Sending email to ${user.email}`)
    return yield* emailService.send(user.email, "Welcome!")
  }),
)

export const userOnboardingWorkflow = workflow({
  name: "user-onboarding",
  description: "Onboarding workflow",
})
  .task(fetchUserTask)
  .task(sendEmailTask)
```

### 6.2 Registro del Worker

```typescript
// worker/index.ts
import { Effect, Layer } from "effect"
import {
  HatchetClientLive,
  HatchetConfig,
  HatchetConfigLayer,
  registerWorkflow,
  withHatchetLogger,
} from "@effectify/hatchet"
import { userOnboardingWorkflow } from "./workflows/user-onboarding"

const mainProgram = Effect.gen(function*() {
  const cfg = yield* HatchetConfig
  yield* Effect.log(`Conectando a Hatchet en ${cfg.host}`)
  yield* registerWorkflow("main-worker", userOnboardingWorkflow, DatabaseLive)
  yield* Effect.log("Worker iniciado")
})

const runnable = withHatchetLogger(
  Effect.provide(
    mainProgram,
    Layer.mergeAll(
      HatchetConfigLayer({
        token: process.env.HATCHET_TOKEN!,
        host: process.env.HATCHET_HOST ?? "http://localhost:8080",
      }),
      HatchetClientLive,
      DatabaseLive,
      EmailServiceLive,
    ),
  ),
)

Effect.runPromise(runnable)
```

---

## 7. Docker Compose para Desarrollo

### 7.1 docker-compose.yml (Development)

```yaml
version: "3.8"

services:
  # PostgreSQL requerido por Hatchet
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: hatchet
      POSTGRES_PASSWORD: hatchet
      POSTGRES_DB: hatchet
    volumes:
      - hatchet_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hatchet"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Hatchet Engine
  hatchet:
    image: ghcr.io/hatchet-dev/hatchet:latest
    ports:
      - "8080:8080"
    environment:
      - HATCHET_SERVER_TOKEN=${HATCHET_TOKEN:-test-token}
      - HATCHET_SERVER_URL=http://localhost:8080
      - DATABASE_URL=postgresql://hatchet:hatchet@postgres:5432/hatchet
      - HATCHET_PG_MIN_IDLE_CONNS=1
      - HATCHET_PG_MAX_IDLE_CONNS=2
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  hatchet_data:
```

---

## 8. React Router Example

### 8.1 Estructura

```
apps/react-router-example/
├── src/
│   ├── routes/
│   │   ├── _index.tsx              # Dashboard de workflows
│   │   ├── api.workflows.trigger.tsx  # Endpoint para dispara
│   │   └── api.workflows.status.tsx   # Status del workflow
│   ├── services/
│   │   └── hatchet.ts              # Cliente de Hatchet
│   ├── worker/
│   │   ├── index.ts                # Entry point del worker
│   │   └── workflows/
│   │       ├── hello.ts            # Ejemplo simple
│   │       └── user-onboarding.ts  # Ejemplo completo
│   └── lib/
│       └── hatchet-setup.ts        # Setup de layers
├── docker-compose.yml              # Hatchet + App + Worker
├── Dockerfile.worker               # Worker单独
└── package.json
```

### 8.2 docker-compose.yml del Ejemplo

```yaml
version: "3.8"

services:
  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: hatchet
      POSTGRES_PASSWORD: hatchet
      POSTGRES_DB: hatchet
    volumes:
      - hatchet_data:/var/lib/postgresql/data

  # Hatchet Engine
  hatchet:
    image: ghcr.io/hatchet-dev/hatchet:latest
    ports:
      - "8080:8080"
    environment:
      - HATCHET_SERVER_TOKEN=${HATCHET_TOKEN:-test-token}
      - DATABASE_URL=postgresql://hatchet:hatchet@postgres:5432/hatchet
    depends_on:
      postgres:
        condition: service_healthy

  # React Router App
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data.db
      - HATCHET_TOKEN=${HATCHET_TOKEN:-test-token}
      - HATCHET_HOST=http://hatchet:8080
    depends_on:
      - hatchet
    volumes:
      - ./data:/app/data

  # Worker de Hatchet
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - HATCHET_TOKEN=${HATCHET_TOKEN:-test-token}
      - HATCHET_HOST=http://hatchet:8080
      - DATABASE_URL=postgresql://hatchet:hatchet@postgres:5432/hatchet
    depends_on:
      - hatchet

volumes:
  hatchet_data:
```

### 8.3 Ejemplo Simple: Hello World

```typescript
// src/worker/workflows/hello.ts
import { Effect } from "effect"
import { task, workflow } from "@effectify/hatchet"

// Task simple que retorna un mensaje
const helloTask = task(
  { name: "hello" },
  Effect.gen(function*() {
    yield* Effect.log("Ejecutando hello task")
    return {
      message: "Hello from Effect v4 + Hatchet!",
      timestamp: new Date().toISOString(),
    }
  }),
)

export const helloWorkflow = workflow({
  name: "hello-world",
  description: "Ejemplo simple de workflow con Effect v4",
}).task(helloTask)
```

### 8.4 Ejemplo Completo: User Onboarding

```typescript
// src/worker/workflows/user-onboarding.ts
import { Effect, Schema } from "effect"
import { getValidatedInput, HatchetError, HatchetStepContext, task, workflow } from "@effectify/hatchet"

// Schema de validación
const UserInputSchema = Schema.Struct({
  userId: Schema.String,
  email: Schema.String.pipe(Schema.email()),
  name: Schema.String,
})

// Task 1: Validar y crear usuario
const createUserTask = task(
  { name: "create-user", timeout: "30s" },
  Effect.gen(function*() {
    const input = yield* getValidatedInput(UserInputSchema)
    const db = yield* Database

    yield* Effect.log(`Creando usuario: ${input.name} (${input.email})`)

    const user = yield* db.createUser({
      id: input.userId,
      name: input.name,
      email: input.email,
    })

    return user
  }),
)

// Task 2: Enviar email de bienvenida (depends on createUserTask)
const sendWelcomeEmailTask = task(
  { name: "send-welcome-email", retries: 3, parents: ["create-user"] },
  Effect.gen(function*() {
    const ctx = yield* HatchetStepContext
    // ✅ SDK v1: parentOutput(taskRef) replaces deprecated stepOutput
    const user = yield* Effect.tryPromise({
      try: () => ctx.parentOutput<{ email: string; name: string }>(createUserTask),
      catch: (e) => new HatchetError({ message: "Failed to get parent output", cause: e }),
    })
    const emailService = yield* EmailService

    yield* Effect.log(`Enviando email a ${user.email}`)

    yield* emailService.send(user.email, "Bienvenido a la plataforma!")

    return { emailSent: true }
  }),
)

// Task 3: Logging final (depends on sendWelcomeEmailTask)
const notifyAdminTask = task(
  { name: "notify-admin", parents: ["create-user"] },
  Effect.gen(function*() {
    const ctx = yield* HatchetStepContext
    const user = yield* Effect.tryPromise({
      try: () => ctx.parentOutput<{ email: string; name: string }>(createUserTask),
      catch: (e) => new HatchetError({ message: "Failed to get parent output", cause: e }),
    })

    yield* Effect.log(`Nuevo usuario registrado: ${user.name} <${user.email}>`)

    return { notified: true }
  }),
)

// Workflow completo (DAG con tasks)
export const userOnboardingWorkflow = workflow({
  name: "user-onboarding",
  description: "Workflow de onboarding de nuevos usuarios",
})
  .task(createUserTask)
  .task(sendWelcomeEmailTask)
  .task(notifyAdminTask)
```

### 8.5 Routes del Ejemplo

```typescript
// src/routes/api.workflows.trigger.tsx
import { type ActionFunctionArgs, json } from "react-router"
import { Effect } from "effect"
import { AppLayers, triggerWorkflow } from "~/lib/hatchet-setup"

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const userId = formData.get("userId") as string
  const email = formData.get("email") as string
  const name = formData.get("name") as string

  const program = Effect.gen(function*() {
    yield* Effect.log(`Triggering onboarding para ${email}`)
    const result = yield* triggerWorkflow("user-onboarding", {
      userId,
      email,
      name,
    })
    yield* Effect.log(`Workflow iniciado: ${result.workflowRunId}`)
    return { workflowRunId: result.workflowRunId }
  })

  const result = await Effect.runPromise(Effect.provide(program, AppLayers))
  return json({ success: true, workflowRunId: result.workflowRunId })
}

// src/routes/api.workflows.status.tsx
import { json, type LoaderFunctionArgs } from "react-router"
import { Effect } from "effect"
import { AppLayers, getWorkflowStatus } from "~/lib/hatchet-setup"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const workflowRunId = url.searchParams.get("workflowRunId")

  if (!workflowRunId) {
    return json({ error: "workflowRunId requerido" }, { status: 400 })
  }

  const program = getWorkflowStatus(workflowRunId)
  const result = await Effect.runPromise(Effect.provide(program, AppLayers))

  return json(result)
}
```

---

## 9. README.md del Package

El package debe incluir un `README.md` completo:

````markdown
# @effectify/hatchet

> Integración nativa entre Effect v4 y Hatchet

## Instalación

```bash
npm install @effectify/hatchet
# o
pnpm add @effectify/hatchet
```

## Requisitos

- Effect v4 (`effect` package)
- `@hatchet-dev/typescript-sdk` v1+
- Hatchet Engine corriendo (ver docker-compose)

## Configuración rápida

### 1. Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hatchet
      POSTGRES_PASSWORD: hatchet
      POSTGRES_DB: hatchet

  hatchet:
    image: ghcr.io/hatchet-dev/hatchet:latest
    environment:
      - HATCHET_SERVER_TOKEN=tu-token
      - DATABASE_URL=postgresql://hatchet:hatchet@postgres:5432/hatchet
    depends_on:
      - postgres
```

### 2. Definir un Workflow

```typescript
import { Effect, Schema } from "effect"
import { getValidatedInput, HatchetStepContext, task, workflow } from "@effectify/hatchet"

// Schema de validación del input
const InputSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String.pipe(Schema.email()),
})

// Task como Effect puro
const greetTask = task(
  { name: "greet", timeout: "30s" },
  Effect.gen(function*() {
    const input = yield* getValidatedInput(InputSchema)
    yield* Effect.log(`Hola, ${input.name}!`)
    return { greeting: `Hola, ${input.name}!` }
  }),
)

// Definir workflow
export const greetWorkflow = workflow({
  name: "greet-user",
  description: "Saluda a un usuario",
}).task(greetTask)
```

### 3. Iniciar el Worker

```typescript
import { Effect, Layer } from "effect"
import { HatchetClientLive, HatchetConfigLayer, registerWorkflow, withHatchetLogger } from "@effectify/hatchet"
import { greetWorkflow } from "./workflows/greet"

const main = Effect.gen(function*() {
  yield* registerWorkflow("my-worker", greetWorkflow, Layer.empty)
  yield* Effect.log("Worker iniciado")
})

Effect.runPromise(
  withHatchetLogger(
    Effect.provide(
      main,
      Layer.mergeAll(
        HatchetConfigLayer({
          token: process.env.HATCHET_TOKEN!,
          host: process.env.HATCHET_HOST ?? "http://localhost:8080",
        }),
        HatchetClientLive,
      ),
    ),
  ),
)
```

### 4. Disparar desde tu App

```typescript
import { Effect } from "effect"
import { HatchetClientService, HatchetError } from "@effectify/hatchet"

const triggerGreeting = (name: string, email: string) =>
  Effect.gen(function*() {
    const hatchet = yield* HatchetClientService
    const result = yield* Effect.tryPromise({
      try: () => hatchet.admin.runWorkflow("greet-user", { name, email }),
      catch: (e) => new HatchetError({ message: "Error al ejecutar", cause: e }),
    })
    return result
  })
```

## API

### `workflow(options)`

Define un workflow estilo Hatchet.

```typescript
const myWorkflow = workflow({
  name: "my-workflow",
  description: "Descripción",
})
```

### `task(options, effect)`

Define un task como Effect puro (replaces step).

```typescript
task(
  {
    name: "my-task",
    timeout: "30s", // timeout opcional
    retries: 3, // retries opcional
    parents: ["other-task"], // DAG: dependencias opcionales
  },
  Effect.gen(function*() {
    // Tu lógica como Effect
    return { result: "ok" }
  }),
)
```

### `getValidatedInput(schema)`

Extrae y valida el input del workflow (SDK v1: usa `ctx.input`).

```typescript
const myTask = task(
  { name: "process" },
  Effect.gen(function*() {
    const input = yield* getValidatedInput(MySchema)
    // input está tipado y validado
    return input
  }),
)
```

## Errores

Todos los errores usan `Data.TaggedError`:

```typescript
import { HatchetError } from "@effectify/hatchet"

Effect.gen(function*() {
  // ...
}).pipe(
  Effect.catchTag("HatchetError", (e) => Effect.log(`Error: ${e.message}`)),
)
```
````

## Testing

```typescript
import { createMockStepContext, runTestStep } from "@effectify/hatchet/testing"

it("should process step", async () => {
  const mockCtx = createMockStepContext({ name: "Test" })
  const result = await Effect.runPromiseExit(
    runTestStep(myStep, Layer.empty, mockCtx),
  )
  expect(Exit.isSuccess(result)).toBe(true)
})
```

## Licencia

MIT

````
---

## 10. Estrategia de Testing

### 10.1 Tests Unitarios

- Sin dependencias externas
- Coverage >90% en módulos core
- Uso de `createMockStepContext` y `runTestTask`

### 10.2 Tests de Integración

**Docker Compose con PostgreSQL**:

```yaml
# tests/integration/docker-compose.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hatchet
      POSTGRES_PASSWORD: hatchet
      POSTGRES_DB: hatchet
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hatchet"]

  hatchet-test:
    image: ghcr.io/hatchet-dev/hatchet:latest
    environment:
      - HATCHET_SERVER_TOKEN=test-token
      - DATABASE_URL=postgresql://hatchet:hatchet@postgres-test:5432/hatchet
    depends_on:
      postgres-test:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 5s
      timeout: 3s
      retries: 15
````

**Tests de integración**:

```typescript
// tests/integration/workflow.test.ts
describe("Workflow Integration", () => {
  beforeAll(async () => {
    // Esperar a que Hatchet esté listo
    await waitForHatchet("http://localhost:8080/health")
  })

  it("should register and execute workflow", async () => {
    // Arrange
    const testTask = task({ name: "test" }, Effect.succeed({ ok: true }))
    const testWorkflow = workflow({
      name: "integration-test",
    }).task(testTask)

    // Act
    const program = Effect.gen(function*() {
      yield* registerWorkflow("test-worker", testWorkflow, Layer.empty)
      yield* Effect.sleep("1s") // Esperar registro

      const hatchet = yield* HatchetClientService
      return yield* Effect.tryPromise(() => hatchet.admin.runWorkflow("integration-test", {}))
    })

    const result = await Effect.runPromise(Effect.provide(program, TestLayers))

    // Assert
    expect(result.workflowRunId).toBeDefined()
  })
})
```

---

## 11. Patrones Obligatorios de Effect v4

### ✅ Patrones OBLIGATORIOS

1. **NUNCA usar try-catch en Effect.gen**
2. **NUNCA usar type assertions (`as any`)**
3. **SIEMPRE usar `return yield*` para Effects terminal**
4. **Usar `ServiceMap.Service` en lugar de `Context.Tag`**
5. **Usar `ManagedRuntime.make(layer)` en lugar de `Effect.runtime<R>()` (NO existe)**
6. **Usar `Schema` del paquete `effect`, NO de `@effect/schema` (paquete separado NO existe)**
7. **Usar `Effect.withLogger(effect, logger)` en lugar de `Logger.replace` (NO existe)**
8. **Usar `ServiceMap.getOption()` en lugar de `Context.getOption()` (módulo Context NO existe)**

### ✅ APIs Verificadas (Existentes)

- `ServiceMap.Service` — reemplaza `Context.Tag`
- `Effect.runForkWith(services)` — ejecutar Effect con services
- `Effect.provideService(key, value)` — inyectar un service
- `Config.Wrap<T>` / `Config.unwrap(wrapped)` — configuración type-safe
- `Layer.succeed(key)(value)` — Layer estático
- `Layer.effect(key)(effect)` — Layer desde Effect
- `Layer.mergeAll(layers...)` — merge de layers
- `Data.TaggedError(tag)` — errores estructurados
- `Logger.make(fn)` — crear logger custom
- `Effect.runPromiseExit` / `Effect.runFork` — ejecución

---

## 12. Roadmap

### Milestone 1: Core + Config (Semana 1-2)

- [ ] Setup del proyecto
- [ ] `HatchetConfig` con ServiceMap
- [ ] `HatchetClient`
- [ ] Tests unitarios

### Milestone 2: Effectifier + Context (Semana 3)

- [ ] `HatchetStepContext`
- [ ] `effectifyTask` + `createEffectifierFromLayer`
- [ ] Manejo de errores correcto (Failure → throw para Hatchet retries)

### Milestone 3: Workflow API (Semana 4)

- [ ] `workflow()` y `task()` (SDK usa `.task()`, no `.step()`)
- [ ] Inferencia de dependencias
- [ ] `registerWorkflow`

### Milestone 4: Logging + Schema (Semana 5)

- [ ] Logger personalizado
- [ ] Validación de input

### Milestone 5: Docker + Testing (Semana 6)

- [ ] Docker Compose con PostgreSQL
- [ ] Tests de integración

### Milestone 6: React Router Example + README + Release (Semana 7-8)

- [ ] Ejemplo completo en react-router-example
- [ ] README.md del package
- [ ] Release v0.1.0

---

## 13. Dependencias

```json
{
  "dependencies": {
    "@hatchet-dev/typescript-sdk": "^1.19.0"
  },
  "peerDependencies": {
    "effect": "catalog:"
  },
  "devDependencies": {
    "@effect/vitest": "catalog:",
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

**Nota**: `@effect/schema` NO es necesario — Schema está incluido en el paquete principal `effect`.

---

## 14. Glosario

| Término              | Definición                                       |
| -------------------- | ------------------------------------------------ |
| **Effect**           | Framework de programación funcional v4           |
| **ServiceMap**       | Sistema de inyección de dependencias en v4       |
| **Hatchet**          | Sistema de workflows y background jobs           |
| **Effectifier**      | Adaptador que convierte Effect a Promise         |
| **ManagedRuntime**   | Ejecución de Effects con dependencias (v4)       |
| **Layer**            | Composición de dependencias en Effect            |
| **Data.TaggedError** | Errores estructurados con discriminación         |
| **Task**             | Unidad de trabajo en Hatchet SDK v1 (era "step") |

---

## 15. Referencias

- **Effect v4 Patterns**: `.effect-reference/.patterns/`
- **Effect v4 Migration**: `.effect-reference/migration/`
- **Skill**: `.agent/skills/effect-pattern-discovery/SKILL.md`

---

_Documento creado: Marzo 2026_
_Versión: 1.1.0 (APIs verificadas)_
_Estado: Draft - APIs verificadas contra Effect v4 + Hatchet SDK v1.19.0_
_Cambios v1.1.0_: API verification — step→task, Schema de effect, ManagedRuntime, ctx.input, Effect.withLogger
