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

This project uses the `main` branch of [Effect-TS/effect](https://github.com/Effect-TS/effect.git) as the canonical Effect v4 source. Effect v3 is maintained on the `v3` branch of that same repository.

| Skill                      | Description                              | Location                                                                                  |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `effect-context-manager`   | Setup & sync local reference clones      | [.agent/skills/effect-context-manager](.agent/skills/effect-context-manager/SKILL.md)     |
| `effect-pattern-discovery` | Effect-TS patterns from Effect v4 source | [.agent/skills/effect-pattern-discovery](.agent/skills/effect-pattern-discovery/SKILL.md) |

**Effect Reference**: `.effect-reference/effect/` is an ignored, standalone, depth-1 clone of `https://github.com/Effect-TS/effect.git` on `main`.

**Alchemy Reference**: `.effect-reference/alchemy/` is an ignored, standalone, depth-1 clone of [`alchemy-run/alchemy`](https://github.com/alchemy-run/alchemy.git) on `main`, and is the canonical Effect-based Alchemy next/alpha reference. [`alchemy-run/alchemy-async`](https://github.com/alchemy-run/alchemy-async) is the former async implementation.

## Hatchet + Effect Conventions

- Treat `packages/hatchet` as an **Effect-first** boundary over the upstream Hatchet SDK.
- For **time-based inputs that represent durations or windows**, prefer `effect/Duration` / `Duration.Input` at our package boundary and translate internally to the exact Hatchet SDK contract.
- Do **not** invent shadow enums or string unions in the example app when the package can expose a correct Effect-friendly API.
- Use upstream Hatchet SDK types and runtime values where they are the real contract, but adapt them behind our boundary instead of leaking awkward SDK-only ergonomics.
- `Data.TaggedError` classes should follow the Effect reference style: instantiate directly with `new MyTaggedError({...})`; do **not** add redundant `static of(...)` factory helpers.
