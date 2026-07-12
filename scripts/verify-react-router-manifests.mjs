const packages = [
	"react-router",
	"@react-router/dev",
	"@react-router/node",
	"@react-router/serve",
];

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

const expectedVersion =
	stage === "latest-v7"
		? undefined
		: stage === "final-v8"
			? "8.2.0"
			: undefined;

if (stage !== "latest-v7" && stage !== "final-v8") {
	throw new Error("Expected --stage=latest-v7 or --stage=final-v8");
}

const manifests = await Promise.all(
	packages.map(async (packageName) => {
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

console.log(JSON.stringify({ stage, manifests }, null, 2));
