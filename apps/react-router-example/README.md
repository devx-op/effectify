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

# Generate Prisma client
npx prisma generate

# Run migrations (creates dev.db SQLite file)
npx prisma migrate dev

# Create better-auth tables (only needed once)
sqlite3 dev.db < prisma/better-auth-init.sql

# Start development server
pnpm dev
```

## Database

This example uses **SQLite** (file-based database) instead of PostgreSQL. No Docker required!

- Database file: `dev.db` (created automatically)
- Connection: `DATABASE_URL=file:./dev.db`
- Tables: `user`, `session`, `account`, `verification` (better-auth), `Todo` (Prisma)

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

Create a `.env` file:

```
DATABASE_URL=file:./dev.db
```

## Development

```bash
# Type checking
pnpm typecheck

# Build for production
pnpm build
```

## Notes

- SQLite is used for simplicity (no Docker needed)
- better-auth tables are created via SQL script (see `prisma/better-auth-init.sql`)
- The database file (`dev.db`) is gitignored - each dev has their own local DB
