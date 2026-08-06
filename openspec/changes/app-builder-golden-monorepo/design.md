# Design: App Builder Golden Monorepo

## Technical Approach

Golden is a finite planner/Nx adapter under retained authority:

```text
contracts <- execution
contracts <- generation <- nx-plugin
contracts + execution + generation + nx-plugin <- cli <- e2e
```

| Location                          | Responsibility / Nx intent                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/app-builder/contracts`  | Retained canonical protocol authority.                                                              |
| `packages/app-builder/execution`  | Retained lifecycle/store/recovery/lock/mutation/process/POSIX authority.                            |
| `packages/app-builder/generation` | Intent, catalog, generator contracts, pure planner, replay/provenance; `layer:planning,npm:public`. |
| `packages/app-builder/nx-plugin`  | Local-plugin exports and only `Tree` adapter; `layer:adapter,npm:public`.                           |
| `packages/app-builder/cli`        | Seven commands and explicit Live graph; `layer:entrypoint,npm:public`.                              |
| `packages/app-builder/e2e`        | Temp proof; `type:e2e,npm:private`.                                                                 |
| `examples/app-builder-todo`       | Committed output, excluded from pnpm and Nx inference.                                              |

Graph verification rejects planning→adapter/execution and generated inward-boundary violations.

## Architecture Decisions

| Choice                                  | Rejected / tradeoff                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| Pure generation package plus Nx adapter | Reject `Tree`-shaped domain; separation enforces independence.                   |
| Whole-file and JSON-pointer ownership   | Reject markers/general AST rewriting; extension uses dedicated generated leaves. |
| Exact allowlist, in-process plugins     | Reject intent imports/sandbox claims; installation grants trust.                 |
| Semantic dependency identity            | Reject byte-lock identity; normalization needs certification tests.              |
| Preimage transaction journal            | Reject direct writes; extra I/O buys recovery evidence.                          |

## Generated Architecture

```text
apps/todo-cli -> infrastructure -> application -> domain
       |               |               |
       +---------------+---------------+
```

`domain` owns branded IDs, schemas, events/errors and Effect rules; `application` owns repository/clock/ID/event services and workflows; `infrastructure` owns file persistence/Live Layers; CLI owns Presentation/composition. Web/native are later generators, never universal packaging.

Production explicitly provides repository, clock, ID and scoped `PubSub` event Layers; tests provide stateful/fixed Layers. CRUD writes before ordered `Stream.fromPubSub` publication. Use current `Schema.Struct`/brands, `Schema.TaggedErrorClass`, `Schema.decodeUnknownEffect`; forbid factories, casts, hidden defaults, blind merging and Effect-free rules.

## Atomic Planning and Mutation

`AtomicGenerator={identity,inputSchema,provides,requires,plan}`; `GenerationBlock` carries file, JSON-pointer, dependency, Nx-project and verification contributions; `FilePlan` carries closure, order, base digests, provenance, ownership and digests. Identity is `(package,export,generatorId,semver)`.

Todo preset selects the individually exposed `workspace`, `model`, ports, `events`, use-case, `file-adapter`, and `cli-presentation` generators. They respectively add leaves/barrels, workflows, service contracts, Live wiring, publisher/subscriber, or separate apps.

Generated files are owned; manifests use owned JSON pointers. V1 has no markers/AST transforms. Unowned paths/keys are immutable. Changed bytes or overlapping claims fail before writes; no force overwrite exists.

Planning snapshots targets, detects all conflicts, sorts dependency→identity→path, and writes nothing. Apply translates once to `Tree`. CLI wraps retained `PassivePlan` through `RunExecutor`/`WorkspaceLock`/`WorkspaceMutator`. The private transaction journal stages bytes/preimages; commit revalidates bases/records receipts. Failure reverses writes; incomplete rollback preserves recovery evidence. Replay is independent and zero-diff.

## Trust, Protocol, and Evolution

Official plugins are static imports. Community plugins are installed, pinned and allowlisted by exact package/version/export. Validate package-root metadata/compatibility before import; intent names only capabilities. Accepted code is installation-time trusted, not sandboxed intent; arbitrary modules/templates/callbacks/commands are impossible.

`catalog|plan|generate|verify|replay|explain|doctor` decode versioned request/result/error schemas from stdin XOR `--input`. Stdout is one terminal JSON envelope; `--events=jsonl` adds generator events before it; diagnostics use stderr. Exit classes: `0` success, `2` input, `3` trust, `4` conflict, `5` mutation, `6` verification, `7` host, `130` interruption. Todo events use distinct `effectify.todo/1`. No MCP; future AI only emits validated intent.

Canonical `effectify-cjson/1`, UTF-8/LF, POSIX paths, sorted contributions and exact versions bind intent, catalog, blocks, plan/bases, output bytes/modes and semantic dependencies `(importer,name,version,integrity,peers)`, excluding registry/store/path noise. Tools/plugins are pinned; installs frozen. Provenance records migrations; unavailable/major versions fail pre-mutation.

## Verification, Threats, and Delivery

Unit proves schemas, conflicts, ownership, digests, Layers and exits; integration proves rollback/recovery, plugin gates, streams and channels. E2E uses external `fs.mkdtemp`, isolated Verdaccio, minimal environment, isolated Nx/pnpm state, frozen install, then nested graph/test/typecheck/build, Todo CRUD/events, regeneration and zero-diff. Finalizers clean every exit; evidence retains argv, exits, digests and cleanup diagnostics. Showcase CI compares public-CLI regeneration without rewriting.

| Threat boundary                     | Applicability and RED requirement                                                                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation-like paths            | Applicable: executable mode is allowed only for catalog-declared bin outputs; `requirements.txt`, `CMakeLists.txt`, executable MD/MDX and `README.sh` remain non-executable or fail planning.                                          |
| Git repository / commit / push / PR | N/A: generation, diff and delivery invoke no Git/VCS automation.                                                                                                                                                                       |
| Tool subprocess                     | Applicable: fixed argv templates, contained absolute cwd, explicit environment, no shell. RED: spaces/metacharacters remain data; traversal, inherited env and shell forms fail; non-zero/signal/interruption are typed and finalized. |

Feature-chain boundaries: installable four-project skeleton; executable add/list; CRUD/events plus evolution; trusted replay CLI; isolated E2E/showcase. Each ends with output or executable proof below 3,000 lines; infrastructure-only children are rejected.

## Migration / Rollback and Traceability

No data migration. PR #104 remains no-merge; thin CLI stays superseded. Slices/showcase/catalog entries roll back independently; retained packages remain. Principal risks are allowlist error, root discovery, rollback failure and projection drift; schema gates, exclusion proofs, preserved journals and replay certification contain them. Sections map in order to all seven capability specs.

## Open Questions

None; no unresolved blocker.
