# React Router Example with Effect

This example demonstrates using Effect with React Router 7 and better-auth for authentication.

## Stable app entrypoints

The example app is intended to be understandable on its own, without relying on the separate e2e app.

- `/` — landing page with a quick overview of the available example slices
- `/login` — email/password sign-in flow
- `/signup` — account creation flow
- `/todo-app` — protected loader/action example backed by Prisma + auth runtime
- `/chat` — simple UI demo route for smoke-checking the shell/runtime
- `/api/auth/*` — better-auth handler entrypoint used by the reachable auth flows

The root document shell loads Pico CSS and Inter through the React Router `links()` contract so SSR and hydration stay deterministic.

## Features

- **React Router 7** - Modern routing with loaders and actions
- **Effect** - Functional programming and error handling
- **better-auth** - Authentication with email/password
- **Prisma + SQLite** - Database without Docker requirement
- **TailwindCSS** - Styling

## Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm nx run @effectify/react-router-example:dev
```

## Hatchet local development

The default app dev flow stays Docker-free on purpose. Only the Hatchet demo slice needs
the Hatchet Lite stack.

Use the explicit Hatchet-aware targets when you want to test the UI and the
`@effectify/hatchet` integration locally:

```bash
# Check whether Hatchet is already available on localhost:7177 / :8899
pnpm nx run @effectify/react-router-example:hatchet:status

# Ensure Hatchet is available, then start React Router dev
pnpm nx run @effectify/react-router-example:dev:hatchet
```

Available helper targets:

- `hatchet:status` — reports whether Hatchet is already reachable locally
- `hatchet:ensure` — reuses an existing Hatchet instance if one is already running, otherwise starts this app's compose stack, and fails fast if `HATCHET_CLIENT_TOKEN` / `HATCHET_TOKEN` do not match the stack bound to `7177/8899`
- `hatchet:up` — forces this app's compose stack to start and fails if another Hatchet instance already owns the ports
- `hatchet:down` — stops this app's compose stack
- `dev:hatchet` — runs `hatchet:ensure` first, then starts the normal React Router dev server

This matters because Hatchet Lite publishes fixed ports:

- UI: `http://localhost:8899`
- gRPC: `localhost:7177`

If another Hatchet stack is already using those ports, `hatchet:ensure` will only reuse it when the configured
`HATCHET_CLIENT_TOKEN` (preferred) or `HATCHET_TOKEN` (legacy fallback) can actually authenticate against that stack. Otherwise it fails fast with a clear message,
because booting the app against incompatible Hatchet credentials just leads to 403s and broken demo navigation.

The Nx targets already inject the local Hatchet contract for this example:

- `HATCHET_UI_PORT=8899`
- `HATCHET_GRPC_PORT=7177`
- `HATCHET_HOST=localhost:7177`
- `HATCHET_API_URL=http://localhost:8899`

So this app can coexist with another Hatchet project that still owns `8888` / `7077`.

The example now bootstraps the local SQLite schema on startup for ergonomic local dev:

- better-auth tables: `user`, `session`, `account`, `verification`
- Prisma todo table: `Todo`

If you change `prisma/schema.prisma`, regenerate the Prisma client before restarting the app:

```bash
pnpm nx run @effectify/react-router-example:prisma:generate
```

## Database

This example uses **SQLite** (file-based database) instead of PostgreSQL. No Docker required!

- Database file: `dev.db` (created automatically if missing)
- Connection: `DATABASE_URL=file:./dev.db` (defaults automatically for local dev)
- Tables: `user`, `session`, `account`, `verification` (better-auth), `Todo` (Prisma/local bootstrap)

## Authentication

The app includes a complete authentication system powered by better-auth:

- **Signup**: `/signup` - Create new account
- **Login**: `/login` - Sign in with existing account
- **Auth API**: `/api/auth/*` - better-auth loader/action endpoint

## Tech Stack

| Technology   | Version        |
| ------------ | -------------- |
| React        | 19.x           |
| React Router | 7.x            |
| Effect       | 3.x            |
| better-auth  | 1.x            |
| Prisma       | 7.x            |
| SQLite       | better-sqlite3 |
| TailwindCSS  | 4.x            |

## Project Structure

```
app/
├── app.tsx                # Stable landing page overview for the example slices
├── app-nav.tsx            # Deterministic top-level navigation
├── lib/
│   ├── auth-client.ts      # Client-side auth
│   ├── better-auth-options.server.ts  # Server auth config
│   └── runtime.server.ts   # Shared Effect runtime wrappers and AppLayer
├── routes/
│   ├── signup.tsx          # Signup page
│   ├── login.tsx           # Login page
│   ├── todo-app.tsx        # Protected todo workflow
│   ├── chat.tsx            # Simple chat demo
│   └── api.auth.ts         # Auth API endpoints
└── root.tsx                # Document shell + global navigation
```

## Environment Variables

Optional `.env` file for overriding the local SQLite path:

```
DATABASE_URL=file:./dev.db
```

## Development

```bash
# Type checking
pnpm nx run @effectify/react-router-example:typecheck

# Serve the production build through the Nx start contract
pnpm nx start @effectify/react-router-example
```

## Notes

- SQLite is used for simplicity (no Docker needed)
- Local dev bootstraps auth + todo tables automatically from `app/lib/prisma.ts`
- `prisma/better-auth-init.sql` remains available if you want to inspect or run the auth schema manually
- The database file (`dev.db`) is gitignored - each dev has their own local DB
