const { readFileSync, writeFileSync } = require("node:fs");
const { join, relative } = require("node:path");
const { execFileSync } = require("node:child_process");
const defaultVersionActions = require("@nx/js/src/release/version-actions");

function createRootChangelog(releasedPackages, date = new Date()) {
	const releasedOn = date.toISOString().slice(0, 10);
	const sortedPackages = [...releasedPackages].sort((left, right) =>
		left.name.localeCompare(right.name),
	);

	return [
		"# Changelog",
		"",
		"All notable changes to this project will be documented in this file.",
		"",
		"This changelog summarizes releases for the following packages:",
		"",
		...sortedPackages.map((packageJson) => `- ${packageJson.name}`),
		"",
		...sortedPackages.flatMap((packageJson) => [
			`## ${packageJson.name}`,
			"",
			`## ${packageJson.version} (${releasedOn})`,
			"",
		]),
	].join("\n");
}

function createReleaseEntries(releasedPackages, date) {
	const releasedOn = date.toISOString().slice(0, 10);
	const sortedPackages = [...releasedPackages].sort((left, right) =>
		left.name.localeCompare(right.name),
	);

	return sortedPackages
		.flatMap((packageJson) => [
			`## ${packageJson.name}`,
			"",
			`## ${packageJson.version} (${releasedOn})`,
			"",
		])
		.join("\n");
}

function hasRelease(content, packageJson) {
	return content.includes(
		`## ${packageJson.name}\n\n## ${packageJson.version} (`,
	);
}

function mergeRootChangelog(existingContent, releasedPackages, date) {
	if (existingContent === undefined) {
		return createRootChangelog(releasedPackages, date);
	}

	const newPackages = releasedPackages.filter(
		(packageJson) => !hasRelease(existingContent, packageJson),
	);
	if (newPackages.length === 0) return existingContent;

	const firstReleaseIndex = existingContent.search(/^## /m);
	if (firstReleaseIndex === -1) {
		return `${existingContent.trimEnd()}\n\n${createReleaseEntries(newPackages, date)}`;
	}

	const header = existingContent.slice(0, firstReleaseIndex).trimEnd();
	const history = existingContent.slice(firstReleaseIndex).trimStart();
	return `${header}\n\n${createReleaseEntries(newPackages, date).trimEnd()}\n\n${history}`;
}

function getRootChangelogUpdate(existingContent, nextContent, dryRun) {
	const changed = existingContent !== nextContent;

	return {
		changed,
		content: nextContent,
		shouldWrite: changed && !dryRun,
		shouldReportChangedFile: changed && !dryRun,
	};
}

function readRootChangelog(changelogPath, readFile = readFileSync) {
	try {
		return readFile(changelogPath, "utf8");
	} catch (error) {
		if (error.code === "ENOENT") {
			return undefined;
		}

		throw error;
	}
}

function createAfterAllProjectsVersioned({
	versionActions = defaultVersionActions,
	execFileSync: execute = execFileSync,
	readFileSync: readFile = readFileSync,
	writeFileSync: writeFile = writeFileSync,
	join: joinPath = join,
	relative: relativePath = relative,
	date = () => new Date(),
} = {}) {
	return async (cwd, options) => {
		const result = await versionActions.afterAllProjectsVersioned(cwd, options);
		const changedPackageFiles = execute(
			"git",
			["diff", "--name-only", "HEAD", "--", "packages/**/package.json"],
			{ cwd, encoding: "utf8" },
		)
			.trim()
			.split("\n")
			.filter(Boolean);

		if (changedPackageFiles.length === 0) return result;

		const releasedPackages = changedPackageFiles
			.map((packageFile) => {
				try {
					return JSON.parse(readFile(joinPath(cwd, packageFile), "utf8"));
				} catch (error) {
					throw new Error(
						`Unable to read released package manifest ${packageFile}`,
						{ cause: error },
					);
				}
			})
			.filter((packageJson) => packageJson.name && packageJson.version);

		if (releasedPackages.length === 0) return result;

		const changelogPath = joinPath(cwd, "CHANGELOG.md");
		const existingContent = readRootChangelog(changelogPath, readFile);
		const update = getRootChangelogUpdate(
			existingContent,
			mergeRootChangelog(existingContent, releasedPackages, date()),
			options.dryRun,
		);

		if (!update.shouldWrite) return result;

		writeFile(changelogPath, update.content);
		return {
			...result,
			changedFiles: update.shouldReportChangedFile
				? [...result.changedFiles, relativePath(cwd, changelogPath)]
				: result.changedFiles,
		};
	};
}

module.exports = defaultVersionActions.default;
module.exports.createAfterAllProjectsVersioned =
	createAfterAllProjectsVersioned;
module.exports.createRootChangelog = createRootChangelog;
module.exports.getRootChangelogUpdate = getRootChangelogUpdate;
module.exports.mergeRootChangelog = mergeRootChangelog;
module.exports.afterAllProjectsVersioned = createAfterAllProjectsVersioned();
