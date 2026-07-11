const assert = require("node:assert/strict");
const test = require("node:test");

const {
	createAfterAllProjectsVersioned,
	createRootChangelog,
	getRootChangelogUpdate,
} = require("./release-version-actions.cjs");

const releasedPackages = [
	{ name: "@effectify/react-query", version: "2.0.0" },
	{ name: "@effectify/prisma", version: "1.0.0" },
];

test("creates the root release snapshot with UTC version dates and package names", () => {
	assert.equal(
		createRootChangelog(
			releasedPackages,
			new Date("2026-07-11T23:59:59-07:00"),
		),
		[
			"# Changelog",
			"",
			"All notable changes to this project will be documented in this file.",
			"",
			"This changelog summarizes releases for the following packages:",
			"",
			"- @effectify/prisma",
			"- @effectify/react-query",
			"",
			"## @effectify/prisma",
			"",
			"## 1.0.0 (2026-07-12)",
			"",
			"## @effectify/react-query",
			"",
			"## 2.0.0 (2026-07-12)",
			"",
		].join("\n"),
	);
});

test("writes and reports missing or different changelogs only outside dry runs", () => {
	const nextContent = createRootChangelog(
		releasedPackages,
		new Date("2026-07-12T00:00:00Z"),
	);

	assert.deepEqual(getRootChangelogUpdate(undefined, nextContent, false), {
		changed: true,
		content: nextContent,
		shouldWrite: true,
		shouldReportChangedFile: true,
	});
	assert.deepEqual(
		getRootChangelogUpdate("# older snapshot\n", nextContent, true),
		{
			changed: true,
			content: nextContent,
			shouldWrite: false,
			shouldReportChangedFile: false,
		},
	);
	assert.deepEqual(getRootChangelogUpdate(nextContent, nextContent, false), {
		changed: false,
		content: nextContent,
		shouldWrite: false,
		shouldReportChangedFile: false,
	});
});

function createHookFixture({ changedFiles = [], existingChangelog, result, failure } = {}) {
	const writes = [];
	const hook = createAfterAllProjectsVersioned({
		versionActions: {
			afterAllProjectsVersioned: async () => {
				if (failure) throw failure;
				return result ?? { changedFiles: ["packages/prisma/package.json"] };
			},
		},
		execFileSync: () => changedFiles.join("\n"),
		readFileSync: (path) => {
			if (path.endsWith("CHANGELOG.md")) return existingChangelog;
			if (path.endsWith("prisma/package.json")) {
				return JSON.stringify(releasedPackages[1]);
			}
			throw new Error(`Unexpected read: ${path}`);
		},
		writeFileSync: (path, content) => writes.push({ path, content }),
		join: (...parts) => parts.join("/"),
		relative: (_cwd, path) => path.replace("/repo/", ""),
		date: () => new Date("2026-07-11T00:00:00Z"),
	});
	return { hook, writes };
}

test("afterAllProjectsVersioned leaves empty manifests and default changed files unchanged", async () => {
	const { hook, writes } = createHookFixture({ changedFiles: [] });
	const result = await hook("/repo", { dryRun: false });
	assert.deepEqual(result, { changedFiles: ["packages/prisma/package.json"] });
	assert.deepEqual(writes, []);
});

test("afterAllProjectsVersioned adds the root changelog to default changed files", async () => {
	const { hook, writes } = createHookFixture({
		changedFiles: ["packages/prisma/package.json"],
		existingChangelog: "# old\n",
	});
	const result = await hook("/repo", { dryRun: false });
	assert.deepEqual(result.changedFiles, [
		"packages/prisma/package.json",
		"CHANGELOG.md",
	]);
	assert.equal(writes.length, 1);
});

test("afterAllProjectsVersioned does not write unchanged changelogs or dry runs", async () => {
	const snapshot = createRootChangelog(
		[releasedPackages[1]],
		new Date("2026-07-11T00:00:00Z"),
	);
	const unchanged = createHookFixture({
		changedFiles: ["packages/prisma/package.json"],
		existingChangelog: snapshot,
	});
	await unchanged.hook("/repo", { dryRun: false });
	assert.deepEqual(unchanged.writes, []);

	const dryRun = createHookFixture({
		changedFiles: ["packages/prisma/package.json"],
		existingChangelog: "# old\n",
	});
	await dryRun.hook("/repo", { dryRun: true });
	assert.deepEqual(dryRun.writes, []);
});

test("afterAllProjectsVersioned propagates delegated default hook failures", async () => {
	const failure = new Error("default hook failed");
	const { hook } = createHookFixture({ failure });
	await assert.rejects(() => hook("/repo", { dryRun: false }), failure);
});
