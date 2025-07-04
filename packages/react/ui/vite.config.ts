import * as path from 'node:path'
import { defineConfig } from 'vite'

import { copyFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { globbySync } from 'globby'
/// <reference types='vitest' />
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 4200,
  },
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/react/ui',
  plugins: [
    /* 
      Uncomment the following line to enable react-devtools.
      For more info see https://github.com/thetarnav/react-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
      staticImport: true,
      exclude: ['**/*.stories.tsx', '**/*.test.tsx', '**/tests/*', '**/examples/*', '**/setup-test.ts'],
      afterBuild: () => {
        globbySync(['dist/**/*.d.ts', 'dist/**.d.ts']).map((file) => {
          copyFileSync(file, file.replace(/\.d\.ts$/, '.d.cts'))
        })
      },
    }) as any,
    react(),
    tailwindcss(),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    target: 'esnext',
    minify: false,
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: globbySync(['src/index.ts', 'src/components/**/*', 'src/components/ui/*', 'src/utils/**/*']),
      formats: ['es'],
      // fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      // formats: ['es']
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: ['react', 'react-dom'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: (chunk) => {
          // const name = chunk.name.replace('lib/', '');
          const name = chunk.name
          return `${name}.js`
        },
      },
    },
  },
  define: {
    'import.meta.vitest': undefined,
    'process.env': process.env,
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
})
