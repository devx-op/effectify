---
name: effect-context-manager
description: >
  Manages the local Effect v4 and Alchemy reference clones hosted in ./.effect-reference.
  Trigger: When Effect or Alchemy code needs to be consulted, the context needs to be updated, or a new machine needs to be set up.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Clone the local Effect v4 and Alchemy references on a new machine
- Update Effect from the `main` branch of `Effect-TS/effect`
- Update Alchemy from the `main` branch of `alchemy-run/alchemy`
- Consult current patterns directly in the reference clones
- Verify that both depth-1 clones are synchronized with their upstreams

## Canonical Sources

- `.effect-reference/effect` is a depth-1 clone of the `main` branch of `https://github.com/Effect-TS/effect.git` and is the local Effect v4 reference.
- Effect v3 corresponds to the `v3` branch of the same `Effect-TS/effect` repository; it must not be used as the target for the v4 reference.
- `.effect-reference/alchemy` is a depth-1 clone of the `main` branch of `https://github.com/alchemy-run/alchemy.git` and is the canonical Effect-based Alchemy next/alpha reference.
- `alchemy-run/alchemy-async` is the former async implementation, not the current canonical reference.

## Critical Patterns

### Protocol 1: Setup on a New Machine

The reference directories are ignored by Git and are independent clones. They are neither worktrees of the main repository nor orphan branches.

When one of the directories does not exist or the user mentions a new machine:

```bash
# 1. Create the ignored container directory
mkdir -p .effect-reference

# 2. Clone only the canonical branches with depth 1
git clone --depth 1 --branch main https://github.com/Effect-TS/effect.git .effect-reference/effect
git clone --depth 1 --branch main https://github.com/alchemy-run/alchemy.git .effect-reference/alchemy

# 3. Confirm the remote, branch, and depth of each clone
git -C .effect-reference/effect remote get-url origin
git -C .effect-reference/effect branch --show-current
git -C .effect-reference/effect rev-parse --is-shallow-repository
git -C .effect-reference/alchemy remote get-url origin
git -C .effect-reference/alchemy branch --show-current
git -C .effect-reference/alchemy rev-parse --is-shallow-repository
```

If one of the clones already exists, do not run `git clone` again in that directory. Use the corresponding synchronization protocol.

### Protocol 2: Update from Upstream Sources

When the user asks to update the context, first confirm that each clone is clean and points to the expected remote and branch:

```bash
# Effect v4
git -C .effect-reference/effect status --short --branch
git -C .effect-reference/effect remote get-url origin
git -C .effect-reference/effect branch --show-current
git -C .effect-reference/effect pull --ff-only --depth 1 origin main

# Alchemy next/alpha
git -C .effect-reference/alchemy status --short --branch
git -C .effect-reference/alchemy remote get-url origin
git -C .effect-reference/alchemy branch --show-current
git -C .effect-reference/alchemy pull --ff-only --depth 1 origin main
```

Do not overwrite local changes in the clones. If `status --short` shows changes or `pull --ff-only` cannot fast-forward, stop and resolve the state explicitly.

## Critical Safety Constraints

| Constraint               | Description                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Total Isolation**      | Never run `git merge` between the reference clones and the development branches                            |
| **Read-Only Mode**       | Do not suggest code changes inside `.effect-reference/effect` or `.effect-reference/alchemy`               |
| **Independent Clones**   | Do not mount these references as worktrees or maintain them through orphan branches of the main repository |
| **Ignored Content**      | Files under `.effect-reference` must not be included in commits on development branches                    |
| **Safe Synchronization** | Update only clean clones by fast-forwarding from the `main` branch of their expected `origin`              |

## Status Verification

```bash
# Verify the remote, branch, and shallow clone status of Effect
git -C .effect-reference/effect remote get-url origin
git -C .effect-reference/effect branch --show-current
git -C .effect-reference/effect rev-parse --is-shallow-repository
git -C .effect-reference/effect rev-parse HEAD
git ls-remote https://github.com/Effect-TS/effect.git refs/heads/main

# Verify the remote, branch, and shallow clone status of Alchemy
git -C .effect-reference/alchemy remote get-url origin
git -C .effect-reference/alchemy branch --show-current
git -C .effect-reference/alchemy rev-parse --is-shallow-repository
git -C .effect-reference/alchemy rev-parse HEAD
git ls-remote https://github.com/alchemy-run/alchemy.git refs/heads/main

# Both clones must remain clean
git -C .effect-reference/effect status --short --branch
git -C .effect-reference/alchemy status --short --branch
```

## Commands

```bash
# Initial setup
git clone --depth 1 --branch main https://github.com/Effect-TS/effect.git .effect-reference/effect
git clone --depth 1 --branch main https://github.com/alchemy-run/alchemy.git .effect-reference/alchemy

# Synchronize with the latest upstream state
git -C .effect-reference/effect pull --ff-only --depth 1 origin main
git -C .effect-reference/alchemy pull --ff-only --depth 1 origin main

# Verify status
git -C .effect-reference/effect status --short --branch
git -C .effect-reference/alchemy status --short --branch
```

## Resources

- **Effect v4 Reference**: [.effect-reference/effect/](../../../.effect-reference/effect/)
- **Effect Migration Guide**: [.effect-reference/effect/MIGRATION.md](../../../.effect-reference/effect/MIGRATION.md)
- **Alchemy next/alpha Reference**: [.effect-reference/alchemy/](../../../.effect-reference/alchemy/)
