Basado en la auditoría de los paquetes publicados y su estructura de compilación, este es el plan para asegurar consistencia y corregir los paquetes rotos (`@effectify/prisma` y `@effectify/react-query`).

**Objetivo**: Asegurar que todos los paquetes públicos tengan una configuración de compilación y publicación consistente (`src` -> `dist/` plano).

**Plan Detallado:**

1.  **Corregir `@effectify/react-query`**:
    *   **Problema**: El `package.json` apunta a `dist/src/index.js` pero el compilador genera `dist/index.js` (debido a `rootDir: "src"`).
    *   **Acción**: Actualizar `main`, `module`, `types` y `exports` en `packages/react/query/package.json` para apuntar a `./dist/index.js`.

2.  **Corregir `@effectify/prisma` (Crítico)**:
    *   **Problema**: Está configurado para desarrollo local (apuntando a archivos `.ts` en `src/`), lo que fallará al ser instalado como dependencia.
    *   **Acción**:
        *   Actualizar `packages/prisma/package.json` para apuntar a los archivos compilados en `dist/`.
        *   Corregir la entrada `bin` para apuntar a `./dist/cli.js`.
        *   Asegurar que `files` incluya `dist`.

3.  **Verificar `@effectify/react-router-better-auth`**:
    *   Este paquete se publicó hace 4 días (v0.3.2) y no se actualizó en el último lote (v0.4.5).
    *   Verificaré si sus rutas ya son correctas (apuntando a `dist/index.js`). Si no, las corregiré para incluirlas en el próximo release.

4.  **Verificación de Build**:
    *   Ejecutaré `nx run-many -t build` para todos los paquetes afectados para confirmar que la estructura de salida en disco (`dist/`) coincide exactamente con lo que definimos en `package.json`.

5.  **Release de Corrección**:
    *   Una vez corregidos los archivos, haré un commit: `fix: standardize build output paths for all packages`.
    *   Ejecutaré el proceso de release para publicar nuevas versiones (patch) de los paquetes corregidos, asegurando que todos estén operativos en npm.

**Nota sobre `dist/src` vs `dist/`**: Confirmaré mediante el build que la salida es plana (`dist/index.js`). Si algún `tsconfig` genera `dist/src`, lo ajustaré para que sea plano y consistente con el resto.
