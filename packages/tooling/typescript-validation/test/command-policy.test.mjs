import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function readJson(name) {
  return JSON.parse(await readFile(path.join(packageRoot, name), "utf8"));
}

test("pins the isolated compiler aliases", async () => {
  const manifest = await readJson("package.json");

  assert.equal(manifest.private, true);
  assert.deepEqual(manifest.devDependencies, {
    "effect-tsgo-7": "npm:@effect/tsgo@0.18.1",
    "typescript-6": "npm:typescript@6.0.3",
    "typescript-7": "npm:typescript@7.0.2",
  });
});

test("declares seven additive targets with isolated cache contracts", async () => {
  const project = await readJson("project.json");
  const targets = project.targets;
  const realTargets = [
    "typecheck-ts6",
    "typecheck-ts7",
    "acceptance-ts6",
    "acceptance-ts7",
    "compiler-preflight",
    "compiler-validation-test",
  ];

  assert.deepEqual(Object.keys(targets).sort(), [...realTargets, "cache-isolation-test"].sort());
  for (const targetName of realTargets) {
    assert.equal(targets[targetName].cache, false, `${targetName} must disable Nx cache`);
    assert.deepEqual(targets[targetName].outputs, ["{workspaceRoot}/tmp/typescript-validation/**"]);
  }
  assert.notEqual(targets["cache-isolation-test"].cache, false);
  assert.equal(targets["cache-isolation-test"].metadata.executionClass, "cache-test");
});

test("rejects cache equivalents and direct Node calls as real evidence", async () => {
  const { classifyEvidence } = await import("../src/evidence.mjs");
  const rejected = [
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6",
    "NX_SKIP_NX_CACHE=true pnpm nx run @effectify/typescript-validation:acceptance-ts6",
    "NX_DISABLE_NX_CACHE=true pnpm nx run @effectify/typescript-validation:acceptance-ts6",
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6 --skipRemoteCache",
    "node packages/tooling/typescript-validation/src/cli.mjs acceptance --lane=ts6",
  ];

  for (const command of rejected) {
    assert.equal(
      classifyEvidence({ command, executionClass: "real", nxCache: "disabled" }).accepted,
      false,
      command,
    );
  }
  assert.equal(
    classifyEvidence({
      command: "pnpm nx run @effectify/typescript-validation:acceptance-ts6 --skip-nx-cache",
      executionClass: "real",
      nxCache: "disabled",
    }).accepted,
    true,
  );
  assert.equal(
    classifyEvidence({
      command: "pnpm nx run @effectify/typescript-validation:cache-isolation-test",
      executionClass: "cache-test",
      nxCache: "enabled",
    }).accepted,
    false,
  );
});

test("CLI rejects mixed project and git-range selectors and labels lanes", async () => {
  const { parseCli } = await import("../src/cli.mjs");

  assert.throws(
    () => parseCli(["typecheck", "--lane=ts6", "--projects=a", "--base=HEAD~1"]),
    { code: "INVALID_CLI" },
  );
  assert.deepEqual(parseCli(["typecheck", "--lane=ts7", "--projects=b,a"]), {
    command: "typecheck",
    lane: "ts7",
    projects: ["a", "b"],
  });
});

test("does not present an unimplemented lane as passing", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["src/cli.mjs", "typecheck", "--lane=ts6"], {
    cwd: packageRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 4);
  assert.match(result.stdout, /^\[ts6\] SKIPPED\(not implemented in WU-1\)$/m);
});

async function readCommand(command, args) {
  const { execFile } = await import("node:child_process");
  return await new Promise((resolve, reject) => {
    execFile(command, args, { cwd: path.resolve(packageRoot, "../../..") }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${stderr}\n${stdout}`));
      else resolve(stdout);
    });
  });
}

test("keeps TS7 peer contexts out of existing importers", async () => {
  const lockfile = await readFile(path.resolve(packageRoot, "../../..", "pnpm-lock.yaml"), "utf8");
  const importers = lockfile.slice(lockfile.indexOf("importers:"), lockfile.indexOf("packages:"));
  const existingImporters = importers.replace(/\n  packages\/tooling\/typescript-validation:[\s\S]*?(?=\n  \S|$)/, "");

  assert.doesNotMatch(existingImporters, /typescript@7\.0\.2/);
});

test("makes the cache-isolation target cacheable in Nx's resolved task graph", async () => {
  const graph = JSON.parse(
    await readCommand("pnpm", [
      "nx",
      "run",
      "@effectify/typescript-validation:cache-isolation-test",
      "--graph=stdout",
    ]),
  );

  assert.equal(
    graph.tasks.tasks["@effectify/typescript-validation:cache-isolation-test"].cache,
    true,
  );
});

test("rejects literal cache-token forgeries that are not Nx invocations", async () => {
  const { classifyEvidence } = await import("../src/evidence.mjs");

  for (const command of [
    "node packages/tooling/typescript-validation/src/cli.mjs acceptance --lane=ts6 --skip-nx-cache",
    "echo --skip-nx-cache",
    "a string containing --skip-nx-cache",
  ]) {
    assert.equal(
      classifyEvidence({ command, executionClass: "real", nxCache: "disabled" }).accepted,
      false,
      command,
    );
  }
});

test("rejects shell syntax that places the literal flag outside one Nx command segment", async () => {
  const { classifyEvidence } = await import("../src/evidence.mjs");
  const shellForgeries = [
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6 && echo --skip-nx-cache",
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6 || echo --skip-nx-cache",
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6; echo --skip-nx-cache",
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6 | echo --skip-nx-cache",
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6\necho --skip-nx-cache",
    "pnpm nx run @effectify/typescript-validation:acceptance-ts6 $(echo --skip-nx-cache)",
  ];

  for (const command of shellForgeries) {
    assert.equal(
      classifyEvidence({ command, executionClass: "real", nxCache: "disabled" }).accepted,
      false,
      command,
    );
  }
});

test("resolves TS5 for existing tooling and isolated TS6/TS7 aliases for validation", async () => {
  const { createRequire } = await import("node:module");
  const rootRequire = createRequire(path.resolve(packageRoot, "../../../package.json"));
  const toolingRequire = createRequire(path.join(packageRoot, "package.json"));
  const readManifest = async (file) => JSON.parse(await readFile(file, "utf8"));

  assert.equal(
    (await readManifest(rootRequire.resolve("typescript/package.json"))).version,
    "5.9.3",
  );
  assert.equal(
    (await readManifest(toolingRequire.resolve("typescript-6/package.json"))).version,
    "6.0.3",
  );
  assert.equal(
    (await readManifest(toolingRequire.resolve("typescript-7/package.json"))).version,
    "7.0.2",
  );
});
