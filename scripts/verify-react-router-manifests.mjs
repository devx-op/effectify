import { readFile } from "node:fs/promises"

const RR8_VERSION = "8.3.0"
const rrFamily = ["react-router", "@react-router/dev", "@react-router/node", "@react-router/serve"]

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"))
const catalogVersion = (workspaceYaml, packageName) => {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return workspaceYaml.match(new RegExp(`^  ["']?${escaped}["']?:\\s*([^\\s#]+)`, "m"))?.[1]
}
const declaration = (manifest, packageName) =>
  manifest.dependencies?.[packageName] ?? manifest.devDependencies?.[packageName]
const resolvedVersion = (manifest, workspaceYaml, packageName) => {
  const declared = declaration(manifest, packageName)
  return declared === "catalog:" ? catalogVersion(workspaceYaml, packageName) : declared
}

const [rootManifest, protectedPackage, protectedApp, workspaceYaml] = await Promise.all([
  readJson("package.json"),
  readJson("packages/react/router/package.json"),
  readJson("apps/react-router-example/package.json"),
  readFile("pnpm-workspace.yaml", "utf8"),
])
const failures = []
const family = {}

for (const packageName of rrFamily) {
  const catalog = catalogVersion(workspaceYaml, packageName)
  const root = resolvedVersion(rootManifest, workspaceYaml, packageName)
  const app = resolvedVersion(protectedApp, workspaceYaml, packageName)
  family[packageName] = catalog
  if (catalog !== RR8_VERSION) failures.push(`catalog ${packageName} must equal ${RR8_VERSION}`)
  if (root !== RR8_VERSION) failures.push(`root ${packageName} must resolve exactly to ${RR8_VERSION}`)
  if (app !== RR8_VERSION) {
    failures.push(`@effectify/react-router-example ${packageName} must resolve exactly to ${RR8_VERSION}`)
  }
}

const packagePeer = protectedPackage.peerDependencies?.["react-router"]
if (packagePeer !== `^${RR8_VERSION}`) {
  failures.push(`@effectify/react-router peer react-router must remain ^${RR8_VERSION}`)
}
if (failures.length > 0) {
  throw new Error(`Protected React Router 8 manifest verification failed:\n- ${failures.join("\n- ")}`)
}

console.log(JSON.stringify({ stage: "protected-rr8", version: RR8_VERSION, packagePeer, family }, null, 2))
