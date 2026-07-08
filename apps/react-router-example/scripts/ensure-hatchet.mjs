import "dotenv/config"
import { execFileSync } from "node:child_process"
import net from "node:net"
import { setTimeout as sleep } from "node:timers/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const appRoot = resolve(__dirname, "..")
export const composeFile = resolve(appRoot, "docker-compose.yml")
export const localComposeProject = "hatchet-lite-react-router"
export const requiredPorts = {
  grpc: Number(process.env.HATCHET_GRPC_PORT ?? 7177),
  ui: Number(process.env.HATCHET_UI_PORT ?? 8899),
}

export const defaultApiBaseUrl = `http://127.0.0.1:${requiredPorts.ui}`

export const parseJsonLines = (output) => {
  const trimmed = output.trim()

  if (trimmed.length === 0) {
    return []
  }

  return trimmed.split("\n").map((line) => JSON.parse(line))
}

export const parseDockerLabels = (labels = "") => {
  if (!labels) {
    return {}
  }

  return Object.fromEntries(
    labels
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=")

        if (separatorIndex === -1) {
          return [entry, ""]
        }

        return [
          entry.slice(0, separatorIndex),
          entry.slice(separatorIndex + 1),
        ]
      }),
  )
}

export const getComposeProject = (container) =>
  parseDockerLabels(container.Labels)["com.docker.compose.project"]

export const getComposeService = (container) =>
  parseDockerLabels(container.Labels)["com.docker.compose.service"]

export const hasPublishedPort = (container, port) => {
  if (
    Array.isArray(container.Publishers) &&
    container.Publishers.some((publisher) => publisher.PublishedPort === port)
  ) {
    return true
  }

  return (container.Ports ?? "").includes(`:${port}->`)
}

export const isHatchetLiteContainer = (container) =>
  (container.Image ?? "").includes("ghcr.io/hatchet-dev/hatchet/hatchet-lite")

export const findReusableHatchetContainer = (containers) =>
  containers.find(
    (container) =>
      container.State === "running" &&
      isHatchetLiteContainer(container) &&
      hasPublishedPort(container, requiredPorts.grpc) &&
      hasPublishedPort(container, requiredPorts.ui),
  ) ?? null

export const findLocalComposeHatchetService = (services) =>
  services.find(
    (service) =>
      service.Service === "hatchet" &&
      service.Project === localComposeProject &&
      service.State === "running",
  ) ?? null

export const classifyHatchetRuntime = ({
  composeServices,
  dockerContainers,
  portsBusy,
  grpcReachable,
  uiReachable,
}) => {
  const localComposeHatchet = findLocalComposeHatchetService(composeServices)

  if (localComposeHatchet && grpcReachable && uiReachable) {
    return {
      status: "compose-running",
      message: `Hatchet compose service is running from ${composeFile}`,
      reusableContainer: findReusableHatchetContainer(dockerContainers),
    }
  }

  const reusableContainer = findReusableHatchetContainer(dockerContainers)

  if (reusableContainer && grpcReachable && uiReachable) {
    const project = getComposeProject(reusableContainer)
    const externalHint = project
      ? `docker compose project \`${project}\``
      : `container \`${reusableContainer.Names ?? reusableContainer.Name ?? reusableContainer.ID}\``

    return {
      status: "reusable-external",
      message: `Reusing Hatchet already running from ${externalHint}`,
      reusableContainer,
    }
  }

  if (portsBusy.grpc || portsBusy.ui) {
    const busyPorts = [
      portsBusy.grpc ? requiredPorts.grpc : null,
      portsBusy.ui ? requiredPorts.ui : null,
    ].filter((port) => port !== null)

    return {
      status: "port-conflict",
      message: `Required Hatchet ports are already allocated (${busyPorts.join(", ")}) by something that this script cannot safely reuse`,
      reusableContainer,
    }
  }

  return {
    status: "not-running",
    message: "Hatchet is not running locally yet",
    reusableContainer,
  }
}

export const canBindPort = (port) =>
  new Promise((resolvePort) => {
    const server = net.createServer()

    server.once("error", () => resolvePort(false))
    server.once("listening", () => {
      server.close(() => resolvePort(true))
    })

    server.listen(port, "127.0.0.1")
  })

export const canConnectToPort = (port, timeoutMs = 1000) =>
  new Promise((resolvePort) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port,
    })

    const finish = (result) => {
      if (!socket.destroyed) {
        socket.destroy()
      }

      resolvePort(result)
    }

    socket.setTimeout(timeoutMs)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
  })

export const isHatchetUiReachable = async (fetchImpl = fetch) => {
  try {
    const response = await fetchImpl(`http://127.0.0.1:${requiredPorts.ui}`, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(2000),
    })

    return response.status > 0
  } catch {
    return false
  }
}

export const decodeJwtPayload = (token) => {
  if (!token) {
    return null
  }

  const [, payload] = token.split(".")

  if (!payload) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }
}

export const resolveHatchetApiBaseUrl = (tokenPayload) => {
  const candidates = [
    process.env.HATCHET_API_URL,
    process.env.HATCHET_SERVER_URL,
    tokenPayload?.server_url,
    Array.isArray(tokenPayload?.aud) ? tokenPayload.aud[0] : tokenPayload?.aud,
    defaultApiBaseUrl,
  ]

  const apiBaseUrl = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.length > 0,
  )

  return typeof apiBaseUrl === "string" ? apiBaseUrl.replace(/\/$/, "") : defaultApiBaseUrl
}

export const buildTokenProbeUrl = (tokenPayload) => {
  const tenantId = tokenPayload?.sub

  if (typeof tenantId !== "string" || tenantId.length === 0) {
    return null
  }

  const baseUrl = resolveHatchetApiBaseUrl(tokenPayload)
  return `${baseUrl}/api/v1/stable/tenants/${tenantId}/workflow-runs?limit=1&only_tasks=false`
}

export const resolveHatchetToken = () =>
  process.env.HATCHET_CLIENT_TOKEN ?? process.env.HATCHET_TOKEN ?? ""

export const validateHatchetCredentials = async (fetchImpl = fetch) => {
  const token = resolveHatchetToken()

  if (!token) {
    return {
      ok: false,
      message: "Hatchet token is missing. Set HATCHET_CLIENT_TOKEN or HATCHET_TOKEN before using the demo routes that list runs, schedules, and management data.",
    }
  }

  const tokenPayload = decodeJwtPayload(token)

  if (!tokenPayload) {
    return {
      ok: false,
      message: "The configured Hatchet token is not a valid JWT, so the demo cannot derive the tenant/API target needed to verify access.",
    }
  }

  const probeUrl = buildTokenProbeUrl(tokenPayload)

  if (!probeUrl) {
    return {
      ok: false,
      message: "The configured Hatchet token does not contain a tenant subject, so the demo cannot verify Hatchet API access.",
    }
  }

  try {
    const response = await fetchImpl(probeUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(3000),
    })

    if (response.ok) {
      return {
        ok: true,
        message: `Validated Hatchet API credentials against ${probeUrl}`,
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        message: `The configured Hatchet token is not accepted by the running Hatchet stack (${response.status}). Stop the incompatible stack and start this app's compose project, or update HATCHET_CLIENT_TOKEN/HATCHET_TOKEN to match the stack bound to ports ${requiredPorts.grpc}/${requiredPorts.ui}.`,
      }
    }

    return {
      ok: false,
      message: `Hatchet API probe failed with HTTP ${response.status} at ${probeUrl}.`,
    }
  } catch (error) {
    return {
      ok: false,
      message: `Hatchet API probe failed before the demo could navigate: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export const runDocker = (args, { stdio = "pipe" } = {}) => {
  try {
    return execFileSync("docker", args, {
      cwd: appRoot,
      encoding: "utf8",
      stdio,
    })
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : ""
    const suffix = stderr ? `\n${stderr}` : ""
    throw new Error(`Failed to run docker ${args.join(" ")}${suffix}`)
  }
}

export const listDockerContainers = () =>
  parseJsonLines(runDocker(["ps", "--format", "json"]))

export const listComposeServices = () =>
  parseJsonLines(
    runDocker(["compose", "-f", composeFile, "ps", "--format", "json"]),
  )

export const collectRuntimeSnapshot = async () => {
  const [grpcPortFree, uiPortFree, grpcReachable, uiReachable] = await Promise.all([
    canBindPort(requiredPorts.grpc),
    canBindPort(requiredPorts.ui),
    canConnectToPort(requiredPorts.grpc),
    isHatchetUiReachable(),
  ])

  return {
    composeServices: listComposeServices(),
    dockerContainers: listDockerContainers(),
    portsBusy: {
      grpc: !grpcPortFree,
      ui: !uiPortFree,
    },
    grpcReachable,
    uiReachable,
  }
}

export const hasPendingHatchetRuntime = (snapshot) =>
  Boolean(
    findLocalComposeHatchetService(snapshot.composeServices) ||
      findReusableHatchetContainer(snapshot.dockerContainers),
  )

export const waitForHatchetReadiness = async ({
  attempts = 20,
  delayMs = 1500,
} = {}) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const snapshot = await collectRuntimeSnapshot()
    const runtime = classifyHatchetRuntime(snapshot)

    if (
      runtime.status === "compose-running" ||
      runtime.status === "reusable-external"
    ) {
      return runtime
    }

    if (runtime.status === "port-conflict") {
      if (hasPendingHatchetRuntime(snapshot)) {
        if (attempt < attempts) {
          await sleep(delayMs)
          continue
        }
      }

      throw new Error(runtime.message)
    }

    if (attempt < attempts) {
      await sleep(delayMs)
    }
  }

  throw new Error(
    `Hatchet did not become ready on ports ${requiredPorts.grpc}/${requiredPorts.ui} in time`,
  )
}

export const printRuntime = (runtime, mode = "status") => {
  const prefix =
    runtime.status === "compose-running" || runtime.status === "reusable-external"
      ? "✅"
      : runtime.status === "not-running"
        ? "ℹ️"
        : "❌"

  console.log(`${prefix} [hatchet:${mode}] ${runtime.message}`)

  if (runtime.reusableContainer) {
    const name =
      runtime.reusableContainer.Names ??
      runtime.reusableContainer.Name ??
      runtime.reusableContainer.ID
    const project = getComposeProject(runtime.reusableContainer)

    if (project) {
      console.log(`→ container: ${name} (compose project: ${project})`)
    } else {
      console.log(`→ container: ${name}`)
    }
  }
}

export const ensureHatchet = async (mode = "ensure") => {
  const runtime = classifyHatchetRuntime(await collectRuntimeSnapshot())

  const validateCredentials = async () => {
    const validation = await validateHatchetCredentials()

    if (validation.ok) {
      return validation
    }

    const runtimeContext = runtime.status === "reusable-external"
      ? `${runtime.message}.`
      : runtime.status === "compose-running"
        ? `The local Hatchet compose stack is reachable, but the configured credentials still do not match it.`
        : null

    return {
      ok: false,
      message: runtimeContext
        ? `${runtimeContext} ${validation.message}`
        : validation.message,
    }
  }

  if (mode === "status") {
    if (runtime.status === "compose-running" || runtime.status === "reusable-external") {
      const validation = await validateCredentials()

      if (!validation.ok) {
        console.log(`❌ [hatchet:${mode}] ${validation.message}`)
        return 1
      }
    }

    printRuntime(runtime, mode)
    return runtime.status === "compose-running" || runtime.status === "reusable-external" ? 0 : 1
  }

  if (runtime.status === "compose-running") {
    const validation = await validateCredentials()

    if (!validation.ok) {
      throw new Error(validation.message)
    }

    printRuntime(runtime, mode)
    return 0
  }

  if (runtime.status === "reusable-external") {
    const validation = await validateCredentials()

    if (!validation.ok) {
      throw new Error(validation.message)
    }

    if (mode === "up") {
      throw new Error(
        `${runtime.message}. Stop that stack first if you need this app's compose project specifically, or use hatchet:ensure/dev:hatchet to reuse it`,
      )
    }

    printRuntime(runtime, mode)
    return 0
  }

  if (runtime.status === "port-conflict") {
    throw new Error(runtime.message)
  }

  console.log(`▶️ [hatchet:${mode}] Starting local Hatchet compose stack...`)
  runDocker(["compose", "-f", composeFile, "up", "-d"], { stdio: "inherit" })

  const readyRuntime = await waitForHatchetReadiness()
  const validation = await validateHatchetCredentials()

  if (!validation.ok) {
    throw new Error(validation.message)
  }

  printRuntime(readyRuntime, mode)

  return 0
}

const runCli = async () => {
  const mode = process.argv[2] ?? "status"

  if (!["status", "ensure", "up"].includes(mode)) {
    throw new Error(
      `Unknown mode \`${mode}\`. Use one of: status, ensure, up`,
    )
  }

  process.exitCode = await ensureHatchet(mode)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(`❌ [hatchet] ${error.message}`)
    process.exitCode = 1
  })
}
