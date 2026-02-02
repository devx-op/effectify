Voy a consolidar la generación de código eliminando `prisma-effect-kysely` y migrando su lógica dentro de `@effectify/prisma`. Esto simplificará tu configuración y asegurará que todo se genere en un solo paso consistente.

### Pasos de Implementación

1.  **Migrar Runtime Helpers**:
    -   Mover `prisma-effect-kysely/src/kysely/helpers.ts` a `packages/prisma/src/runtime/index.ts`.
    -   Exportar estos helpers desde el `package.json` de `@effectify/prisma` para que el código generado pueda importarlos.

2.  **Migrar Lógica del Generador**:
    -   Copiar toda la lógica de generación (`src/effect`, `src/kysely`, `src/prisma`, `src/utils`) de `prisma-effect-kysely` a una nueva carpeta `packages/prisma/src/schema-generator`.
    -   Actualizar las referencias en el código migrado para que los `imports` generados apunten a `@effectify/prisma` en lugar de `prisma-effect-kysely`.

3.  **Integrar en `@effectify/prisma`**:
    -   Crear un punto de entrada `generateSchemas` en `packages/prisma/src/schema-generator/index.ts` que replique la orquestación de generación de schemas.
    -   Modificar `packages/prisma/src/services/generator-service.ts` para llamar a `generateSchemas` como parte del flujo de generación principal.

4.  **Actualizar Templates**:
    -   Modificar `prisma-repository.eta` y otros templates para importar `Insertable`, `Updateable`, etc., desde `@effectify/prisma`.

5.  **Limpieza y Configuración**:
    -   Eliminar la dependencia de `prisma-effect-kysely` del workspace.
    -   Actualizar `apps/react-app-router-fm/prisma/schema.prisma` para eliminar el generador `effect_schemas`.
    -   Compilar `@effectify/prisma` y regenerar el cliente.

### Resultado Esperado
Un solo generador en `schema.prisma` que produce tanto los repositorios como los schemas de Effect/Kysely en la carpeta configurada, con todas las correcciones de tipos que hemos aplicado.