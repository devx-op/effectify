# Program Roadmap: Effectify App Builder Platform

**No parent apply.** Children own sub-400 `ask-on-risk` SDD lifecycles.

## Review Workload Forecast

| Field       | Value          |
| ----------- | -------------- |
| Estimate    | 12–14k program |
| Budget risk | High           |
| Chained PRs | Yes            |
| Split       | Children       |
| Strategy    | ask-on-risk    |
| Chain       | pending        |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Child fields: scope | proof | rollback | trace; V = passing `verify-report.md`.
Engram mirror: sdd/effectify-app-builder-platform/tasks

## v0.1

- [ ] 1.1 `app-builder-protocol-contracts` [—]: protocol/callback/replay | schema | `packages/app-builder/contracts` | PE1–2.
- [ ] 1.2 `app-builder-run-execution-cli` [1.1]: approvals/locks/recovery | transitions | `packages/app-builder/execution`, `packages/app-builder/cli` | PE3–4.

## v0.2

- [ ] 2.1 `app-builder-nx-adoption-generation` [1.2]: inspect/precedence/runner/generators/boundaries | adoption | `packages/app-builder/nx-plugin` | WL1–3,5.
- [ ] 2.2 `app-builder-updates-migrations-provenance` [2.1]: ledgers/divergence/skips | migration-DAG | `.effectify`, `packages/app-builder/execution`, `packages/app-builder/nx-plugin` | WL4,6.

## v0.3

- [ ] 3.1 `app-builder-plugin-sdk-worker` [1.1]: ESM/Node broker/limits/secrets/telemetry | deny: `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`, `git -C`, relative/absolute repos | `packages/app-builder/plugin-sdk`, `packages/app-builder/plugin-worker` | PP1–2.
- [ ] 3.2 `app-builder-registry-governance` [3.1]: daily/one-hour/states/sign/install/revoke | signed-revocation | `packages/app-builder/registry`, `apps/registry-worker` | PP3–5; Platform Infrastructure signs first.
- [ ] 3.3 `app-builder-marketplace-docs` [3.2]: Starlight-evidence | state | `apps/docs/src/content/docs/marketplace` | PP3–5.

## v0.4

- [ ] 4.1 `app-builder-planner-compatibility` [3.2]: maturity/no-substitution | matrix | `packages/app-builder/planner` | BB1.
- [ ] 4.2 `app-builder-preview-protocol` [4.1]: declared/materialized/drift | availability | `packages/app-builder/preview-protocol` | BB2.
- [ ] 4.3 `app-builder-solid-builder` [4.1–4.2]: planner-only/intent-URL | no-ESM-edit-host | `packages/app-builder/solid-builder`, `apps/docs/src/content/docs/builder` | BB1,3.
- [ ] 4.4 `app-builder-blueprints` [4.1–4.3]: permanent-signed-revocable-approval | reproduction-rejection | `packages/app-builder/blueprints` | BB4.

## v0.5

- [ ] 5.1 `app-builder-plugin-react-router` [3.1,4.1]: SSR topology | V | `packages/plugin-react-router` | OG4.
- [ ] 5.2 `app-builder-plugin-effect-sql` [3.1]: pinned native PostgreSQL | V | `packages/plugin-effect-sql` | OG3.
- [ ] 5.3 `app-builder-plugin-better-auth` [3.1]: profile/boundary | V | `packages/plugin-better-auth` | OG1.
- [ ] 5.4 `app-builder-plugin-better-auth-ui` [5.3]: evidenced UI | V | `packages/plugin-better-auth-ui` | OG1,6.
- [ ] 5.5 `app-builder-plugin-alchemy` [3.1,5.1]: Cloudflare/native/RSC | V | `packages/plugin-alchemy` | OG4.
- [ ] 5.6 `app-builder-plugin-hatchet` [3.1]: optional workflow | V | `packages/plugin-hatchet` | OG1.
- [ ] 5.7 `app-builder-plugin-tanstack-solid` [3.1,4.1]: experimental-only | V | `packages/plugin-tanstack-solid` | OG6.

## v0.6–v0.8

- [ ] 6.1 `golden-react-router-order-shell` [2.1,5.1–5.6]: one-app DDD/Nx | V | `apps/golden-react-router-order` | OG1–2,4.
- [ ] 6.2 `golden-identity-access` [6.1,5.3–5.4]: verify/recover/session/principal | V | `apps/golden-react-router-order/libs/identity-access` | OG1.
- [ ] 6.3 `golden-organizations-membership` [6.2]: org/roles/admin | V | `apps/golden-react-router-order/libs/identity-access` | OG1–2.
- [ ] 6.4 `golden-orders-create` [6.3]: invariant/CreateOrder | V | `apps/golden-react-router-order/libs/orders` | OG2.
- [ ] 6.5 `golden-orders-list-status` [6.4]: ListOrders/ChangeOrderStatus | V | `apps/golden-react-router-order/libs/orders` | OG2.
- [ ] 6.6 `golden-orders-persistence-deployment` [5.2,5.5,6.5]: codecs/migrations/Layers/Alchemy | V | `apps/golden-react-router-order` | OG3–4.

## v0.9–v1.0

- [ ] 7.1 `app-builder-analytics-diagnostics-privacy` [1.2,2.1]: exclusions/traces/consent/redaction/delete/30d | V | `packages/app-builder/execution` | PE4.
- [ ] 7.2 `app-builder-certification-harness-matrix` [2.2,6.6]: compatibility/environment matrix | V | `.github/workflows` | OG5.
- [ ] 7.3 `app-builder-golden-certification` [7.2]: deterministic/E2E/build/migration/boundary | V | `apps/golden-react-router-order`, `.github/workflows` | OG5.
- [ ] 7.4 `app-builder-executable-docs-certification` [7.3]: executable docs | V | `apps/docs` | OG5.
- [ ] 7.5 `app-builder-v1-release-evidence` [1.1–7.4;3.3,4.4,5.7]: ≤10m acceptance/rollback | V | `.github/workflows`, `apps/docs` | OG5–6.

`@effectify/drizzle` v1.2; Prisma beyond v1. Parent completes after all v1 children archive passing compatibility/golden evidence—never apply.
