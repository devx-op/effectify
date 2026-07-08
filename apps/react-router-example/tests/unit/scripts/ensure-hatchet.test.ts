import { describe, expect, it } from "vitest"
import {
  buildTokenProbeUrl,
  classifyHatchetRuntime,
  decodeJwtPayload,
  findReusableHatchetContainer,
  getComposeProject,
  hasPendingHatchetRuntime,
  hasPublishedPort,
  parseJsonLines,
  requiredPorts,
  resolveHatchetToken,
} from "../../../scripts/ensure-hatchet.mjs"

describe("ensure-hatchet script", () => {
  it("parses docker json lines output", () => {
    const containers = parseJsonLines(
      `${JSON.stringify({ Name: "one" })}\n${JSON.stringify({ Name: "two" })}\n`,
    )

    expect(containers).toEqual([{ Name: "one" }, { Name: "two" }])
  })

  it("decodes the tenant payload from a Hatchet JWT and builds a probe URL", () => {
    const payload = {
      sub: "tenant-123",
      server_url: "http://localhost:8888",
    }
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`

    expect(decodeJwtPayload(token)).toEqual(payload)
    expect(buildTokenProbeUrl(payload)).toBe(
      "http://localhost:8888/api/v1/stable/tenants/tenant-123/workflow-runs?limit=1&only_tasks=false",
    )
  })

  it("prefers HATCHET_CLIENT_TOKEN over the legacy HATCHET_TOKEN name", () => {
    const previousClientToken = process.env.HATCHET_CLIENT_TOKEN
    const previousLegacyToken = process.env.HATCHET_TOKEN

    process.env.HATCHET_CLIENT_TOKEN = "client-token"
    process.env.HATCHET_TOKEN = "legacy-token"

    expect(resolveHatchetToken()).toBe("client-token")

    process.env.HATCHET_CLIENT_TOKEN = previousClientToken
    process.env.HATCHET_TOKEN = previousLegacyToken
  })

  it("detects reusable hatchet containers by published grpc and ui ports", () => {
    const reusable = findReusableHatchetContainer([
      {
        State: "running",
        Image: "postgres:15.6",
        Ports: "0.0.0.0:5440->5432/tcp",
        Names: "hatchet-db",
      },
      {
        State: "running",
        Image: "ghcr.io/hatchet-dev/hatchet/hatchet-lite:v0.74.9",
        Ports: `0.0.0.0:${requiredPorts.grpc}->7077/tcp, 0.0.0.0:${requiredPorts.ui}->8888/tcp`,
        Labels: "com.docker.compose.project=tmp,com.docker.compose.service=hatchet-lite",
        Names: "tmp-hatchet-lite-1",
      },
    ])

    expect(reusable?.Names).toBe("tmp-hatchet-lite-1")
    expect(getComposeProject(reusable)).toBe("tmp")
    expect(hasPublishedPort(reusable, requiredPorts.grpc)).toBe(true)
    expect(hasPublishedPort(reusable, requiredPorts.ui)).toBe(true)
  })

  it("prefers the local compose service when grpc and ui are reachable", () => {
    const runtime = classifyHatchetRuntime({
      composeServices: [
        {
          Project: "hatchet-lite-react-router",
          Service: "hatchet",
          State: "running",
        },
      ],
      dockerContainers: [],
      portsBusy: {
        grpc: true,
        ui: true,
      },
      grpcReachable: true,
      uiReachable: true,
    })

    expect(runtime.status).toBe("compose-running")
  })

  it("reuses an external hatchet instance during ensure flows", () => {
    const runtime = classifyHatchetRuntime({
      composeServices: [],
      dockerContainers: [
        {
          State: "running",
          Image: "ghcr.io/hatchet-dev/hatchet/hatchet-lite:v0.74.9",
          Ports: `0.0.0.0:${requiredPorts.grpc}->7077/tcp, 0.0.0.0:${requiredPorts.ui}->8888/tcp`,
          Labels: "com.docker.compose.project=tmp,com.docker.compose.service=hatchet-lite",
          Names: "tmp-hatchet-lite-1",
        },
      ],
      portsBusy: {
        grpc: true,
        ui: true,
      },
      grpcReachable: true,
      uiReachable: true,
    })

    expect(runtime.status).toBe("reusable-external")
    expect(runtime.message).toContain("docker compose project `tmp`")
  })

  it("fails with a port conflict when ports are busy but no reusable hatchet exists", () => {
    const runtime = classifyHatchetRuntime({
      composeServices: [],
      dockerContainers: [],
      portsBusy: {
        grpc: true,
        ui: false,
      },
      grpcReachable: false,
      uiReachable: false,
    })

    expect(runtime.status).toBe("port-conflict")
    expect(runtime.message).toContain(String(requiredPorts.grpc))
  })

  it("keeps waiting while a Hatchet container exists but is still warming up", () => {
    expect(
      hasPendingHatchetRuntime({
        composeServices: [
          {
            Project: "hatchet-lite-react-router",
            Service: "hatchet",
            State: "running",
          },
        ],
        dockerContainers: [],
      }),
    ).toBe(true)
  })
})
