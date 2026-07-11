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
		const update = getRootChangelogUpdate(
			readRootChangelog(changelogPath, readFile),
			createRootChangelog(releasedPackages, date()),
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
module.exports.createAfterAllProjectsVersioned = createAfterAllProjectsVersioned;
module.exports.createRootChangelog = createRootChangelog;
module.exports.getRootChangelogUpdate = getRootChangelogUpdate;
module.exports.afterAllProjectsVersioned = createAfterAllProjectsVersioned();
