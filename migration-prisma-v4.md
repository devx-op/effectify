---
title: "PRD: Migración de packages/prisma a Effect v4 (Beta)"
type: "Product Requirements Document"
status: "In Progress"
epic: "Effect-ts v4 Monorepo Upgrade"
target_branch: "migration-prisma-v4"
base_branch: "dev"
---

# PRD: Migración del Generador Prisma a Effect v4 (Beta)

## 1. Visión General

El objetivo de este documento es definir los requerimientos para completar la migración del paquete `packages/prisma` a la versión **v4 (Beta)** de `effect`. Este es el último paquete del monorepo pendiente de actualización. La migración abarca el CLI, los servicios subyacentes (específicamente `generator-service.ts`), y la refactorización de los templates para asegurar que el código generado emita sintaxis válida y moderna de Effect v4.

## 2. Contexto Técnico y Herramientas de IA

- **Worktree Skill Activo:** El agente de IA cuenta con la habilidad de consultar el directorio `.effect-reference` (un git worktree local apuntando a `effect-smol` / `effect` v4 con `--depth 1`).
- **Fuentes de Verdad:** - `MIGRATION.md` interno de la librería.
  - Patrones arquitectónicos actuales encontrados directamente en el código fuente del worktree.
- **Estado Actual:** El CLI y los servicios base están parcialmente migrados. Existe un bloqueante crítico de inyección de dependencias / manejo de errores en el `make` de `/packages/prisma/src/services/generator-service.ts`.

## 3. Estrategia de Ramas y Soporte Técnico

| Rama Objetivo         | Versión de Effect | Propósito                                                                                    |
| :-------------------- | :---------------- | :------------------------------------------------------------------------------------------- |
| `main`                | **v3 (Stable)**   | Producción. Sin cambios, mantiene soporte legacy hasta el release estable de v4.             |
| `dev`                 | **v4 (Beta)**     | Integración. Soporte exclusivo para la versión 4 beta; rama base para las features actuales. |
| `migration-prisma-v4` | **v4 (Beta)**     | Feature branch actual. Todo el trabajo de este PRD ocurre y se integra aquí contra `dev`.    |

## 4. Requerimientos de Ejecución (Objetivos)

### R1. Resolución Crítica: `generator-service.ts`

- **Diagnóstico:** Analizar el historial de git y las diferencias (diff) en la rama actual respecto al estado anterior con Effect v3 para entender el comportamiento original.
- **Implementación:** Resolver el error actual en el `make` del servicio. Esto implica verificar la provisión de dependencias (`Layer.provide`, `Effect.provide`) y la gestión de errores (`Effect.catchAll`, tipado de errores en el canal `E`) bajo las nuevas firmas de la v4.
- **este es el error** Type 'Effect<{ generate: Effect<undefined, unknown, unknown>; }, never, FileSystem | Path | RenderService | FormatterService>' is not assignable to type '((...args: never) => Effect<{ readonly generate: Effect<undefined, unknown, GeneratorContext>; }, never, FileSystem | Path | RenderService | FormatterService>) | Effect<...> | undefined'.
  Type 'Effect<{ generate: Effect<undefined, unknown, unknown>; }, never, FileSystem | Path | RenderService | FormatterService>' is not assignable to type 'Effect<{ readonly generate: Effect<undefined, unknown, GeneratorContext>; }, never, FileSystem | Path | RenderService | FormatterService>'.
  Type '{ generate: Effect.Effect<undefined, unknown, unknown>; }' is not assignable to type '{ readonly generate: Effect<undefined, unknown, GeneratorContext>; }'.
  Types of property 'generate' are incompatible.
  Type 'Effect<undefined, unknown, unknown>' is not assignable to type 'Effect<undefined, unknown, GeneratorContext>'.
  Type 'unknown' is not assignable to type 'GeneratorContext'.

### R2. Actualización de Templates de Generación

- **Refactorización de AST/Strings:** Modificar los templates de generación de código propios del paquete Prisma.
- **Output Esperado:** El código generado (clientes, repositorios o esquemas) debe ser 100% compatible con Effect v4, requiriendo validación contra la API actual expuesta en el worktree.

### R3. Validación y Pruebas

- **Stack de Pruebas:** El paquete contiene un entorno de pruebas y un caso de uso de ejemplo implementado con **SQLite**.
- **Criterio de Éxito:** La suite completa de pruebas debe ejecutarse y pasar exitosamente. Esto certifica que tanto la lógica interna del generador como el código resultante son válidos y estables.

## 5. Directivas de Comportamiento para el Agente (LLM)

> **Rol:** Actuar como un Senior Developer experto en programación funcional y en el ecosistema de Effect.
>
> 1. **Consulta Proactiva:** Ante cualquier duda sobre firmas de tipos (ej. constructores de `Layer`, manejo del `Context`), consulta proactivamente el worktree usando el skill configurado antes de adivinar.
> 2. **Cero Regresiones a v3:** El código propuesto no debe utilizar APIs deprecadas o legacy de la versión 3.
> 3. **Aislamiento de Entorno:** El directorio `.effect-reference` es estrictamente de solo lectura y no debe incluirse en ninguna propuesta de commit.
