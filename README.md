# InPlace

InPlace is a home inventory management project organized as a small monorepo.
It is being migrated toward a PostgreSQL-first architecture with a dedicated API layer,
shared database package, and a React web application.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Overview

This repository is structured around three responsibilities:

- `apps/web`: React + Vite frontend
- `apps/server`: Fastify-based server application
- `packages/db`: shared PostgreSQL schema, client, and migration tooling

The goal of this layout is to keep persistence, business logic, and UI concerns separate,
which makes the codebase easier to extend, test, and contribute to.

## Features

- React web application for browsing and managing inventory
- Fastify server for application-facing backend capabilities
- PostgreSQL schema managed in-repo with Drizzle ORM
- Docker-based local PostgreSQL runtime
- Workspace-based development with shared root scripts

## Architecture

The repository is moving away from a frontend-direct-to-database prototype shape
and toward a more maintainable open source structure:

- the web app should talk to the API
- the API should own validation, orchestration, and persistence access
- PostgreSQL should be the system of record
- database schema and infrastructure should live in version control

Additional architecture notes are available in
[docs/architecture/target-architecture.md](docs/architecture/target-architecture.md).

## Repository Layout

```text
.
├── apps
│   ├── server      # Fastify server
│   └── web         # React + Vite frontend
├── packages
│   └── db          # Drizzle schema and database client
├── infra
│   └── postgres    # Local PostgreSQL runtime
├── docs
│   ├── architecture # Current and target architecture docs
│   └── legacy       # Archived historical materials
├── package.json
└── README.md
```

### Frontend source layout

Inside `apps/web/src`, code is intentionally split into explicit layers:

- `app`: application entry, providers, and top-level routing
- `features`: business-facing feature modules and pages
- `widgets`: layout-level composition pieces
- `shared`: reusable UI and helper utilities
- `legacy`: temporary direct-access modules kept only for migration compatibility

New frontend data-access logic should not be added to `legacy`.

## Requirements

- Node.js `>= 20.10.0`
- npm `>= 10`
- Docker Desktop or a compatible Docker runtime

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
npm run db:up
```

### 3. Create local environment files

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

### 4. Start the development servers

In separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev:web
```

## Docker Compose Deployment

The repository now includes a full multi-service Docker Compose deployment at
[docker-compose.yml](docker-compose.yml).

### Services

- `postgres`: PostgreSQL 16
- `migrate`: one-shot database migration runner
- `server`: Fastify server container
- `web`: Nginx container serving the frontend and proxying `/api` to the API container

### Prepare deployment environment

```bash
cp .env.compose.example .env.compose
```

Update `.env.compose` before the first deployment. At minimum, set:

```env
POSTGRES_PASSWORD=<generate-a-strong-password>
JWT_SECRET=<at-least-32-random-characters>
APP_ENCRYPTION_KEY=<at-least-32-random-characters>
CORS_ORIGIN=https://your-domain.com,http://localhost:8080,http://127.0.0.1:8080
VITE_API_BASE_URL=/api
BACKUP_PAYLOAD_SIZE_MB=100
```

Set the image source as well:

```env
IMAGE_REGISTRY=ghcr.io
IMAGE_TAG=latest
```

Images are published under `ghcr.io/SakuraSM/inplace-*`.

Then start the stack:

```bash
docker compose --env-file .env.compose up -d
```

If you want PostgreSQL data on an external filesystem, set `POSTGRES_DATA_DIR`
to an absolute host path before starting the stack, for example:

```env
POSTGRES_DATA_DIR=/Volumes/data/inplace/postgres
```

By default, Compose stores PostgreSQL data under `./storage/postgres` in the
repository workspace.

Open the application:

```text
http://localhost:8080
```

### Verify the deployment

Pull the latest images explicitly if needed:

```bash
docker compose --env-file .env.compose pull
```

Check container status:

```bash
docker compose --env-file .env.compose ps
```

Follow service logs:

```bash
docker compose --env-file .env.compose logs -f
```

Verify the API health endpoint:

```text
http://localhost:4000/api/v1/health
```

### Stop or rebuild the stack

Stop the deployment:

```bash
docker compose --env-file .env.compose down
```

Restart after a new image is published or configuration changes:

```bash
docker compose --env-file .env.compose up -d
```

### Deployment behavior

The current Compose deployment is designed to keep the full platform verifiable
even while the legacy frontend flow is still being migrated.

- If legacy Supabase variables are not provided, the frontend runs in platform mode
- Platform mode serves a deployment status page from the web container
- The status page verifies API reachability and PostgreSQL connectivity through `/api/v1/health`

This means the deployed stack is operational and observable even before all inventory features
are fully migrated from the legacy data-access path to the new API + PostgreSQL architecture.

## Environment Variables

### API

See [apps/server/.env.example](apps/server/.env.example).

Key variables:

- `PORT`: API port
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGIN`: allowed web origin during local development
- `POSTGRES_DATA_DIR`: host directory used by Docker Compose to persist PostgreSQL data files
- `JWT_SECRET`: signing key for JWT tokens, must be at least 32 characters
- `UPLOAD_DIR`: local directory used by the server to persist uploaded images
- `MAX_UPLOAD_SIZE_MB`: maximum allowed upload size per image
- `OPENAI_API_KEY`: API key used by the server-side AI recognition route
- `OPENAI_BASE_URL`: AI provider base URL, defaults to `https://api.openai.com/v1`
- `OPENAI_MODEL`: model name used for image recognition, defaults to `gpt-4o`
- `APP_ENCRYPTION_KEY`: encryption key for per-user AI credentials stored by the profile settings page; use a dedicated random secret in production

AI settings saved from the profile page are encrypted and stored on the server. The browser never receives or forwards the plaintext key, and per-user settings override the system defaults.

### Web

See [apps/web/.env.example](apps/web/.env.example).

Key variables:

- `VITE_API_BASE_URL`: base URL for the API

Legacy transition variables still exist in the frontend example file because
some UI code has not yet been fully migrated away from the previous Supabase-based data flow.

### Image Uploads

- Images are uploaded to `POST /api/v1/uploads/images`
- The server stores them on the local filesystem and serves them from `/api/uploads/*`
- In Docker Compose, uploaded files are persisted in the `inplace_uploads_data` volume

## Available Scripts

Run from the repository root:

```bash
npm run dev:web
npm run dev:server
npm run build
npm run lint
npm run typecheck
npm run db:up
npm run db:down
npm run db:logs
npm run db:generate
npm run db:migrate
npm run compose:pull
npm run compose:up
npm run compose:down
npm run compose:logs
```

## Database Development

The database package uses Drizzle ORM.

Generate migrations:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

PostgreSQL runtime configuration lives in
[infra/postgres/docker-compose.yml](infra/postgres/docker-compose.yml).

Checked-in SQL migrations live under
[packages/db/migrations](packages/db/migrations),
and the runtime migration runner is implemented in
[packages/db/scripts/migrate.ts](packages/db/scripts/migrate.ts).

## Current Status

This repository has completed the structural migration to:

- workspaces
- dedicated API package
- dedicated database package
- local PostgreSQL runtime

The business-layer migration is still in progress:

- `apps/web` is already in the correct workspace
- parts of the current frontend still use legacy direct data-access modules
- those modules should be replaced incrementally with API-backed clients
- Docker Compose deployment now covers the full platform path: web, server, migrations, and PostgreSQL
- the Compose frontend defaults to platform mode until the legacy feature path is fully retired

Legacy Supabase SQL artifacts are preserved for reference under
[docs/legacy/supabase](docs/legacy/supabase).

## Contributing

Until contribution guidelines are formalized, use the following baseline:

1. Keep persistence logic out of the frontend.
2. Add new database structures through `packages/db`.
3. Prefer API endpoints over direct client-side database access.
4. Run `npm run typecheck` and `npm run build` before submitting changes.

## Roadmap

- Replace remaining legacy frontend data access with API clients
- Add domain services and repository boundaries in `apps/server`
- Introduce automated tests for API and database flows
- Add formal contribution and release documentation

## License

This project is licensed under the Apache License 2.0.
See [LICENSE](LICENSE).
