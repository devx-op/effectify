La situación es la siguiente:
1.  **Intentamos forzar `rootDir`**: Lo pusimos en `tsconfig.lib.json` y en `project.json`.
2.  **El build sigue anidado (`dist/src`)**: Esto significa que, a pesar de forzarlo, TypeScript o el executor de Nx están incluyendo algo fuera de `src`, o ignorando la configuración. O bien, el executor de Nx *siempre* replica la estructura relativa al root del workspace cuando se usa de cierta manera.

Dado que hemos probado la vía "limpia" sin éxito y tenemos **paquetes rotos en npm** (versión 0.4.6), la prioridad máxima es que funcionen.

**Plan de Acción (Pragmático y Definitivo):**

1.  **Aceptar la realidad (`dist/src`)**:
    *   Si el build insiste en generar `dist/src/index.js`, **adaptaremos los `package.json` para que coincidan**.
    *   Revertiré los cambios en `package.json` de todas las librerías para que apunten a `./dist/src/index.js`.
    *   Esto garantiza que el código sea encontrable, aunque la estructura no sea la "ideal".

2.  **Limpieza de Configuración**:
    *   Revertiré los cambios en `project.json` y `tsconfig.lib.json` para dejarlos en un estado limpio y funcional (aunque generen `dist/src`).

3.  **Release de Fix (0.4.7)**:
    *   Haré un commit `fix: update package entry points to match build output structure`.
    *   Lanzaré la versión 0.4.7.
    *   Esta versión **funcionará** porque los `package.json` apuntarán a los archivos que realmente existen.

**Paso Inmediato**: Revertir la configuración de `node-better-auth` y ajustar su `package.json`.
