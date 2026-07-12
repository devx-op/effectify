import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const routerPackages = [
	"react-router",
	"@react-router/dev",
	"@react-router/node",
	"@react-router/serve",
];
const finalVersion = "8.2.0";

const readWorkspaceFile = (path) =>
	readFile(resolve(workspaceRoot, path), "utf8");
const packageJson = JSON.parse(await readWorkspaceFile("package.json"));
const project = JSON.parse(
	await readWorkspaceFile("apps/react-router-example/project.json"),
);
const catalog = await readWorkspaceFile("pnpm-workspace.yaml");
const lockfile = await readWorkspaceFile("pnpm-lock.yaml");
const config = await readWorkspaceFile(
	"apps/react-router-example/react-router.config.ts",
);

if (packageJson.engines?.node !== ">=22.22") {
	throw new Error("Workspace must declare Node >=22.22");
}

for (const dependency of ["react", "react-dom"]) {
	if (!catalog.includes(`  ${dependency}: 19.2.7`)) {
		throw new Error(`Catalog must pin ${dependency} to 19.2.7`);
	}
}

for (const dependency of routerPackages) {
	const catalogPackage = new RegExp(
		`['"]?${dependency.replace("/", "\\/")}['"]?: ${finalVersion.replace(".", "\\.")}`,
	);
	const lockfilePackage = new RegExp(
		`['"]?${dependency.replace("/", "\\/")}@${finalVersion.replace(".", "\\.")}['"]?`,
	);
	if (!catalogPackage.test(catalog) || !lockfilePackage.test(lockfile)) {
		throw new Error(`Final-v8 alignment is incomplete for ${dependency}`);
	}
}

if (/\bfuture\s*:/.test(config)) {
	throw new Error(
		"Final-v8 configuration must not retain obsolete future flags",
	);
}

const verificationTarget = project.targets?.["migration:verify"];
const manifestTarget = project.targets?.["migration:manifest"];
if (!verificationTarget || !manifestTarget) {
	throw new Error("Missing final-v8 migration verification target");
}

const serializedTargets = JSON.stringify({
	verificationTarget,
	manifestTarget,
});
if (/\b(build|start)\b/.test(serializedTargets)) {
	throw new Error(
		"Final-v8 migration targets must not depend on build or start",
	);
}
if (!serializedTargets.includes("--stage=final-v8")) {
	throw new Error("migration:manifest must verify final-v8 registry metadata");
}

console.log(
	JSON.stringify(
		{
			node: process.version,
			routerVersion: finalVersion,
			reactVersion: "19.2.7",
			futureFlags: "absent",
			verificationTarget: "@effectify/react-router-example:migration:verify",
			manifestTarget: "@effectify/react-router-example:migration:manifest",
		},
		null,
		2,
	),
);
