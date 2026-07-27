---
name: effect-context-manager
description: >
  Gestiona los clones locales de referencia de Effect v4 y Alchemy alojados en ./.effect-reference.
  Trigger: Cuando se necesita consultar el código de Effect o Alchemy, actualizar el contexto, o configurar una nueva máquina.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Clonar las referencias locales de Effect v4 y Alchemy en una nueva máquina
- Actualizar Effect desde `Effect-TS/effect` rama `main`
- Actualizar Alchemy desde `alchemy-run/alchemy` rama `main`
- Consultar patrones actuales directamente en los clones de referencia
- Verificar que ambos clones depth-1 están sincronizados con sus upstreams

## Fuentes Canónicas

- `.effect-reference/effect` es un clon depth-1 de `https://github.com/Effect-TS/effect.git`, rama `main`, y es la referencia local de Effect v4.
- Effect v3 corresponde a la rama `v3` del mismo repositorio `Effect-TS/effect`; no debe utilizarse como objetivo de la referencia v4.
- `.effect-reference/alchemy` es un clon depth-1 de `https://github.com/alchemy-run/alchemy.git`, rama `main`, y es la referencia canónica de Alchemy next/alpha basada en Effect.
- `alchemy-run/alchemy-async` es la implementación async anterior, no la referencia canónica actual.

## Critical Patterns

### Protocolo 1: Setup en Nueva Máquina

Los directorios de referencia están ignorados por Git y son clones independientes. No son worktrees del repositorio principal ni ramas huérfanas.

Cuando uno de los directorios no exista o el usuario mencione una nueva máquina:

```bash
# 1. Crear el directorio contenedor ignorado
mkdir -p .effect-reference

# 2. Clonar únicamente las ramas canónicas con profundidad 1
git clone --depth 1 --branch main https://github.com/Effect-TS/effect.git .effect-reference/effect
git clone --depth 1 --branch main https://github.com/alchemy-run/alchemy.git .effect-reference/alchemy

# 3. Confirmar remoto, rama y profundidad de cada clon
git -C .effect-reference/effect remote get-url origin
git -C .effect-reference/effect branch --show-current
git -C .effect-reference/effect rev-parse --is-shallow-repository
git -C .effect-reference/alchemy remote get-url origin
git -C .effect-reference/alchemy branch --show-current
git -C .effect-reference/alchemy rev-parse --is-shallow-repository
```

Si uno de los clones ya existe, no volver a ejecutar `git clone` sobre ese directorio. Utilizar el protocolo de sincronización correspondiente.

### Protocolo 2: Actualización desde los Orígenes

Cuando el usuario pida actualizar el contexto, confirmar primero que cada clon esté limpio y apunte al remoto y rama esperados:

```bash
# Effect v4
git -C .effect-reference/effect status --short --branch
git -C .effect-reference/effect remote get-url origin
git -C .effect-reference/effect branch --show-current
git -C .effect-reference/effect pull --ff-only --depth 1 origin main

# Alchemy next/alpha
git -C .effect-reference/alchemy status --short --branch
git -C .effect-reference/alchemy remote get-url origin
git -C .effect-reference/alchemy branch --show-current
git -C .effect-reference/alchemy pull --ff-only --depth 1 origin main
```

No sobrescribir cambios locales en los clones. Si `status --short` muestra cambios o `pull --ff-only` no puede avanzar, detenerse y resolver el estado explícitamente.

## Restricciones Críticas de Seguridad

| Restricción            | Descripción                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Aislamiento Total**  | Nunca hacer `git merge` entre los clones de referencia y las ramas de desarrollo                                    |
| **Modo Solo-Lectura**  | No sugerir cambios de código dentro de `.effect-reference/effect` o `.effect-reference/alchemy`                     |
| **Clones Independientes** | No montar estas referencias como worktrees ni mantenerlas mediante ramas huérfanas del repositorio principal     |
| **Contenido Ignorado** | Los archivos de `.effect-reference` no deben incluirse en commits de las ramas de desarrollo                         |
| **Sincronización Segura** | Actualizar únicamente clones limpios mediante fast-forward desde la rama `main` de su origin esperado             |

## Verificación del Estado

```bash
# Verificar remoto, rama y clon shallow de Effect
git -C .effect-reference/effect remote get-url origin
git -C .effect-reference/effect branch --show-current
git -C .effect-reference/effect rev-parse --is-shallow-repository
git -C .effect-reference/effect rev-parse HEAD
git ls-remote https://github.com/Effect-TS/effect.git refs/heads/main

# Verificar remoto, rama y clon shallow de Alchemy
git -C .effect-reference/alchemy remote get-url origin
git -C .effect-reference/alchemy branch --show-current
git -C .effect-reference/alchemy rev-parse --is-shallow-repository
git -C .effect-reference/alchemy rev-parse HEAD
git ls-remote https://github.com/alchemy-run/alchemy.git refs/heads/main

# Ambos clones deben permanecer limpios
git -C .effect-reference/effect status --short --branch
git -C .effect-reference/alchemy status --short --branch
```

## Commands

```bash
# Setup inicial
git clone --depth 1 --branch main https://github.com/Effect-TS/effect.git .effect-reference/effect
git clone --depth 1 --branch main https://github.com/alchemy-run/alchemy.git .effect-reference/alchemy

# Sincronizar con latest
git -C .effect-reference/effect pull --ff-only --depth 1 origin main
git -C .effect-reference/alchemy pull --ff-only --depth 1 origin main

# Verificar estado
git -C .effect-reference/effect status --short --branch
git -C .effect-reference/alchemy status --short --branch
```

## Recursos

- **Referencia Effect v4**: [.effect-reference/effect/](../../../.effect-reference/effect/)
- **Guía de Migración de Effect**: [.effect-reference/effect/MIGRATION.md](../../../.effect-reference/effect/MIGRATION.md)
- **Referencia Alchemy next/alpha**: [.effect-reference/alchemy/](../../../.effect-reference/alchemy/)
