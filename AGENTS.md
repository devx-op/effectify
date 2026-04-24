<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Effect-TS Pattern Discovery

This project uses effect-smol as the canonical source for Effect patterns.

| Skill                      | Description                         | Location                                                                                  |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `effect-context-manager`   | Setup & sync Effect v4 reference    | [.agent/skills/effect-context-manager](.agent/skills/effect-context-manager/SKILL.md)     |
| `effect-pattern-discovery` | Effect-TS patterns from effect-smol | [.agent/skills/effect-pattern-discovery](.agent/skills/effect-pattern-discovery/SKILL.md) |

**Reference Directory**: `.effect-reference/` contains the effect-smol source code mounted as a git worktree.

## Hatchet + Effect Conventions

- Treat `packages/hatchet` as an **Effect-first** boundary over the upstream Hatchet SDK.
- For **time-based inputs that represent durations or windows**, prefer `effect/Duration` / `Duration.Input` at our package boundary and translate internally to the exact Hatchet SDK contract.
- Do **not** invent shadow enums or string unions in the example app when the package can expose a correct Effect-friendly API.
- Use upstream Hatchet SDK types and runtime values where they are the real contract, but adapt them behind our boundary instead of leaking awkward SDK-only ergonomics.
- `Data.TaggedError` classes should follow the Effect reference style: instantiate directly with `new MyTaggedError({...})`; do **not** add redundant `static of(...)` factory helpers.
