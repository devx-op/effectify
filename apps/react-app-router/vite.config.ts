import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    target: "esnext",
  },
  server: {
    port: 5174,
  },
  preview: {
    port: 4174,
  },
})
