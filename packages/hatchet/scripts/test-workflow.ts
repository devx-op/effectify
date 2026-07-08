/**
 * Example: Running a worker with @effectify/hatchet
 *
 * This demonstrates how to integrate @effectify/hatchet with Hatchet Lite.
 *
 * Usage:
 *   HATCHET_TOKEN="your-token" pnpm tsx packages/hatchet/scripts/test-workflow.ts
 */

import { Hatchet } from "@hatchet-dev/typescript-sdk"

const token = process.env.HATCHET_TOKEN
if (!token) {
  console.error("❌ Please set HATCHET_TOKEN")
  console.log("   Get it from: http://localhost:8888 → Settings → API Tokens")
  process.exit(1)
}

// For Hatchet Lite:
// - UI Dashboard: http://localhost:8888
// - gRPC API: localhost:7077 (use this!)
const hatchet = Hatchet.init({
  token,
  host_port: "localhost:7077", // gRPC port, NOT UI port
  tls_config: {
    tls_strategy: "none",
  },
})

console.log("✅ Hatchet client initialized")
console.log("   gRPC: localhost:7077")
console.log("   UI: http://localhost:8888\n")

// Define your Effect-based tasks
const myTask = hatchet.task({
  name: "my-effect-task",
  fn: async (input: { message: string }) => {
    // Your Effect logic would go here
    console.log("   📝 Processing:", input.message)
    return { result: "done", message: input.message }
  },
})

async function main() {
  const worker = await hatchet.worker("my-worker", {
    workflows: [myTask],
    slots: 10,
  })

  console.log("✅ Worker registered")
  await worker.start()
  console.log("✅ Worker started!\n")

  console.log("📋 To trigger:")
  console.log("   1. Go to http://localhost:8888")
  console.log("   2. Find 'my-effect-task' → Run")
  console.log('   3. Input: { "message": "Hello!" }')
  console.log("")

  await new Promise(() => {})
}

main().catch(console.error)
