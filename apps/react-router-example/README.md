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

## Notes

- SQLite is used for simplicity (no Docker needed)
- better-auth tables are created via SQL script (see `prisma/better-auth-init.sql`)
- The database file (`dev.db`) is gitignored - each dev has their own local DB
