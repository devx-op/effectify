import { createRequire } from "node:module"
import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
)

const readWorkspaceFile = async (relativePath: string) => {
  return readFile(join(workspaceRoot, relativePath), "utf8")
}

describe("Hatchet SDK 1.21.0 upgrade contract", () => {
  it("uses the workspace catalog while pinning the SDK catalog entry to exact 1.21.0", async () => {
    const packageJson = JSON.parse(
      await readWorkspaceFile("packages/hatchet/package.json"),
    ) as {
      dependencies: Record<string, string>
    }
    const workspaceYaml = await readWorkspaceFile("pnpm-workspace.yaml")

    expect(packageJson.dependencies["@hatchet-dev/typescript-sdk"]).toBe(
      "catalog:",
    )
    expect(workspaceYaml).toContain("  '@hatchet-dev/typescript-sdk': 1.21.0")
  })

  it("documents 1.21.0 as the validated SDK target in the public spec", async () => {
    const spec = await readWorkspaceFile("docs/specs/hatchet-spec.md")

    expect(spec).toContain("Hatchet SDK v1.21.0")
    expect(spec).toContain(
      "@hatchet-dev/typescript-sdk MUST be a dependency with version 1.21.0",
    )
    expect(spec).not.toContain("^1.19.0")
  })

  it("resolves the installed SDK package to version 1.21.0", async () => {
    const sdkPackageJson = JSON.parse(
      await readFile(
        require.resolve("@hatchet-dev/typescript-sdk/package.json"),
        "utf8",
      ),
    ) as { version: string }

    expect(sdkPackageJson.version).toBe("1.21.0")
  })

  it("keeps relying on the public 1.21.0 SDK surface used by our wrappers", async () => {
    const sdkRoot = dirname(
      require.resolve("@hatchet-dev/typescript-sdk/package.json"),
    )
    const clientTypes = await readFile(
      join(sdkRoot, "v1/client/client.d.ts"),
      "utf8",
    )
    const runsTypes = await readFile(
      join(sdkRoot, "v1/client/features/runs.d.ts"),
      "utf8",
    )
    const workflowsTypes = await readFile(
      join(sdkRoot, "v1/client/features/workflows.d.ts"),
      "utf8",
    )
    const workersTypes = await readFile(
      join(sdkRoot, "v1/client/features/workers.d.ts"),
      "utf8",
    )
    const eventsTypes = await readFile(
      join(sdkRoot, "clients/event/event-client.d.ts"),
      "utf8",
    )
    const apiTypes = await readFile(
      join(sdkRoot, "clients/rest/generated/Api.d.ts"),
      "utf8",
    )

    expect(clientTypes).toContain("runNoWait<")
    expect(clientTypes).toContain("worker(name: string")
    expect(runsTypes).toContain("get_status")
    expect(runsTypes).toContain("getTaskExternalId")
    expect(runsTypes).toContain("cancel(opts: CancelRunOpts)")
    expect(runsTypes).toContain("since?: Date")
    expect(runsTypes).toContain("until?: Date")
    expect(runsTypes).toContain("statuses?: V1TaskStatus[]")
    expect(runsTypes).toContain("additionalMetadata?: Record<string, string>")
    expect(runsTypes).toContain("workerId?: string")
    expect(runsTypes).toContain("includePayloads?: boolean")
    expect(workflowsTypes).toContain("delete(workflow")
    expect(workflowsTypes).not.toContain("create(")
    expect(workersTypes).not.toContain("register(")
    expect(eventsTypes).toContain(
      "push<T>(type: string, input: T, options?: PushEventOptions)",
    )
    expect(eventsTypes).not.toContain("get(")
    expect(apiTypes).toContain("v1LogLineList: (task: string")
    expect(apiTypes).toContain("v1TenantLogLineList: (tenant: string")
    expect(apiTypes).toContain("v1TaskListStatusMetrics: (tenant: string")
    expect(apiTypes).toContain("tenantGetQueueMetrics: (tenant: string")
    expect(apiTypes).toContain("tenantGetStepRunQueueMetrics: (tenant: string")
    expect(clientTypes).toContain("get filters(): FiltersClient")
    expect(apiTypes).toContain("v1FilterList: (tenant: string")
    expect(apiTypes).toContain(
      "v1FilterCreate: (tenant: string, data: V1CreateFilterRequest",
    )
    expect(apiTypes).toContain(
      "v1FilterGet: (tenant: string, v1Filter: string",
    )
    expect(apiTypes).toContain(
      "v1FilterDelete: (tenant: string, v1Filter: string",
    )
    expect(apiTypes).not.toContain("v1TaskLogsList")
    expect(apiTypes).not.toContain("v1LogsList")
    expect(apiTypes).not.toContain("v1TaskMetricsGet")
  })

  it("derives run status typing from the runs client declarations instead of a missing root export", async () => {
    const rootTypes = await readFile(
      require.resolve("@hatchet-dev/typescript-sdk/index.d.ts"),
      "utf8",
    )
    const runsSource = await readWorkspaceFile(
      "packages/hatchet/src/clients/runs.ts",
    )

    expect(rootTypes).not.toContain("V1TaskStatus")
    expect(runsSource).not.toContain(
      'import type { V1TaskStatus } from "@hatchet-dev/typescript-sdk";',
    )
  })
})
