# Effectify

Monorepo of utilities for integrating [Effect](https://effect.website/) with different frameworks and libraries.

## Packages

| Package                                                                                  | Version                                                                                                                                   | Documentation                                 | Description                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| [@effectify/solid-query](https://www.npmjs.com/package/@effectify/solid-query)           | [![npm version](https://img.shields.io/npm/v/@effectify/solid-query.svg)](https://www.npmjs.com/package/@effectify/solid-query)           | [Docs](./packages/solid/query/README.md)      | Integration of Effect with TanStack Query for Solid.js          |
| [@effectify/react-query](https://www.npmjs.com/package/@effectify/react-query)           | [![npm version](https://img.shields.io/npm/v/@effectify/react-query.svg)](https://www.npmjs.com/package/@effectify/react-query)           | [Docs](./packages/react/query/README.md)      | Integration of Effect with TanStack Query for React             |
| [@effectify/react-router](https://www.npmjs.com/package/@effectify/react-router)         | [![npm version](https://img.shields.io/npm/v/@effectify/react-router.svg)](https://www.npmjs.com/package/@effectify/react-router)         | [Docs](./packages/react/router/README.md)     | Integration of React Router with Effect for React applications  |
| [@effectify/react-remix](https://www.npmjs.com/package/@effectify/react-remix)           | [![npm version](https://img.shields.io/npm/v/@effectify/react-remix.svg)](https://www.npmjs.com/package/@effectify/react-remix)           | [Docs](./packages/react/remix/README.md)      | Integration of Remix with Effect for React applications         |
| [@effectify/node-better-auth](https://www.npmjs.com/package/@effectify/node-better-auth) | [![npm version](https://img.shields.io/npm/v/@effectify/node-better-auth.svg)](https://www.npmjs.com/package/@effectify/node-better-auth) | [Docs](./packages/node/better-auth/README.md) | Integration of better-auth with Effect for Node.js applications |

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

## Credits & Inspiration

This project was inspired by the excellent educational content from [Lucas Barake](https://www.youtube.com/@lucas-barake), particularly his [video on Effect and TanStack Query](https://www.youtube.com/watch?v=zl4w3BQAoJM&t=1011s) which provides great insights into these technologies.

## License

MIT
