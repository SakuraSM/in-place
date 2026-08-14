# InPlace

<p align="center">
  <img src="apps/web/public/branding/inplace-logo-full.png" alt="InPlace — Home inventory management" width="460" />
</p>

[中文说明](README.zh-CN.md)

InPlace is an open-source home inventory manager for keeping track of household items, where they are stored, and how they are organized. The project is maintained as a TypeScript monorepo with a React web app, an Expo mobile app, a Fastify API, and a PostgreSQL data layer.

The codebase is still evolving, but its current direction is stable: clients talk to the API, the API owns validation and persistence access, and PostgreSQL is the system of record.

<p align="center">
  <img src="docs/assets/inplace-home.png" alt="InPlace web home page showing inventory statistics, recent additions, recent activity, and location cards" width="1200" />
</p>

<p align="center"><sub>Web home page · inventory overview, recent activity, and location organization</sub></p>

## Features

- Inventory, category, location, tag, and activity management.
- Web client built with React, Vite, and shared domain packages.
- Mobile client built with Expo and React Native.
- Fastify API backed by PostgreSQL and Drizzle ORM.
- Image upload support and server-side AI recognition hooks.
- JSON and CSV data export, plus JSON backup import on mobile.
- A geographic asset map with location-aware markers, clustering, filtering, and coordinate assignment.
- Docker Compose deployment for both split-service and all-in-one setups.

## Geographic Asset Map

The Web app projects every nested asset onto its nearest geocoded location, so a household can see where assets are distributed without flattening the existing location and container hierarchy.

<p align="center">
  <img src="docs/assets/inplace-asset-map.jpg" alt="InPlace geographic asset map showing location-category marker icons, asset filters, totals, and the selected location details" width="1200" />
</p>

<p align="center"><sub>Geographic asset map · location-category marker icons, filters, totals, and asset drill-down</sub></p>

- Renders a real AMap Web JS map through a same-origin server proxy; the paired security code is never returned to the browser.
- Uses each outermost location category's icon for its map marker and groups nearby locations into clusters.
- Supports search plus status, asset-category, and creation-date filters.
- Shows mapped/unmapped totals, location value summaries, and the assets stored at a selected point.
- Lets household owners and editors assign or update coordinates while viewers retain read-only access.

The map is optional. See [Deployment](#deployment) for the required AMap Web JS API key, security code, and production domain allowlist.

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

## Engineering and Product Documentation

- [Web UI and map functional design](docs/product/web-ui-functional-design.md): information architecture, interaction contracts, map behavior, known UX risks, and troubleshooting entry points.
- [Engineering Harness](docs/harness/README.md): change protocol, quality rules, test matrix, current CI gates, task routing, and PR templates.
- [Contributing](CONTRIBUTING.md): local development and contribution basics.

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

Review these values before starting the stack. The database password and two independent secrets are required; the deployment hints below them are optional:

```env
POSTGRES_PASSWORD=<generate-a-strong-password>
# Generate two different secrets (for example: openssl rand -hex 32).
JWT_SECRET=
APP_ENCRYPTION_KEY=
CORS_ORIGIN=https://your-domain.com,http://localhost:8080,http://127.0.0.1:8080
# Recommended for public deployments; optional for existing/local containers.
PUBLIC_ORIGIN=https://your-domain.com
# Optional extra providers; OPENAI_BASE_URL is always allowed.
AI_PROVIDER_ALLOWED_BASE_URLS=https://api.openai.com/v1
VITE_API_BASE_URL=/api
BACKUP_PAYLOAD_SIZE_MB=100
# Optional: enable the geographic asset map. Configure both values.
AMAP_JS_API_KEY=<AMap Web JS API key>
AMAP_JS_SECURITY_CODE=<matching security code>
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
- `PUBLIC_ORIGIN`: optional canonical public deployment origin used for trusted absolute URLs and strict Host validation. Recommended for public deployments; when omitted, absolute URLs fall back to the first `CORS_ORIGIN`.
- `JWT_SECRET`: JWT signing key. Use at least 32 random characters.
- `APP_ENCRYPTION_KEY`: encryption key for user-saved AI credentials. Use a dedicated production secret.
- `MAX_UPLOAD_SIZE_MB`: maximum allowed upload size per image.
- `BACKUP_PAYLOAD_SIZE_MB`: maximum backup import payload size.
- `OPENAI_API_KEY`: optional default API key for server-side AI recognition.
- `OPENAI_BASE_URL`: AI provider base URL. Defaults to `https://api.openai.com/v1`.
- `AI_PROVIDER_ALLOWED_BASE_URLS`: optional comma-separated allowlist of additional HTTPS AI provider base URLs. `OPENAI_BASE_URL` is always allowed.
- `AI_REQUEST_TIMEOUT_MS` / `AI_MAX_RESPONSE_BYTES`: outbound AI deadline and response-size limit.
- `AUTH_SESSION_TTL_DAYS`: lifetime of revocable authentication sessions; defaults to 7 days.
- `OPENAI_MODEL`: model name used for image recognition.
- `AMAP_JS_API_KEY`: AMap Web JS API key used to enable the geographic asset map.
- `AMAP_JS_SECURITY_CODE`: security code paired with the key. It is used only by the server proxy and is never returned to the browser; both AMap variables must be configured together.

AI settings saved from the profile page are encrypted on the server. The browser does not receive the plaintext key. A custom provider must be operator-allowlisted and use its own API key; it never inherits the server default key.

When enabling the asset map, configure the production domain allowlist for the Web key in the AMap console. Never place the security code in a `VITE_*` variable, frontend source, or version control. Coordinates are stored in each household location's `metadata.geo_location`, so no database migration is required.

### Web

See [apps/web/.env.example](apps/web/.env.example).

Key variable:

- `VITE_API_BASE_URL`: base URL for the API.

The frontend example file may still include legacy transition variables while older data-access paths are being retired.

### Mobile

The mobile app lives in [apps/mobile](apps/mobile). It uses the same API, domain, and app-core packages as the web app.

Key variables:

- `EXPO_PUBLIC_API_BASE_URL`: optional default API server before a user configures one in the app.
- `EXPO_PUBLIC_WEB_BASE_URL`: optional debug-only Web origin for the map canvas; production derives it from the API origin.
- `EXPO_PROJECT_ID`: GitHub Actions repository variable used by EAS Build.
- `EXPO_TOKEN`: GitHub Actions secret used by EAS Build.

On first login or registration, enter the server address and account credentials in the app. The app normalizes the server address to include `/api`, stores the selected server on device, and keeps the auth token in secure storage.

Android provides the same inventory workflows as Web through native screens: Home, Inventory, Capture, Management, and Profile. Locations include tree and map views. The map alone runs in a restricted WebView using the public AMap Web JS key; filters, household permissions, details, and coordinate confirmation remain native. The AMap security code is never sent to the app.

![Android home](docs/assets/android-home.png)

See the [Android/Web parity guide](docs/product/android-web-parity.md) for the capability matrix, map bridge boundary, local preview, and troubleshooting.

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
