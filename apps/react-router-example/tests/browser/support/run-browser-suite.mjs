import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export const browserTestHost = "127.0.0.1";
export const browserTestPort = 3100;
export const browserTestBaseUrl = `http://${browserTestHost}:${browserTestPort}`;

export function createBrowserTestServerPlan({ baseUrl, appRoot }) {
  if (baseUrl) {
    return {
      mode: "reuse",
      baseUrl,
      healthcheckUrl: baseUrl,
    };
  }

  return {
    mode: "spawn",
    baseUrl: browserTestBaseUrl,
    healthcheckUrl: browserTestBaseUrl,
    command: "pnpm",
    args: ["exec", "react-router-serve", "build/server/index.js"],
    cwd: appRoot,
    envPatch: {
      HOST: browserTestHost,
      PORT: String(browserTestPort),
    },
  };
}

export function isReachableStatus(status) {
  return status >= 200 && status < 400;
}

export function buildHealthcheckError(url, timeoutMs) {
  return `Browser test server at ${url} did not become ready within ${timeoutMs}ms.`;
}

export function createVitestBrowserCommand() {
  return {
    command: "pnpm",
    args: ["exec", "vitest", "run", "-c", "vitest.browser.config.ts"],
  };
}

export class SignalExitError extends Error {
  constructor(signal) {
    super(`Received ${signal}.`);
    this.name = "SignalExitError";
    this.signal = signal;
  }
}

export async function stopChildProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise((resolveStop) => {
    const handleExit = () => {
      child.off?.("exit", handleExit);
      resolveStop(undefined);
    };

    child.once("exit", handleExit);

    if (child.exitCode !== null || child.signalCode !== null) {
      handleExit();
      return;
    }

    child.kill("SIGTERM");

    if (child.exitCode !== null || child.signalCode !== null) {
      handleExit();
    }
  });
}

export function createCleanupSignalController({
  cleanup,
  signalTarget = process,
  signals = ["SIGINT", "SIGTERM"],
}) {
  const listeners = [];
  let handledSignal = false;
  let rejectSignalPromise;

  const signalPromise = new Promise((_, reject) => {
    rejectSignalPromise = reject;
  });

  for (const signal of signals) {
    const handler = () => {
      if (handledSignal) {
        return;
      }

      handledSignal = true;
      void cleanup().finally(() => {
        rejectSignalPromise(new SignalExitError(signal));
      });
    };

    signalTarget.once(signal, handler);
    listeners.push({ signal, handler });
  }

  return {
    signalPromise,
    dispose() {
      for (const { signal, handler } of listeners) {
        signalTarget.off(signal, handler);
      }
    },
  };
}

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });

      if (isReachableStatus(response.status)) {
        return;
      }
    } catch {
      // keep polling until timeout
    }

    await delay(250);
  }

  throw new Error(buildHealthcheckError(url, timeoutMs));
}

async function ensureServerBuild(appRoot) {
  try {
    await access(resolve(appRoot, "build/server/index.js"));
  } catch {
    await new Promise((resolveBuild, reject) => {
      const buildProcess = spawn("pnpm", ["exec", "react-router", "build"], {
        cwd: appRoot,
        env: process.env,
        stdio: "inherit",
      });

      buildProcess.once("error", reject);
      buildProcess.once("exit", (code) => {
        if ((code ?? 1) === 0) {
          resolveBuild(undefined);
          return;
        }

        reject(
          new Error(`react-router build failed with exit code ${code ?? 1}.`),
        );
      });
    });
  }
}

async function run() {
  const appRoot = resolve(import.meta.dirname, "../..");
  await ensureServerBuild(appRoot);

  const plan = createBrowserTestServerPlan({
    baseUrl: process.env.BROWSER_TEST_BASE_URL,
    appRoot,
  });

  const child =
    plan.mode === "spawn"
      ? spawn(plan.command, plan.args, {
          cwd: plan.cwd,
          env: {
            ...process.env,
            ...plan.envPatch,
          },
          stdio: "inherit",
        })
      : null;
  let testProcess = null;
  let childExitedEarly = false;

  const cleanup = async () => {
    await Promise.all([stopChildProcess(testProcess), stopChildProcess(child)]);
  };
  const cleanupSignals = createCleanupSignalController({ cleanup });

  child?.once("exit", () => {
    childExitedEarly = true;
  });

  try {
    await Promise.race([
      waitForServer(plan.healthcheckUrl),
      cleanupSignals.signalPromise,
    ]);

    if (childExitedEarly) {
      throw new Error(
        `Browser test server exited before ${plan.healthcheckUrl} became ready.`,
      );
    }

    const vitestCommand = createVitestBrowserCommand();
    const vitestExitCode = await Promise.race([
      new Promise((resolveExitCode, reject) => {
        testProcess = spawn(vitestCommand.command, vitestCommand.args, {
          cwd: resolve(import.meta.dirname, "../.."),
          env: {
            ...process.env,
            BROWSER_TEST_BASE_URL: plan.baseUrl,
          },
          stdio: "inherit",
        });

        testProcess.once("error", reject);
        testProcess.once("exit", (code) => resolveExitCode(code ?? 1));
      }),
      cleanupSignals.signalPromise,
    ]);

    return Number(vitestExitCode);
  } finally {
    cleanupSignals.dispose();
    await cleanup();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      if (error instanceof SignalExitError) {
        process.kill(process.pid, error.signal);
        return;
      }

      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
