import { EventEmitter } from "node:events"
import { describe, expect, it, vi } from "vitest"
import {
  browserTestBaseUrl,
  buildHealthcheckError,
  createBrowserTestServerPlan,
  createCleanupSignalController,
  createVitestBrowserCommand,
  isReachableStatus,
  stopChildProcess,
} from "./run-browser-suite.mjs"

describe("browser runner helpers", () => {
  it("reuses an existing base url when provided", () => {
    const plan = createBrowserTestServerPlan({
      baseUrl: "http://127.0.0.1:3200",
      appRoot: "/workspace/apps/react-router-example",
    })

    expect(plan).toEqual({
      mode: "reuse",
      baseUrl: "http://127.0.0.1:3200",
      healthcheckUrl: "http://127.0.0.1:3200",
    })
  })

  it("spawns the built server on the fixed loopback port by default", () => {
    const plan = createBrowserTestServerPlan({
      appRoot: "/workspace/apps/react-router-example",
    })

    expect(plan).toMatchObject({
      mode: "spawn",
      baseUrl: browserTestBaseUrl,
      healthcheckUrl: browserTestBaseUrl,
      command: "pnpm",
      args: ["exec", "react-router-serve", "build/server/index.js"],
      cwd: "/workspace/apps/react-router-example",
      envPatch: {
        HOST: "127.0.0.1",
        PORT: "3100",
      },
    })
  })

  it("treats success and redirects as healthy and reports timeouts clearly", () => {
    expect(isReachableStatus(200)).toBe(true)
    expect(isReachableStatus(302)).toBe(true)
    expect(isReachableStatus(503)).toBe(false)
    expect(buildHealthcheckError("http://127.0.0.1:3100", 15000)).toContain(
      "http://127.0.0.1:3100",
    )
  })

  it("runs the full browser suite through the shared Vitest config", () => {
    expect(createVitestBrowserCommand()).toEqual({
      command: "pnpm",
      args: ["exec", "vitest", "run", "-c", "vitest.browser.config.ts"],
    })
  })

  it("waits for spawned children to exit after sending SIGTERM", async () => {
    const child = new EventEmitter() as EventEmitter & {
      exitCode: number | null
      signalCode: NodeJS.Signals | null
      kill: ReturnType<typeof vi.fn>
    }

    child.exitCode = null
    child.signalCode = null
    child.kill = vi.fn(() => {
      child.signalCode = "SIGTERM"
      queueMicrotask(() => child.emit("exit", 0, "SIGTERM"))
      return true
    })

    await stopChildProcess(child)

    expect(child.kill).toHaveBeenCalledWith("SIGTERM")
    expect(child.kill).toHaveBeenCalledTimes(1)
  })

  it("rejects with the received signal after cleanup completes", async () => {
    const signalTarget = new EventEmitter()
    const cleanup = vi.fn().mockResolvedValue(undefined)
    const controller = createCleanupSignalController({
      cleanup,
      signalTarget,
      signals: ["SIGTERM"],
    })

    signalTarget.emit("SIGTERM")

    await expect(controller.signalPromise).rejects.toMatchObject({
      name: "SignalExitError",
      signal: "SIGTERM",
    })
    expect(cleanup).toHaveBeenCalledTimes(1)

    controller.dispose()
  })
})
