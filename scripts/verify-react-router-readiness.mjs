import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const routerPackages = [
  "react-router",
  "@react-router/dev",
  "@react-router/node",
  "@react-router/serve",
];
const finalVersion = "8.3.0";

const readWorkspaceFile = (path) =>
  readFile(resolve(workspaceRoot, path), "utf8");
const packageJson = JSON.parse(await readWorkspaceFile("package.json"));
const project = JSON.parse(
  await readWorkspaceFile("apps/react-router-example/project.json")
);
const catalog = await readWorkspaceFile("pnpm-workspace.yaml");
const lockfile = await readWorkspaceFile("pnpm-lock.yaml");
const config = await readWorkspaceFile(
  "apps/react-router-example/react-router.config.ts"
);
const ciWorkflowPath =
  process.env.REACT_ROUTER_READINESS_CI_WORKFLOW ?? ".github/workflows/ci.yml";
const ciWorkflow = await readWorkspaceFile(ciWorkflowPath);

const getIndentedBlock = (source, heading, indentation) => {
  const lines = source.split("\n");
  const headingPattern = new RegExp(
    `^${" ".repeat(indentation)}${heading}:\\s*$`
  );
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start === -1) {
    throw new Error(`Missing ${heading} section in CI workflow`);
  }

  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && line.search(/\S/) <= indentation) {
      break;
    }
    block.push(line);
  }
  return block.join("\n");
};

const getRunBlock = (job) => {
  const lines = job.split("\n");
  const start = lines.findIndex((line) => /^\s{8}run:\s*\|\s*$/.test(line));
  if (start === -1) {
    return undefined;
  }

  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && line.search(/\S/) <= 8) {
      break;
    }
    block.push(line);
  }
  return block.join("\n");
};

const normalizeExpression = (expression) => expression.replace(/\s+/g, "");
const affectedBaseSelection = [
  'if [[ "${{ github.event_name }}" == "pull_request" ]]; then',
  'BASE="origin/${{ github.base_ref }}"',
  'BEFORE="${{ github.event.before }}"',
  'DEFAULT_BASE="origin/${{ github.event.repository.default_branch }}"',
].map(normalizeExpression);
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const pullRequest = getIndentedBlock(ciWorkflow, "pull_request", 2);
const triggerTypes = pullRequest
  .match(/^\s{4}types:\s*\[([^\]]+)]\s*$/m)?.[1]
  .split(",")
  .map((type) => type.trim())
  .filter(Boolean);
const requiredPullRequestTypes = [
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
];
assert(
  triggerTypes?.length === requiredPullRequestTypes.length &&
    requiredPullRequestTypes.every((type) => triggerTypes.includes(type)),
  "pull_request must trigger only for opened, synchronize, reopened, and ready_for_review"
);
assert(
  !/^\s{4}branches(?:-ignore)?\s*:/m.test(pullRequest),
  "pull_request must not filter base branches"
);

const jobs = getIndentedBlock(ciWorkflow, "jobs", 0);
const draftSkipExpression =
  "github.event_name != 'pull_request' || github.event.pull_request.draft == false";
for (const jobName of ["lint", "typecheck", "build", "test"]) {
  const job = getIndentedBlock(jobs, jobName, 2);
  const jobIf = job.match(/^\s{4}if:\s*(.+?)\s*$/m)?.[1];
  assert(
    jobIf &&
      normalizeExpression(jobIf) === normalizeExpression(draftSkipExpression),
    `${jobName} must skip draft pull requests`
  );
  const runBlock = getRunBlock(job);
  assert(
    runBlock && affectedBaseSelection.every((selection) => normalizeExpression(runBlock).includes(selection)),
    `${jobName} must derive pull-request and push affected bases from GitHub event data`
  );
}

const ciSummary = getIndentedBlock(jobs, "ci-summary", 2);
const summaryIf = ciSummary.match(/^\s{4}if:\s*(.+?)\s*$/m)?.[1];
const requiredSummaryNeeds = ["lint", "typecheck", "build", "test"];
const summaryNeeds = ciSummary
  .match(/^\s{4}needs:\s*\[([^\]]+)]\s*$/m)?.[1]
  .split(",")
  .map((jobName) => jobName.trim())
  .filter(Boolean);
assert(
  summaryIf?.includes("always()") &&
    normalizeExpression(summaryIf).includes(
      normalizeExpression(draftSkipExpression)
    ),
  "ci-summary must use always() and skip draft pull requests"
);
assert(
  summaryNeeds &&
    requiredSummaryNeeds.every((jobName) => summaryNeeds.includes(jobName)),
  "ci-summary needs must include lint, typecheck, build, and test"
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
    `['"]?${dependency.replace("/", "\\/")}['"]?: ${finalVersion.replace(
      ".",
      "\\."
    )}`
  );
  const lockfilePackage = new RegExp(
    `['"]?${dependency.replace("/", "\\/")}@${finalVersion.replace(
      ".",
      "\\."
    )}['"]?`
  );
  if (!catalogPackage.test(catalog) || !lockfilePackage.test(lockfile)) {
    throw new Error(`Final-v8 alignment is incomplete for ${dependency}`);
  }
}

if (/\bfuture\s*:/.test(config)) {
  throw new Error(
    "Final-v8 configuration must not retain obsolete future flags"
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
    "Final-v8 migration targets must not depend on build or start"
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
    2
  )
);
