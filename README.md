# InPlace

[中文说明](README.zh-CN.md)

InPlace is an open-source home inventory manager for keeping track of household items, where they are stored, and how they are organized. The project is maintained as a TypeScript monorepo with a React web app, an Expo mobile app, a Fastify API, and a PostgreSQL data layer.

The codebase is still evolving, but its current direction is stable: clients talk to the API, the API owns validation and persistence access, and PostgreSQL is the system of record.

## Features

- Inventory, category, location, tag, and activity management.
- Web client built with React, Vite, and shared domain packages.
- Mobile client built with Expo and React Native.
- Fastify API backed by PostgreSQL and Drizzle ORM.
- Image upload support and server-side AI recognition hooks.
- JSON and CSV data export, plus JSON backup import on mobile.
- Docker Compose deployment for both split-service and all-in-one setups.

## Repository Layout

```text
.
├── apps
│   ├── mobile      # Expo / React Native app
│   ├── server      # Fastify API
│   └── web         # React + Vite web app
├── packages
│   ├── api-client  # Shared API client helpers
│   ├── app-core    # Cross-client application logic
│   ├── db          # Drizzle schema, client, and migrations
│   ├── domain      # Shared domain types and rules
│   └── ui          # Shared design tokens and UI primitives
├── docs            # Architecture notes and historical references
├── infra           # Local infrastructure, including PostgreSQL
├── docker-compose.yml
├── docker-compose.single.yml
└── package.json
```

## Architecture

InPlace is organized around a clear separation of responsibilities:

- `apps/web` and `apps/mobile` provide user interfaces.
- `apps/server` exposes API routes, validates input, coordinates business workflows, and owns persistence access.
- `packages/db` contains the PostgreSQL schema and migration tooling.
- `packages/domain`, `packages/app-core`, `packages/api-client`, and `packages/ui` share reusable logic across clients.

New data-access code should go through the API rather than adding direct database or legacy data-source access to frontend clients.

More background is available in [docs/architecture/target-architecture.md](docs/architecture/target-architecture.md).

## Requirements

- Node.js `>= 20.10.0`
- npm `>= 10`
- Docker Desktop or a compatible Docker runtime
- Expo tooling when working on the mobile app

## Quick Start

Install dependencies:

```bash
npm install
```

Start the local PostgreSQL runtime:

```bash
npm run db:up
```

Create local environment files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Run the API and web app in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev:web
```

Run the mobile app:

```bash
npm run dev:mobile
```

For native mobile builds, use:

```bash
npm run android
npm run ios
```

## Deployment

The repository supports two Docker Compose deployment modes.

### Split-Service Compose

[docker-compose.yml](docker-compose.yml) runs PostgreSQL, the Fastify API, and the web frontend as separate services. This is the recommended option when you want clearer service boundaries and independent lifecycle management.

Prepare the environment:

```bash
cp .env.compose.example .env.compose
```

At minimum, update these values before starting the stack:

```env
POSTGRES_PASSWORD=<generate-a-strong-password>
JWT_SECRET=<at-least-32-random-characters>
APP_ENCRYPTION_KEY=<at-least-32-random-characters>
CORS_ORIGIN=https://your-domain.com,http://localhost:8080,http://127.0.0.1:8080
VITE_API_BASE_URL=/api
BACKUP_PAYLOAD_SIZE_MB=100
```

Start the stack:

```bash
docker compose --env-file .env.compose up -d server web
```

Open the web app at:

```text
http://localhost:8080
```

The server container applies checked-in database migrations before the API starts, so the same command works for first boot and later updates.

### All-In-One Compose

[docker-compose.single.yml](docker-compose.single.yml) packages PostgreSQL, the API, and Nginx-served frontend assets into one container. It is useful for simple single-host deployments.

Prepare the environment:

```bash
cp .env.single.example .env.single
```

Start the bundled container:

```bash
docker compose --env-file .env.single -f docker-compose.single.yml up -d
```

The bundled image is published as:

```text
ghcr.io/sakurasm/inplace-all-in-one:latest
```

## Deployment Operations

Pull images:

```bash
docker compose --env-file .env.compose pull
```

Check container status:

```bash
docker compose --env-file .env.compose ps
```

Follow logs:

```bash
docker compose --env-file .env.compose logs -f
```

Check API health through the web entrypoint:

```text
http://localhost:8080/api/v1/health
```

Stop the split-service stack:

```bash
docker compose --env-file .env.compose down
```

If you want PostgreSQL data on a specific host path, set `POSTGRES_DATA_DIR` before starting Compose:

```env
POSTGRES_DATA_DIR=/Volumes/data/inplace/postgres
```

By default, Compose stores PostgreSQL data under `./storage/postgres`.

## Environment Variables

### API

See [apps/server/.env.example](apps/server/.env.example).

Key variables:

- `PORT`: API port.
- `DATABASE_URL`: PostgreSQL connection string.
- `CORS_ORIGIN`: allowed frontend origins.
- `JWT_SECRET`: JWT signing key. Use at least 32 random characters.
- `APP_ENCRYPTION_KEY`: encryption key for user-saved AI credentials. Use a dedicated production secret.
- `MAX_UPLOAD_SIZE_MB`: maximum allowed upload size per image.
- `BACKUP_PAYLOAD_SIZE_MB`: maximum backup import payload size.
- `OPENAI_API_KEY`: optional default API key for server-side AI recognition.
- `OPENAI_BASE_URL`: AI provider base URL. Defaults to `https://api.openai.com/v1`.
- `OPENAI_MODEL`: model name used for image recognition.

AI settings saved from the profile page are encrypted on the server. The browser does not receive the plaintext key, and per-user settings override system defaults.

### Web

See [apps/web/.env.example](apps/web/.env.example).

Key variable:

- `VITE_API_BASE_URL`: base URL for the API.

The frontend example file may still include legacy transition variables while older data-access paths are being retired.

### Mobile

The mobile app lives in [apps/mobile](apps/mobile). It uses the same API, domain, and app-core packages as the web app.

Key variables:

- `EXPO_PUBLIC_API_BASE_URL`: optional default API server before a user configures one in the app.
- `EXPO_PROJECT_ID`: GitHub Actions repository variable used by EAS Build.
- `EXPO_TOKEN`: GitHub Actions secret used by EAS Build.

On first login or registration, enter the server address and account credentials in the app. The app normalizes the server address to include `/api`, stores the selected server on device, and keeps the auth token in secure storage.

## Development Scripts

Run scripts from the repository root:

```bash
npm run dev:web
npm run dev:server
npm run dev:mobile
npm run android
npm run ios
npm run build
npm run build:web
npm run build:server
npm run build:mobile
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
npm run single:pull
npm run single:up
npm run single:down
npm run single:logs
```

## Database Development

Generate migrations:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

PostgreSQL runtime configuration lives in [infra/postgres/docker-compose.yml](infra/postgres/docker-compose.yml). Checked-in SQL migrations live under [packages/db/migrations](packages/db/migrations), and the runtime migration runner is implemented in [packages/db/scripts/migrate.ts](packages/db/scripts/migrate.ts).

## Current Status

The project has completed the structural move to workspaces, a dedicated API, a shared database package, and a local PostgreSQL runtime. Some legacy frontend data-access paths may still exist during migration; new work should prefer API-backed flows.

Legacy Supabase SQL artifacts are preserved only for reference under [docs/legacy/supabase](docs/legacy/supabase).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request and follow the project [Code of Conduct](CODE_OF_CONDUCT.md).

Before submitting changes, run:

```bash
npm run typecheck
npm run build
```

If your change affects a specific app or package, also run the relevant workspace script where possible.

Do not commit secrets, production credentials, or local environment files. Use the checked-in `.env*.example` files as templates.

## Roadmap

- Replace remaining legacy frontend data access with API clients.
- Strengthen server-side domain service and repository boundaries.
- Add automated tests for API, database, web, and mobile flows.
- Expand release and self-hosting documentation.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
