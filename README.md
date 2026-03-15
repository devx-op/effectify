# Effectify

[![Beta Release](https://img.shields.io/badge/beta-v4%20beta-blue)](https://www.npmjs.com/search?q=%40effectify)
[![Documentation](https://img.shields.io/badge/docs-effectify.dev-00C853)](https://devx-op.github.io/effectify/)

Monorepo of utilities for integrating [Effect](https://effect.website/) with different frameworks and libraries.

> **🚀 Effect v4 Beta Support**: We are currently migrating packages to support Effect v4 beta. Beta versions are available on npm with the `@beta` tag.

## Packages

| Package                                                                                                  | Version                                                                                                                                                   | Documentation                                  | Description                                                                  |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| [@effectify/solid-query](https://www.npmjs.com/package/@effectify/solid-query)                           | [![npm version](https://img.shields.io/npm/v/@effectify/solid-query.svg)](https://www.npmjs.com/package/@effectify/solid-query)                           | [Docs](./packages/solid/query/README.md)       | Integration of Effect with TanStack Query for Solid.js                       |
| [@effectify/react-query](https://www.npmjs.com/package/@effectify/react-query)                           | [![npm version](https://img.shields.io/npm/v/@effectify/react-query.svg)](https://www.npmjs.com/package/@effectify/react-query)                           | [Docs](./packages/react/query/README.md)       | Integration of Effect with TanStack Query for React                          |
| [@effectify/react-router](https://www.npmjs.com/package/@effectify/react-router)                         | [![npm version](https://img.shields.io/npm/v/@effectify/react-router.svg)](https://www.npmjs.com/package/@effectify/react-router)                         | [Docs](./packages/react/router/README.md)      | Integration of React Router with Effect for React applications               |
| [@effectify/react-remix](https://www.npmjs.com/package/@effectify/react-remix)                           | [![npm version](https://img.shields.io/npm/v/@effectify/react-remix.svg)](https://www.npmjs.com/package/@effectify/react-remix)                           | [Docs](./packages/react/remix/README.md)       | Integration of Remix with Effect for React applications                      |
| [@effectify/node-better-auth](https://www.npmjs.com/package/@effectify/node-better-auth)                 | [![npm version](https://img.shields.io/npm/v/@effectify/node-better-auth.svg)](https://www.npmjs.com/package/@effectify/node-better-auth)                 | [Docs](./packages/node/better-auth/README.md)  | Integration of better-auth with Effect for Node.js applications              |
| [@effectify/react-router-better-auth](https://www.npmjs.com/package/@effectify/react-router-better-auth) | [![npm version](https://img.shields.io/npm/v/@effectify/react-router-better-auth.svg)](https://www.npmjs.com/package/@effectify/react-router-better-auth) | [Docs](./packages/react/router-better-auth/)   | Integration of React Router + better-auth with Effect for React applications |
| [@effectify/prisma](https://www.npmjs.com/package/@effectify/prisma)                                     | [![npm version](https://img.shields.io/npm/v/@effectify/prisma.svg)](https://www.npmjs.com/package/@effectify/prisma)                                     | [Docs](./packages/prisma/README.md)            | Prisma generator and runtime utilities for Effect                            |
| [@effectify/solid-effect-atom](https://www.npmjs.com/package/@effectify/solid-effect-atom)               | [![npm version](https://img.shields.io/npm/v/@effectify/solid-effect-atom.svg)](https://www.npmjs.com/package/@effectify/solid-effect-atom)               | [Docs](./packages/solid/effect-atom/README.md) | Reactive toolkit for Effect with SolidJS                                     |

## Beta Installation (Effect v4)

We are actively migrating packages to support Effect v4 beta. You can install beta versions using the `@beta` npm tag:

```bash
# npm
npm install @effectify/react-query@beta
npm install @effectify/solid-query@beta
npm install @effectify/react-router@beta
npm install @effectify/node-better-auth@beta
npm install @effectify/react-remix@beta
npm install @effectify/prisma@beta

# pnpm
pnpm add @effectify/react-query@beta

# yarn
yarn add @effectify/react-query@beta
```

### Migration Status

| Package                     | v4 Beta Status | Stable Version |
| --------------------------- | -------------- | -------------- |
| @effectify/react-query      | 🚧 In Progress | ✅ v3          |
| @effectify/solid-query      | 🚧 In Progress | ✅ v3          |
| @effectify/react-router     | 🚧 In Progress | ✅ v3          |
| @effectify/node-better-auth | 🚧 In Progress | ✅ v3          |
| @effectify/react-remix      | 🚧 In Progress | ✅ v3          |
| @effectify/prisma           | 🚧 In Progress | ✅ v3          |

**Legend**: ✅ Available | 🚧 Migrating | ⏳ Pending

### Effect v3 vs v4

- **Stable releases** (v3.x) continue to work with Effect v3.19.x
- **Beta releases** (v4.x) require Effect v4 beta
- Both versions maintain the same API where possible

For migration details, see the [Effect v4 Migration Guide](https://effect.website/docs/migration/v4).

## Development

### Requirements

- [pnpm](https://pnpm.io/)
- [Node.js](https://nodejs.org/)

### Commands

```bash
# Install dependencies
pnpm install

# Run example application
pnpm nx dev tanstack-solid-app

# Build all packages
pnpm nx affected -t build

# Clean project
pnpm clean
```

### Release Management

To skip a release for documentation updates or other non-release changes, include `[skip release]` in your commit message.

## Credits & Inspiration

This project was inspired by the excellent educational content from [Lucas Barake](https://www.youtube.com/@lucas-barake), particularly his [video on Effect and TanStack Query](https://www.youtube.com/watch?v=zl4w3BQAoJM&t=1011s) which provides great insights into these technologies.

## License

MIT
