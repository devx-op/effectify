import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const RR7_VERSION = "7.18.2";
const RR8_VERSION = "8.3.0";
const rrFamily = [
	"react-router",
	"@react-router/dev",
	"@react-router/node",
	"@react-router/serve",
];
const legacyRemixFamily = [
	"@remix-run/node",
	"@remix-run/react",
	"@remix-run/serve",
	"@remix-run/dev",
];

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const collectSourceFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const target = path.join(directory, entry.name);
			return entry.isDirectory() ? collectSourceFiles(target) : [target];
		}),
	);
	return files.flat().filter((file) => /\.[cm]?[jt]sx?$/.test(file));
};

const catalogVersion = (workspaceYaml, packageName) => {
	const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return workspaceYaml.match(new RegExp(`^  ["']?${escaped}["']?:\\s*([^\\s#]+)`, "m"))?.[1];
};

const resolveRootVersion = (rootManifest, workspaceYaml, packageName) => {
	const declared = rootManifest.dependencies?.[packageName] ?? rootManifest.devDependencies?.[packageName];
	return declared === "catalog:" ? catalogVersion(workspaceYaml, packageName) : declared;
};

const verifyDependencyIsolation = async () => {
	const [
		bridgeManifest,
		legacyApp,
		rootManifest,
		protectedPackage,
		protectedApp,
		workspaceYaml,
	] = await Promise.all([
		readJson("packages/react/remix/package.json"),
		readJson("apps/react-remix-example/package.json"),
		readJson("package.json"),
		readJson("packages/react/router/package.json"),
		readJson("apps/react-router-example/package.json"),
		readFile("pnpm-workspace.yaml", "utf8"),
	]);
	const failures = [];

	for (const section of ["peerDependencies", "devDependencies"]) {
		if (bridgeManifest[section]?.["react-router"] !== RR7_VERSION) {
			failures.push(`@effectify/react-remix ${section}.react-router must equal ${RR7_VERSION}`);
		}
		for (const dependency of Object.keys(bridgeManifest[section] ?? {})) {
			if (dependency.startsWith("@remix-run/")) {
				failures.push(`@effectify/react-remix ${section} retains ${dependency}`);
			}
		}
	}

	for (const packageName of legacyRemixFamily) {
		for (const section of ["dependencies", "devDependencies"]) {
			if (legacyApp[section]?.[packageName] !== undefined) {
				failures.push(`@effectify/react-remix-example ${section} retains ${packageName}`);
			}
		}
	}

	for (const packageName of rrFamily) {
		if (catalogVersion(workspaceYaml, packageName) !== RR8_VERSION) {
			failures.push(`catalog ${packageName} must equal ${RR8_VERSION}`);
		}
		if (resolveRootVersion(rootManifest, workspaceYaml, packageName) !== RR8_VERSION) {
			failures.push(`root ${packageName} must resolve exactly to ${RR8_VERSION}`);
		}
	}

	if (protectedPackage.peerDependencies?.["react-router"] !== `^${RR8_VERSION}`) {
		failures.push(`@effectify/react-router peer react-router must remain ^${RR8_VERSION}`);
	}
	for (const packageName of rrFamily) {
		const declared = protectedApp.dependencies?.[packageName] ?? protectedApp.devDependencies?.[packageName];
		const resolved = declared === "catalog:" ? catalogVersion(workspaceYaml, packageName) : declared;
		if (resolved !== RR8_VERSION) {
			failures.push(`@effectify/react-router-example ${packageName} must resolve to ${RR8_VERSION}`);
		}
	}

	const bridgeFiles = (
		await Promise.all([
			collectSourceFiles("packages/react/remix/src"),
			collectSourceFiles("packages/react/remix/tests"),
		])
	).flat();
	for (const file of bridgeFiles) {
		const source = await readFile(file, "utf8");
		if (/from\s+["']@remix-run\//.test(source) || /import\s*\(["']@remix-run\//.test(source)) {
			failures.push(`${file} imports @remix-run/*`);
		}
	}

	if (failures.length > 0) {
		throw new Error(`React Router dependency isolation failed:\n- ${failures.join("\n- ")}`);
	}

	return {
		bridge: { packageName: "@effectify/react-remix", reactRouter: RR7_VERSION },
		protected: { packageName: "@effectify/react-router-example", reactRouter: RR8_VERSION },
	};
};

const registryUrl = (packageName) =>
	`https://registry.npmjs.org/${packageName.startsWith("@") ? packageName.replace("/", "%2f") : packageName}`;

const getManifest = async (packageName) => {
	const response = await fetch(registryUrl(packageName));
	if (!response.ok) {
		throw new Error(
			`Unable to fetch ${packageName}: ${response.status} ${response.statusText}`,
		);
	}
	return response.json();
};

const stage = process.argv
	.find((argument) => argument.startsWith("--stage="))
	?.slice("--stage=".length);

if (!["latest-v7", "final-v8", "dependency-isolation"].includes(stage)) {
	throw new Error(
		"Expected --stage=latest-v7, --stage=final-v8, or --stage=dependency-isolation",
	);
}

const isolation = await verifyDependencyIsolation();
if (stage === "dependency-isolation") {
	console.log(JSON.stringify({ stage, isolation }, null, 2));
	process.exit(0);
}

const expectedVersion = stage === "latest-v7" ? undefined : RR8_VERSION;
const manifests = await Promise.all(
	rrFamily.map(async (packageName) => {
		const manifest = await getManifest(packageName);
		const latestV7Version = Object.keys(manifest.versions)
			.filter((version) => version.startsWith("7."))
			.sort((left, right) =>
				right.localeCompare(left, undefined, { numeric: true }),
			)
			.at(0);
		const version = expectedVersion ?? latestV7Version;

		if (!version || !manifest.versions[version]) {
			throw new Error(
				`${packageName} has no published ${expectedVersion ?? "v7"} version`,
			);
		}

		const versionManifest = manifest.versions[version];
		return {
			packageName,
			version,
			engines: versionManifest.engines ?? {},
			peerDependencies: versionManifest.peerDependencies ?? {},
		};
	}),
);

const versions = new Set(manifests.map(({ version }) => version));
if (versions.size !== 1) {
	throw new Error(
		`React Router ${stage} family is not aligned: ${JSON.stringify(manifests)}`,
	);
}

console.log(JSON.stringify({ stage, isolation, manifests }, null, 2));
