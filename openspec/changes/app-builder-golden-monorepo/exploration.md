## Exploration: App Builder Golden Monorepo

> Exploration only. This artifact does not authorize proposal, specification, design, tasks, implementation, tracker edits, branch changes, or product-source changes.

### Current State

The repository has a strong execution foundation but no product generator or public App Builder CLI.

- `@effectify/app-builder-contracts` already owns canonical JSON, identities, diagnostics/outcomes, passive plans, tool declarations, wizard drafts, compatibility, and replay certification. These are reusable protocol primitives, not a generation model.
- `@effectify/app-builder-execution` implements the archived lifecycle, durable store/recovery, scoped workspace ownership, lock/executor, mutation, process, cleanup, and POSIX durability capabilities. Its verified executable target proves real r1-r5 execution and deterministic output on Darwin/glibc x64/arm64, but `demo/**` is fixed proof composition rather than the product operation.
- The old tracker correctly separated lifecycle, store/recovery, lock/executor, and CLI. The first three are implemented and reusable. Its pending `app-builder-execution-cli` child is based on an obsolete assumption: a thin CLI has no application operation that can turn validated intent into a generated workspace and resolved callback.
- No `packages/app-builder/cli`, Nx local plugin, generator project, `GenerationBlock`, `FilePlan`, plugin catalog, generated Todo monorepo, canonical showcase, or nested-workspace E2E exists.
- Nx 23.1.0 currently discovers only the contracts and execution App Builder projects. The root uses pnpm 10.14.0, inferred Nx targets, independent releases, and already defines an Nx local-registry target backed by Verdaccio configuration, although no plugin E2E package currently uses it.
- Current Nx documentation recommends a local plugin for workspace generators. Generator functions receive a `Tree`, may invoke other generators against that tree, call `formatFiles`, and may return a post-write callback. Nx plugin E2E guidance uses a local registry, publishes a development package version, creates a fresh workspace, runs user-facing commands, and then removes the registry state.

The ratified direction closes the old create-operation gap: Golden v1 itself is the application operation. A schema-validated Todo creation intent selects finite capabilities; a deterministic planner composes reusable generation blocks into a file/dependency plan; an Nx Devkit adapter applies that plan; verification executes the generated workspace and Todo CLI.

#### Reusable foundation versus assumptions to retire

| Keep and consume                                                                                                | Retire or defer                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Contract identities, canonical JSON/digests, diagnostics/outcomes, declarations, compatibility, replay material | `PassivePlan` as sufficient executable generation authority                                             |
| Lifecycle transition laws and approval evidence                                                                 | A parsing-only CLI presented as a complete product                                                      |
| Durable draft/run persistence, recovery classification, scoped ownership, executor, cleanup                     | The old pending CLI child and its six-file transport-only boundary                                      |
| Verified POSIX durability adapter and one-command executable proof                                              | Generic callback registries before a real finite capability catalog exists                              |
| Effect-first services, Layers, schemas, typed errors, deterministic test seams                                  | MCP, arbitrary plugin code execution, Effect AI, web UI, marketplace, and early infrastructure deletion |
| Existing feature-branch-chain ancestry and archived child evidence                                              | Monolithic templates and Effect-free “pure TypeScript” domain layers                                    |

### Affected Areas

- `packages/app-builder/contracts/` — reusable wire identities, declarations, diagnostics, canonicalization, and replay inputs; should not absorb generator implementation details.
- `packages/app-builder/execution/` — reusable run/durability authority and current executable proof; Golden orchestration should consume it without weakening lock, journal, or callback guarantees.
- `packages/app-builder/generator/` (candidate) — local Nx plugin, finite creation intent, catalog, block planner, Nx Devkit adapter, Todo preset, and generator tests.
- `packages/app-builder/cli/` (candidate) — single public agent-tool CLI, stable schemas, stdin/file decoding, output/events, exit mapping, and live composition.
- `packages/app-builder/e2e/` (candidate) — isolated nested-workspace creation, local package installation, nested Nx execution, regeneration, and zero-diff proof.
- `examples/app-builder-todo/` (candidate) — committed canonical generated showcase with provenance and a documented regeneration command; excluded from the root package/workspace graph.
- `nx.json`, `pnpm-workspace.yaml`, `.gitignore`, and package manifests (future work only) — plugin registration, root-graph exclusion, package distribution, and test-target wiring.
- `openspec/changes/app-builder-run-execution-cli/` and draft PR #104 — later tracker respecification; completed children remain historical/reusable, while the pending CLI child is superseded.

#### Candidate Golden v1 generated topology

```text
todo-workspace/
├── apps/
│   └── todo-cli/                 # Effect CLI transport and Node runtime composition
├── packages/
│   ├── todo-domain/              # Schema, Brand, Data unions, Match, Option/Either, rules
│   ├── todo-application/         # Effect workflows, use cases, typed errors, services/Layers
│   ├── todo-ports/               # Context services for repository, clock, IDs, events
│   ├── todo-adapter-file/        # durable file repository Live Layer
│   └── todo-runtime/             # production Layer graph and CLI composition
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── pnpm-lock.yaml
```

Responsibility flows inward: `todo-cli` and adapters depend on application/ports/domain; application depends on ports/domain; ports use domain types; domain depends on Effect, never on adapters. Domain/application may expose services and Layers where ownership belongs there. Tests replace ports through deterministic Test Layers rather than bypassing Effect.

#### Composable generation model

`GenerationBlock` should be a finite, declarative contribution selected from the official/community catalog, not an arbitrary callback that can write anywhere.

```text
CreationIntent (Schema)
  -> CapabilityCatalog.resolve
  -> dependency closure + compatibility validation
  -> ordered GenerationBlock contributions
  -> FilePlan (canonical, conflict-checked, digestible)
  -> NxDevkitAdapter.apply(Tree)
  -> VerificationPlan
```

Candidate concepts:

- `GenerationBlock`: stable ID/version, provided and required capabilities, ordering constraints, file contributions, dependency contributions, Nx project contributions, verification contributions, and provenance.
- `FileContribution`: normalized workspace-relative path, creation/update policy, canonical UTF-8 bytes or a typed deterministic renderer reference, executable bit if needed, and owner block.
- `DependencyContribution`: package name, exact catalog-backed version/range policy, section, and reason; merge requires semantic equality or an explicit catalog conflict rule.
- `FilePlan`: sorted immutable files, merged manifests/project metadata, verification commands, block provenance, and canonical digest. Duplicate equal contributions collapse; conflicting writes fail before touching the `Tree`.
- `NxDevkitAdapter`: the only layer that translates the plan to `Tree`, invokes approved Nx generators where beneficial, updates manifests/project configuration, formats once, and returns post-write installation/verification effects. Planning remains independently testable without an Nx filesystem.

The catalog controls which blocks and renderer implementations may run. Official/community plugins contribute signed/versioned metadata plus installed package code under the host's package trust model; user intent cannot name an arbitrary module, shell command, template path, or JavaScript callback.

#### CLI as agent tools

The CLI is the single public interface. Commands should share one versioned request envelope, one versioned result envelope, stable error codes, explicit exit classes, and optional event streaming.

| Command    | Conceptual contract                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `catalog`  | List finite presets, plugins, capabilities, versions, compatibility, and schemas.                             |
| `plan`     | Decode `CreationIntent`, resolve catalog/dependencies/blocks, and emit canonical `FilePlan` without mutation. |
| `generate` | Apply an approved plan through execution authority and emit resulting digests/provenance.                     |
| `verify`   | Run declared generated-workspace checks and return structured evidence.                                       |
| `replay`   | Reapply recorded intent/catalog/plan identities and compare deterministic output.                             |
| `explain`  | Explain selected blocks, dependencies, conflicts, files, and policy decisions.                                |
| `doctor`   | Diagnose host, package manager, Nx, catalog, and platform readiness without mutation.                         |

Requests arrive through explicit flags for small scalars or `--input <file>` / stdin for complete schema payloads. Machine stdout contains only JSON or JSON Lines. Human diagnostics use stderr. A final result envelope is mandatory even when event streaming is enabled. Callbacks/events are finite protocol records such as `PlanStarted`, `BlockResolved`, `FilePlanned`, `WriteStarted`, `VerificationStarted`, and `Completed`; they are observations or input-required continuations, never arbitrary executable callbacks supplied by the caller.

Effect AI remains outside Golden v1. A later adapter may translate natural language into `CreationIntent` using only the same finite catalog and schema, then submit it to `plan`. It must not write files, invoke Nx, execute commands, or register tools directly.

#### Nested Nx E2E comparison

| Approach                                               | Strengths                                                                                                                                            | Weaknesses                                                                                                                                   | Recommendation                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| OS-temp nested workspace + local Verdaccio publication | Exercises the consumer-visible package boundary and Nx's documented plugin-E2E flow; no root graph pollution; validates manifests and installability | Registry lifecycle/versioning adds setup cost; lockfile bytes can vary unless versions, registry URL, pnpm store, and environment are pinned | Primary full E2E                              |
| OS-temp nested workspace + `pnpm pack` tarballs        | Fully offline-capable and simple artifact identity; tarball digest can be recorded                                                                   | Transitive local packages and peer resolution require explicit packing/order; less aligned with Nx's provided local-registry executor        | Focused distribution fallback or CI hardening |
| In-memory `Tree` generator tests                       | Fast, deterministic, excellent for block merge/conflict and exact file snapshots                                                                     | Does not prove package installation, nested Nx graph, build, or executable CLI                                                               | Mandatory lower layer, never the only E2E     |
| Generate under repository `tmp/`                       | Easy inspection and already Git-ignored                                                                                                              | Still shares filesystem ancestry, Nx state, pnpm store, and accidental root discovery risk; cleanup failures leave state                     | Reject for authoritative E2E                  |

Recommended E2E protocol:

1. Build/publish exact local package versions to an ephemeral Verdaccio instance, or pack exact tarballs for an offline variant.
2. Create the generated workspace under `fs.mkdtemp` in the OS temp root, outside the repository and root pnpm workspace globs.
3. Set `NX_DAEMON=false`, `NX_CACHE_PROJECT_GRAPH=false`, and workspace-local Nx cache/workspace-data paths; use an isolated pnpm store and explicit registry configuration.
4. Install with pinned package-manager/Nx/Effect/plugin versions. Create the lockfile once, then use frozen installs for execution. Do not compare absolute path/store metadata; compare the committed canonical lockfile policy or a normalized semantic lock projection if registry URLs are expected to differ.
5. Run the nested graph, typecheck, tests, build, and Todo CLI through the nested workspace's pnpm/Nx binaries.
6. Capture the first generated tree, rerun generation with the same intent/catalog, and prove zero Git/tree diff plus identical plan/output digests.
7. Separately maintain `examples/app-builder-todo/` as a committed canonical showcase generated by the same command. Exclude it explicitly from root pnpm/Nx discovery; CI verifies regeneration against it rather than treating it as a root project.

### Approaches

1. **Product-first generator vertical slices** — establish plan/block contracts, then generate and execute progressively richer portions of the Todo monorepo.
   - Pros: Every slice produces inspectable product evidence; architecture follows the ratified goal; execution foundations are reused instead of rewritten; feature-branch-chain boundaries remain reviewable.
   - Cons: Requires normative choices for topology, plugin trust, lockfile policy, and CLI protocol before implementation.
   - Effort: High overall, Medium per chained slice.

2. **Complete infrastructure framework before Golden output** — build a generalized plugin SDK, catalog, CLI, replay engine, and all adapters before generating Todo.
   - Pros: Broad framework appears internally complete.
   - Cons: Repeats the previous product gap, delays visible evidence, encourages speculative abstractions, and risks exceeding the 3,000-line review budget per slice.
   - Effort: Very High; reject.

3. **Monolithic Todo template behind an Nx generator** — copy one template tree and prove it runs.
   - Pros: Fastest initial showcase.
   - Cons: Cannot prove dependency-aware composition, plugin capabilities, conflict handling, or reusable blocks; migration to composition would replace the core design.
   - Effort: Medium initially, High to correct; reject.

### Recommendation

Use approach 1. Treat the Golden Todo workspace as the acceptance harness for the platform, not as sample collateral. Keep the first model deliberately finite: one Todo preset, one file adapter, one CLI transport, one official catalog, and a small set of dependency-aware blocks. Build generality only when the next visible Golden capability requires it.

Recommended planning sequence, stopping before implementation/tasks:

1. **Tracker respecification proposal** — preserve the completed lifecycle/store/lock/POSIX children and mark only the pending old CLI child as superseded by `app-builder-golden-monorepo`. Do not rewrite archived evidence.
2. **Golden product proposal** — ratify generated topology, v1 Todo behavior, CLI request/result/event protocol, showcase policy, and finite plugin trust boundary.
3. **Delta specifications** — specify creation intent/catalog, generation planning, Nx application, CLI tools, deterministic replay, nested E2E, and committed showcase as separable capabilities.
4. **Technical design** — define exact Effect service/Layer graph, schema types, block conflict/dependency algorithms, Nx adapter, package distribution harness, lockfile normalization, and branch-chain boundaries.
5. **Task planning later** — create visible, dependency-ordered feature-branch-chain slices, each under the 3,000 changed-line review budget unless explicitly split earlier. A likely chain is: contracts/planner → minimal generated tree → executable Todo vertical slice → plugin/catalog composition → deterministic nested E2E/showcase → complete agent-tool CLI surface.

For the existing open chain, retain draft tracker PR #104 as the no-merge integration tracker. Later respecify its text and task roadmap rather than deleting it. New Golden child branches should continue from the latest verified reusable foundation (`feat/app-builder-executable-vertical-slice-posix-adapter` ancestry), target the tracker/integration chain according to feature-branch-chain rules, and be retargeted/rebased so each PR shows only its work unit. Do not merge the abandoned `feat/app-builder-execution-cli` implementation branch merely to preserve history.

### Proposal Questions

1. **Generated topology:** Should Golden v1 use the five-package split shown above (`domain`, `application`, `ports`, `adapter-file`, `runtime`) plus `apps/todo-cli`, or combine `ports` into application and `runtime` into the CLI to reduce the first generated graph?
2. **Todo product behavior:** Is Golden v1 limited to deterministic local CRUD (`add`, `list`, `complete`, `remove`) with file persistence, or must it also prove event callbacks/subscriptions as user-visible Todo behavior?
3. **Plugin trust and distribution:** Must community plugins be ordinary preinstalled npm packages accepted by an allowlisted catalog for v1, or is Golden v1 official plugins only while retaining community-compatible metadata contracts?
4. **Lockfile determinism:** Should the canonical showcase commit a byte-identical `pnpm-lock.yaml` tied to the repository's pinned versions/registry normalization, or should replay compare a canonical semantic dependency projection while allowing lockfile metadata to vary by registry?
5. **CLI event transport:** Should long-running commands emit JSON Lines events followed by one terminal envelope by default in machine mode, or return one final JSON envelope unless `--events=jsonl` is explicitly requested?

### Risks

- Nx Devkit can become the domain model if `Tree` operations leak into blocks; keep planning independent and make the adapter one-way.
- “Community plugin” can accidentally become arbitrary code execution. The catalog and installation trust boundary must be explicit before implementation.
- Byte-level lockfile equality can be unstable across registry URLs, pnpm versions, platform metadata, or local package publication strategies.
- A committed showcase can pollute the root Nx/pnpm graph unless it is outside workspace globs and explicitly excluded from inference.
- Existing execution contracts use passive plans and resolved callbacks; Golden planning must adapt to them deliberately rather than pretending `FilePlan` is already executable authority.
- The full product will exceed one review unit. `auto-chain` plus feature-branch-chain must be applied at visible vertical outcomes, not infrastructure-only layers.

### Ready for Proposal

**Yes, after the five product questions above are answered.** The next phase should be an interactive proposal for `app-builder-golden-monorepo`, paired with a later respecification of the old tracker. It must not revive the old thin CLI child, introduce Effect AI/MCP, delete infrastructure, or create implementation tasks yet.
