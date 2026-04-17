# React Router Example with Effect

This example demonstrates using Effect with React Router 7 and better-auth for authentication.

## Stable app entrypoints

The example app is intended to be understandable on its own, without relying on the separate e2e app.

For local development, the app serves from `http://localhost:4200` and handles better-auth on the same origin.

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
- **Auth API**: `/api/auth/*` - better-auth loader/action endpoint on the same server/origin

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

If you run the production server on a non-default origin, set `BETTER_AUTH_URL` to match it before starting the app.

## Notes

- SQLite is used for simplicity (no Docker needed)
- Local dev bootstraps auth + todo tables automatically from `app/lib/prisma.ts`
- `prisma/better-auth-init.sql` remains available if you want to inspect or run the auth schema manually
- The database file (`dev.db`) is gitignored - each dev has their own local DB
