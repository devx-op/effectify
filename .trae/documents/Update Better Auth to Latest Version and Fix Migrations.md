Based on the research, `better-auth` has deprecated/removed the `getMigrations` programmatic API in favor of using the CLI. The latest version is `1.4.10`.

To update `better-auth` and restore functionality:

1.  **Update Version**: Change `better-auth` version from `1.4.1` to `1.4.10` in `pnpm-workspace.yaml`.
2.  **Fix `auth-service.ts`**:
    *   Remove the `getMigrations` import and usage from `@effectify/node-better-auth`.
    *   This logic was causing the failure because the API no longer exists or has changed.
    *   Since programmatic migration is no longer the standard, we will remove this automatic step.
3.  **Update App Configuration (`react-app-router-fm`)**:
    *   Since automatic migration is removed, we need to run migrations via CLI.
    *   I will add a `db:migrate` script to `apps/react-app-router-fm/package.json` that uses `better-auth migrate`.
    *   I will verify if we can trigger this script automatically in `dev` or if manual execution is preferred.

**Why this works**:
The app uses `pg` pool directly (not Prisma adapter for `better-auth`), so it relies on `better-auth`'s internal schema management. The `better-auth migrate` CLI command is designed exactly for this scenario (applying schema for built-in adapters).

I will now proceed with these changes.