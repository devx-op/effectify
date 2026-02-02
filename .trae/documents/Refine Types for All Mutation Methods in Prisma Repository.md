Voy a actualizar los demás métodos en `prisma-repository.eta` para que también usen tipos estrictos combinados con los argumentos de Prisma.

### Métodos a modificar:

1.  **`createMany`**:
    *   Tipo: `args: PrismaNamespace.Exact<A, ...> & { data: ReadonlyArray<Insertable<S>> | Insertable<S> }`
    *   Explicación: Permite insertar uno o varios registros usando `Insertable`.

2.  **`createManyAndReturn`**:
    *   Tipo: `args: PrismaNamespace.Exact<A, ...> & { data: ReadonlyArray<Insertable<S>> | Insertable<S> }`
    *   Explicación: Igual que `createMany` pero retorna los objetos creados.

3.  **`update`**:
    *   Tipo: `args: PrismaNamespace.Exact<A, ...> & { data: Updateable<S> }`
    *   Explicación: Usa `Updateable` para actualizaciones parciales seguras.

4.  **`updateMany`**:
    *   Tipo: `args: PrismaNamespace.Exact<A, ...> & { data: Updateable<S> }`
    *   Explicación: Usa `Updateable` para actualizaciones en lote.

5.  **`upsert`**:
    *   Tipo: `args: PrismaNamespace.Exact<A, ...> & { create: Insertable<S>, update: Updateable<S> }`
    *   Explicación: Combina `create` (para inserción si no existe) y `update` (si ya existe).

### Pasos:

1.  **Importar `Updateable`**: Añadir `Updateable` a la lista de importaciones desde `prisma-effect-kysely` en `packages/prisma/src/templates/prisma-repository.eta`.
2.  **Actualizar firmas**: Modificar las firmas de los métodos listados arriba en `packages/prisma/src/templates/prisma-repository.eta`.
3.  **Compilar**: Ejecutar `pnpm nx build prisma --skip-nx-cache` para aplicar los cambios al generador.
4.  **Regenerar**: Ejecutar `npx prisma generate` en `apps/react-app-router-fm`.
5.  **Verificar**: Comprobar que no hay regresiones y que los tipos se generan correctamente.