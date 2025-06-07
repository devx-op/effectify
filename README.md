# Effectify

Monorepo of utilities for integrating [Effect](https://effect.website/) with different frameworks and libraries.

## Packages

| Package | Version | Documentation | Description |
|---------|---------|---------------|-------------|
| [@effectify/solid-query](https://www.npmjs.com/package/@effectify/solid-query) | [![npm version](https://img.shields.io/npm/v/@effectify/solid-query.svg)](https://www.npmjs.com/package/@effectify/solid-query) | [Docs](./packages/solid/query/README.md) | Effect integration with TanStack Query for Solid.js |
| [@effectify/node-better-auth](https://www.npmjs.com/package/@effectify/node-better-auth) | [![npm version](https://img.shields.io/npm/v/@effectify/node-better-auth.svg)](https://www.npmjs.com/package/@effectify/node-better-auth) | [Docs](./packages/node/better-auth/README.md) | Effect integration with better-auth for Node.js |

## Development

### Requirements

- [Bun](https://bun.sh/)
- [Node.js](https://nodejs.org/)

### Commands

```bash
# Install dependencies
bun install

# Run example application
bun nx dev tanstack-solid-app

# Build all packages
bun nx affected -t build

# Clean project
bun clean
```

## Credits & Inspiration

This project was inspired by the excellent educational content from [Lucas Barake](https://www.youtube.com/@lucas-barake), particularly his [video on Effect and TanStack Query](https://www.youtube.com/watch?v=zl4w3BQAoJM&t=1011s) which provides great insights into these technologies.

## License

MIT
