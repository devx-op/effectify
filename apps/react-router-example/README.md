# React Router Example with Effect

This example demonstrates using Effect with React Router 7 and better-auth for authentication.

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
- **Dashboard**: `/dashboard` - Protected route (requires auth)

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
├── lib/
│   ├── auth-client.ts      # Client-side auth
│   ├── better-auth-options.server.ts  # Server auth config
│   └── prisma.ts           # Database connection
├── routes/
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home page
│   ├── signup.tsx          # Signup page
│   ├── login.tsx           # Login page
│   ├── dashboard.tsx       # Protected dashboard
│   └── api.auth.ts         # Auth API endpoints
└── styles/
    └── app.css             # Tailwind styles
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

## Browser Tests

This app now includes a reusable Vitest Browser Mode harness backed by WebdriverIO and a real system Chrome/Chromium binary.

### Prerequisites

- Arch Linux with `chromium` installed, or another supported Chrome binary available on your `PATH`
- The normal workspace dependencies installed with `pnpm install`

### Run the browser harness

```bash
pnpm nx run @effectify/react-router-example:test:browser
```

The Nx target builds the app, serves `dist/apps/react-router-example` on `http://127.0.0.1:3100`, then runs the smoke browser test in headless Chrome.

### Environment variables

- `CHROME_BIN` — absolute path override for the browser binary, for example `CHROME_BIN=/usr/bin/chromium`
- `BROWSER_TEST_BASE_URL` — reuse an already-running app instead of spawning `react-router-serve`

Examples:

```bash
CHROME_BIN=/usr/bin/chromium pnpm nx run @effectify/react-router-example:test:browser
BROWSER_TEST_BASE_URL=http://127.0.0.1:3200 pnpm nx run @effectify/react-router-example:test:browser
```

### Troubleshooting

If the harness reports that Chrome cannot be found, set `CHROME_BIN` explicitly or install one of the supported binaries:

- `chromium`
- `google-chrome-stable`

The resolver checks `CHROME_BIN` first, then searches `PATH` for those binaries in that order.

## Notes

- SQLite is used for simplicity (no Docker needed)
- better-auth tables are created via SQL script (see `prisma/better-auth-init.sql`)
- The database file (`dev.db`) is gitignored - each dev has their own local DB
