declare module "./run-browser-suite.mjs" {
  export const browserTestBaseUrl: string
  export class SignalExitError extends Error {
    signal: NodeJS.Signals
  }
  export function buildHealthcheckError(url: string, timeoutMs: number): string
  export function createCleanupSignalController(input: {
    cleanup: () => Promise<void>
    signalTarget?: NodeJS.Process | import("node:events").EventEmitter
    signals?: NodeJS.Signals[]
  }): {
    dispose: () => void
    signalPromise: Promise<never>
  }
  export function createVitestBrowserCommand(): {
    args: string[]
    command: string
  }
  export function createBrowserTestServerPlan(input: {
    appRoot: string
    baseUrl?: string
  }):
    | {
      baseUrl: string
      healthcheckUrl: string
      mode: "reuse"
    }
    | {
      args: string[]
      baseUrl: string
      command: string
      cwd: string
      envPatch: {
        HOST: string
        PORT: string
      }
      healthcheckUrl: string
      mode: "spawn"
    }
  export function isReachableStatus(status: number): boolean
  export function stopChildProcess(
    child:
      | (import("node:child_process").ChildProcess & {
        signalCode: NodeJS.Signals | null
      })
      | {
        exitCode: number | null
        kill(signal: NodeJS.Signals): boolean
        off?(event: "exit", listener: () => void): void
        once(event: "exit", listener: () => void): void
        signalCode: NodeJS.Signals | null
      }
      | null
      | undefined,
  ): Promise<void>
}
