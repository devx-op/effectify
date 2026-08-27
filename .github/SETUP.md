# CI and npm release setup

Effectify has three intentionally separate release channels. Alpha and beta are branch-driven prereleases; stable publication is always a manual decision.

## Release channel map

| Channel | Trigger                                  | npm tag            | Workflow                               |
| ------- | ---------------------------------------- | ------------------ | -------------------------------------- |
| Alpha   | Push to `dev`                            | `alpha`            | `.github/workflows/release-alpha.yml`  |
| Beta    | Push to `master`                         | `beta`             | `.github/workflows/cd.yml`             |
| Stable  | Manual workflow against current `master` | default (`latest`) | `.github/workflows/release-stable.yml` |

A `chore(release):` commit pushed by a release workflow does not start another beta publication. Stable has no push trigger and cannot be reached by a normal branch push.

## Required repository setup

Use Node.js 24.19.0 and pnpm 10.14.0 locally when reproducing workflow checks.

Configure these GitHub Actions secrets under **Settings > Secrets and variables > Actions**:

| Secret          | Purpose                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| `NPM_TOKEN`     | npm authentication and provenance publication                                             |
| `RELEASE_TOKEN` | Optional checkout token for stable release git operations; `GITHUB_TOKEN` is the fallback |

The release jobs request `contents: write` for Nx release commits, tags, and GitHub releases, and `id-token: write` for npm provenance.

## Nx release projects

All release workflows derive their allowlist from `nx.json`. The seven current Nx project names are:

1. `@effectify/react-router`
2. `@effectify/react-query`
3. `@effectify/node-better-auth`
4. `@effectify/solid-query`
5. `@effectify/react-router-better-auth`
6. `@effectify/prisma`
7. `@effectify/hatchet`

Use these project names—not filesystem paths—in manual workflow inputs.

## Exact workflow behavior

### CI: `.github/workflows/ci.yml`

**Triggers:** pull requests that are opened, synchronized, reopened, or marked ready for review, plus pushes to `dev`.

For non-draft pull requests, CI runs the static release-policy contract, affected lint and format checks, affected type checks, affected builds, and affected tests. The release-policy contract is dependency-free and runs with Node.js 24.19.0:

```bash
node --test scripts/release-policy-contract.test.mjs
```

### Alpha: `.github/workflows/release-alpha.yml`

**Triggers:** pushes to `dev` and optional manual dispatch.

A normal run calculates projects affected across the GitHub push event's exact `before`-to-`github.sha` range, then intersects those exact project names with the seven-project release allowlist. Invalid or zero `before` SHAs safely fall back to the current commit's parent. If the intersection is empty, publication is skipped. Otherwise the workflow builds, tests, versions with Nx `--preid=alpha`, rebuilds the versioned packages, and publishes with npm `--tag=alpha`.

Manual publish-only recovery requires an explicit comma-separated `projects` input. It publishes the selected existing manifests with `--tag=alpha` and skips version, changelog, and git mutation.

### Beta: `.github/workflows/cd.yml`

**Triggers:** pushes to `master` and optional manual dispatch.

A normal run uses the same exact push-range and exact-membership affected-project policy as alpha, versions with Nx `--preid=beta`, and publishes with npm `--tag=beta`. It never publishes to npm's default tag. Pushes whose head commit contains `chore(release):` or `[skip release]` are skipped, preventing release-commit recursion.

Manual publish-only recovery requires explicit existing project names and still publishes with `--tag=beta`; it skips version, changelog, and git mutation.

### Stable: `.github/workflows/release-stable.yml`

**Trigger:** manual dispatch only. The workflow has no push trigger.

The workflow always checks out `master`, fetches `origin/master`, and fails unless the checkout is the current remote commit. The `projects` input is required and is validated against all seven Nx release projects.

#### Normal stable graduation

1. Select one or more existing prerelease projects in the comma-separated `projects` input.
2. Leave `publish_only` disabled.
3. The workflow verifies the release-policy contract, exact checked-out HEAD equality with fetched `origin/master`, the selected-project allowlist, and npm authentication.
4. It builds and tests the selected projects, then runs React Router 8 tests, consolidation, readiness, and manifest verification.
5. Only after validation passes, Nx applies the relative `patch` specifier to the selected prereleases, producing their stable versions and release metadata.
6. Nx publishes only the selected projects without a prerelease dist-tag, so npm uses the stable default tag.

The workflow rejects a selected normal-mode project whose local manifest is already stable. This keeps graduation explicit and prevents an accidental extra patch release.

#### Publish-only stable recovery

Use this only when selected stable versions already exist in the checked-out manifests but need publication retried:

1. Enter the exact existing stable project names in `projects`.
2. Enable `publish_only`.
3. The workflow rejects missing versions, prerelease versions, unknown projects, and empty selections.
4. It builds, tests, and verifies before publishing the selected manifests.
5. It performs no version, changelog, tag, release commit, or git push mutation and supplies no prerelease npm dist-tag.

## Release safety checks

Before any Nx version or publish command, every release workflow runs:

```bash
node --test scripts/release-policy-contract.test.mjs
```

The contract rejects explicitly modeled structural regressions: a stable push trigger, missing beta or alpha prerelease flags, weakened project or current-`master` checks, known version/publish commands moving ahead of required validation, and channel documentation drifting from the workflows.

React Router publication readiness is verified with the maintained React Router 8 project and example targets:

```bash
pnpm nx test @effectify/react-router
pnpm nx run @effectify/react-router-example:migration:test
pnpm nx run @effectify/react-router-example:migration:verify
pnpm nx run @effectify/react-router-example:migration:manifest
pnpm nx run @effectify/react-router-example:consolidation:verify
```

## Recovery checklist

- Confirm the workflow run is using the intended channel.
- Copy exact project names from the seven-project list above.
- For alpha or beta recovery, confirm the existing versions carry the matching prerelease suffix.
- For stable recovery, confirm every selected manifest version has no prerelease suffix.
- Use publish-only mode only to retry existing versions; use normal stable mode to graduate prereleases.
- Review the workflow summary and npm package pages after completion.
