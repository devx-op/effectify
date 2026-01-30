---
name: "reuse-schema-fields"
description: "Reutiliza schemas generados en templates ETA. Invoke cuando el usuario quiere usar fields de schemas existentes en lugar de generarlos manualmente en templates."
---

# Reuse Schema Fields Skill

Este skill permite reutilizar los schemas ya generados en la carpeta `schemas/` dentro de los templates ETA, evitando la generación manual de campos.

## Cuándo usar
- Cuando el usuario quiere importar schemas completos en lugar de generar campos manualmente
- Cuando se necesita mantener consistencia entre schemas generados y templates
- Cuando se quiere evitar duplicación de lógica de definición de campos

## Estructura de schemas generados

Los schemas se generan en `/prisma/generated/effect/schemas/` con:
- `types.ts`: Contiene schemas completos de modelos (ej: `Todo`)
- `index.ts`: Exporta todos los schemas

## Ejemplo de uso en template

```eta
import * as Schemas from "../schemas/index.js"

// Usar el schema completo del modelo
export class <%= it.model.name %>Model extends Model.Class<<%= it.model.name %>Model>("<%= it.model.name %>")({
  ...Schemas.<%= it.model.name %>.fields
}) {}
```

Nota: Los schemas de Effect no tienen propiedad `.fields` directamente, pero se pueden extraer usando `Schema.getPropertySignatures` (en versiones compatibles).