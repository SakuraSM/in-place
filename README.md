# InPlace

InPlace is a home inventory application organized as a small npm workspace monorepo.
This split repository keeps the open-source-ready core only: web UI, Fastify API,
shared TypeScript packages, and PostgreSQL schema tooling.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## What is included

- `apps/web`: React + Vite frontend
- `apps/server`: Fastify API
- `packages/db`: Drizzle schema, client, and migration scripts
- `packages/api-client`: shared API client helpers
- `packages/app-core`: shared application-facing API wrappers
- `packages/domain`: shared domain types
- `infra/postgres`: local PostgreSQL runtime for development

This repository intentionally excludes Android/mobile code and other private runtime pieces so the public codebase stays smaller and easier to maintain.

## Requirements

- Node.js `>= 20.10.0`
- npm `>= 10`
- Docker Desktop or another compatible Docker runtime

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment files:

   ```bash
   cp apps/server/.env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. Start PostgreSQL:

   ```bash
   export POSTGRES_PASSWORD=<generate-a-strong-password>
   npm run db:up
   ```

4. Apply database migrations:

   ```bash
   npm run db:migrate
   ```

5. Start the API and web app in separate terminals:

   ```bash
   npm run dev:server
   npm run dev:web
   ```

## Deployment

### Recommended Docker Compose Deployment

#### Prepare deployment environment

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

Then start the stack:

```bash
docker compose --env-file .env.compose up --build -d
```


## Repository layout

```text
.
├── apps
│   ├── server
│   └── web
├── infra
│   └── postgres
├── packages
│   ├── api-client
│   ├── app-core
│   ├── db
│   └── domain
├── package.json
└── tsconfig.json
```

Inside `apps/web/src`, the frontend stays organized by layer:

- `app`: application entry and providers
- `features`: feature pages and business modules
- `widgets`: layout composition
- `shared`: reusable UI and helpers
- `legacy`: compatibility modules that still back some inventory flows

## Environment variables

### Server

See [apps/server/.env.example](apps/server/.env.example).

- `PORT`: API port
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGIN`: allowed web origins
- `JWT_SECRET`: signing key for JWT tokens, at least 32 characters
- `UPLOAD_DIR`: local path for uploaded images
- `MAX_UPLOAD_SIZE_MB`: maximum upload size per image

### Web

See [apps/web/.env.example](apps/web/.env.example).

- `VITE_API_BASE_URL`: base URL for the API

## Scripts

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
```

## Database workflow

The database package uses Drizzle ORM.

Generate migrations:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

The local PostgreSQL definition lives in
[infra/postgres/docker-compose.yml](infra/postgres/docker-compose.yml).
