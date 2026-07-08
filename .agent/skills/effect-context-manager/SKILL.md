---
name: effect-context-manager
description: >
  Gestiona el entorno de referencia de Effect v4 alojado en el worktree ./effect-reference.
  Trigger: Cuando se necesita consultar código de effect-smol, actualizar el contexto, o configurar en nueva máquina.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Clonar el proyecto en una nueva máquina y montar el worktree de effect-reference
- Actualizar el contexto de Effect desde el origen remoto (effect-smol)
- Consultar patrones de Effect-TS en el código de referencia
- Verificar que el worktree está sincronizado correctamente

## Critical Patterns

### Protocolo 1: Setup en Nueva Máquina (Clone & Mount)

Cuando el directorio `./effect-reference` no existe o el usuario menciona "nueva máquina":

```bash
# 1. Obtener la rama huérfana del remoto
git fetch origin effect-context

# 2. Montar el worktree
git worktree add .effect-reference origin/effect-context

# 3. Confirmar lectura del archivo de migración
cat .effect-reference/MIGRATION.md
```

### Protocolo 2: Actualización desde el Origen (Sync)

Cuando el usuario pida "actualizar el contexto de Effect" o "traer lo último de effect-smol":

```bash
# 1. Entrar al directorio del worktree
cd .effect-reference

# 2. Descargar archivos más recientes (shallow)
git fetch https://github.com/Effect-TS/effect-smol.git main --depth 1

# 3. Sobrescribir archivos locales sin mezclar historiales
git checkout FETCH_HEAD -- .

# 4. Limpiar archivos eliminados en el origen
git add -A

# 5. Crear commit de sincronización
git commit -m "chore: sync latest effect-smol source"

# 6. Sincronizar con el repositorio del usuario
git push origin effect-context

# 7. Volver a la raíz
cd ..
```

## Restricciones Críticas de Seguridad

| Restricción             | Descripción                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Aislamiento Total**   | Nunca hacer `git merge` entre la rama actual y `effect-context`                                                 |
| **Modo Solo-Lectura**   | No sugerir cambios de código dentro de `./effect-reference`                                                     |
| **Limpieza de Commits** | Los archivos de `.effect-reference` NUNCA deben aparecer en `git status` de ramas de desarrollo (`dev`, `main`) |

## Verificación del Estado

```bash
# Verificar que es un worktree válido
cd .effect-reference && git status

# Ver ramas disponibles
git branch -a

# Verificar que está en rama effect-context
git rev-parse --abbrev-ref HEAD
```

## Commands

```bash
# Setup inicial
git fetch origin effect-context && git worktree add .effect-reference origin/effect-context

# Sincronizar con latest
cd .effect-reference && git fetch https://github.com/Effect-TS/effect-smol.git main --depth 1 && git checkout FETCH_HEAD -- . && git add -A && git commit -m "chore: sync latest effect-smol source" && git push origin effect-context && cd ..

# Verificar estado
cd .effect-reference && git status && git branch
```

## Recursos

- **Referencia Effect**: [effect-reference/](./effect-reference/)
- **Guía de Migración**: [effect-reference/MIGRATION.md](./effect-reference/MIGRATION.md)
