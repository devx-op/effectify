# Effectify

[![Alpha Release](https://img.shields.io/badge/channel-alpha-blue)](https://www.npmjs.com/search?q=%40effectify)
[![Documentation](https://img.shields.io/badge/docs-effectify.dev-00C853)](https://devx-op.github.io/effectify/)

Effectify provides Effect integrations for React, Solid, authentication, Prisma, and Hatchet.

> **Effect v4 RC:** The current workspace targets the Effect v4 release candidate (`effect@4.0.0-rc.111`). Prerelease packages are published on explicit npm tags and never replace the stable default by accident.

## Choose a release channel

| Channel | Trigger                | npm tag            | Use it for                              |
| ------- | ---------------------- | ------------------ | --------------------------------------- |
| Alpha   | Push to `dev`          | `alpha`            | Earliest integration builds             |
| Beta    | Push to `master`       | `beta`             | Master-qualified prereleases            |
| Stable  | Manual stable workflow | default (`latest`) | Explicitly selected production releases |

Install an explicit channel; do not rely on npm's default tag for prereleases.

## Packages

| Package                                                                                                    | Documentation                                                                   | Scope                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| [`@effectify/react-router`](https://www.npmjs.com/package/@effectify/react-router)                         | [Docs](./packages/react/router/README.md)                                       | Maintained React Router 8 integration      |
| [`@effectify/react-query`](https://www.npmjs.com/package/@effectify/react-query)                           | [Docs](./packages/react/query/README.md)                                        | TanStack Query integration for React       |
| [`@effectify/node-better-auth`](https://www.npmjs.com/package/@effectify/node-better-auth)                 | [Docs](./packages/node/better-auth/README.md)                                   | better-auth integration for Node.js        |
| [`@effectify/solid-query`](https://www.npmjs.com/package/@effectify/solid-query)                           | [Docs](./packages/solid/query/README.md)                                        | TanStack Query integration for Solid       |
| [`@effectify/react-router-better-auth`](https://www.npmjs.com/package/@effectify/react-router-better-auth) | [Usage reference](./packages/react/router-better-auth/tests/auth-guard.test.ts) | React Router 8 and better-auth integration |
| [`@effectify/prisma`](https://www.npmjs.com/package/@effectify/prisma)                                     | [Docs](./packages/prisma/README.md)                                             | Prisma generator and runtime utilities     |
| [`@effectify/hatchet`](https://www.npmjs.com/package/@effectify/hatchet)                                   | [Package](./packages/hatchet/)                                                  | Hatchet workflow integration               |

The supported router surface is React Router 8 only. The Solid example uses Effect v4's `Atom` and `AtomRef` modules with the official [`@effect/atom-solid`](https://www.npmjs.com/package/@effect/atom-solid) bindings.

## Install alpha packages

Every Nx release package is available through the explicit alpha channel when an alpha version has been published:

```bash
npm install @effectify/react-router@alpha
npm install @effectify/react-query@alpha
npm install @effectify/node-better-auth@alpha
npm install @effectify/solid-query@alpha
npm install @effectify/react-router-better-auth@alpha
npm install @effectify/prisma@alpha
npm install @effectify/hatchet@alpha
```

Use the same package names with `pnpm add` or `yarn add` if those are your package managers. Alpha and beta releases require the current Effect v4 RC. Stable compatibility is documented by each package release.

## Development

### Requirements

- Node.js 24.19.0
- pnpm 10.14.0

### Commands

```bash
# Install dependencies
pnpm install

# Run the maintained Solid example
pnpm nx dev @effectify/solid-example

# Build affected packages
pnpm nx affected -t build

# Check or apply pinned formatting to changed files
pnpm format:check
pnpm format

# Verify React Router 8 consolidation and readiness
pnpm nx run @effectify/react-router-example:consolidation:verify
pnpm nx run @effectify/react-router-example:migration:manifest
pnpm nx run @effectify/react-router-example:migration:verify
```

See [`.github/SETUP.md`](./.github/SETUP.md) for exact CI triggers, release behavior, and stable recovery.

## Credits & Inspiration

This project was inspired by the educational content from [Lucas Barake](https://www.youtube.com/@lucas-barake), particularly his [Effect and TanStack Query video](https://www.youtube.com/watch?v=zl4w3BQAoJM&t=1011s).

## License

MIT
