import { nxE2EPreset } from "@nx/cypress/plugins/cypress-preset"
import { defineConfig } from "cypress"

export default defineConfig({
  // Keep Cypress environment access explicit and future-proof.
  allowCypressEnv: false,
  screenshotOnRunFailure: false,
  video: false,
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: "src",
      bundler: "vite",
    }),
    baseUrl: "http://localhost:3100",
  },
})
