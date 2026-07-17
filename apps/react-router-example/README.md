# React Router Example with Effect

This example combines React Router, Effect, better-auth, Prisma, and one task-first Hatchet endpoint.

## App entrypoints

- `/` — landing page
- `/login` — email/password sign-in
- `/signup` — account creation
- `/todo-app` — protected Prisma loader/action example
- `/chat` — shell/runtime smoke example
- `/api/auth/*` — better-auth handler
- `POST /api/hatchet/runs` — Schema-backed greeting task

Normal development, auth, Prisma, tests, typecheck, and builds do not require Hatchet configuration or Docker.

## Setup

```bash
pnpm install
pnpm nx run @effectify/react-router-example:dev
```

The app bootstraps its local SQLite auth and todo tables. Regenerate Prisma after changing its schema:

```bash
pnpm nx run @effectify/react-router-example:prisma:generate
```

## Hatchet greeting task

`app/lib/hatchet/greeting-task.server.ts` declares one `Task` with Effect Schema input and output. `app/lib/runtime.server.ts` composes `Hatchet.layer({ tasks: [greetingTask] })` into the shared `AppLayer`. The Layer is inert until the endpoint invokes `Hatchet.run`.

The package owns configuration loading, SDK acquisition, task registration, worker startup, lazy initialization, retries, and scope cleanup. The app declares only the Task, Layer composition, and endpoint.

### Start local Hatchet

Hatchet Lite requires unique local database values. Export them in your shell or store them in an untracked `.env` based on `.env-example`:

```bash
export HATCHET_DB_USER="hatchet_$(openssl rand -hex 8)"
export HATCHET_DB_PASSWORD="$(openssl rand -hex 32)"
export HATCHET_DB_NAME="hatchet_$(openssl rand -hex 8)"
docker compose up -d
```

Compose binds PostgreSQL, Hatchet gRPC, and the dashboard to loopback. Open <http://localhost:8888>, create an API token, then start the app with the package configuration:

```bash
export HATCHET_CLIENT_TOKEN='<dashboard token>'
export HATCHET_HOST_PORT='localhost:7077'
export HATCHET_API_URL='http://localhost:8888'
export HATCHET_TLS_STRATEGY='none'
export HATCHET_WORKER_NAME='react-router-example-worker'
pnpm nx run @effectify/react-router-example:dev
```

`HATCHET_TLS_STRATEGY=none` is only for local Hatchet Lite. Omitting it preserves the SDK secure default.

Stop the local services directly:

```bash
docker compose down
```

### Invoke the task

```bash
curl -i -X POST http://localhost:4200/api/hatchet/runs \
  -H 'content-type: application/json' \
  -d '{"name":"Ada"}'
```

The endpoint awaits the registered worker and returns the Task output:

```json
{ "greeting": "Hello, Ada!" }
```

Invalid JSON or Schema input returns a safe `400` response through the existing React Router Effect adapter.

## Project structure

```text
app/
├── app.tsx
├── app-nav.tsx
├── lib/
│   ├── auth-client.ts
│   ├── better-auth-options.server.ts
│   ├── hatchet/
│   │   └── greeting-task.server.ts
│   └── runtime.server.ts
├── routes/
│   ├── api.auth.ts
│   ├── api.hatchet.runs.ts
│   ├── chat.tsx
│   ├── login.tsx
│   ├── signup.tsx
│   └── todo-app.tsx
└── root.tsx
```

## Development

```bash
pnpm nx run @effectify/react-router-example:test
pnpm nx run @effectify/react-router-example:typecheck
pnpm nx run @effectify/react-router-example:lint
pnpm nx run @effectify/react-router-example:build --skip-nx-cache
```

SQLite defaults to `DATABASE_URL=file:./dev.db`. Set `BETTER_AUTH_URL` when serving from a non-default production origin.
