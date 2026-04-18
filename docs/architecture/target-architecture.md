# Target Architecture

## Principles

- PostgreSQL is the system of record.
- The API is the only component that reads and writes the database.
- Frontend code consumes HTTP endpoints instead of embedding persistence concerns.
- Schema, migrations, and local infrastructure live in the repository.

## Repository layout

```text
.
├── apps
│   ├── server
│   └── web
├── packages
│   └── db
├── infra
│   └── postgres
└── docs
    ├── architecture
    └── legacy
```

## Layering

### apps/web

- `app`: entrypoints, providers, and routing
- `features`: feature-specific pages and components
- `widgets`: layout-level composition
- `shared`: reusable UI and helper utilities
- `legacy`: temporary migration-only direct-access code

### apps/server

- transport layer and routing
- request validation
- auth and authorization
- orchestration and business rules

### packages/db

- Postgres schema
- database client
- migration generation config

## Migration path from the previous codebase

1. Keep the existing React app working inside `apps/web`.
2. Keep legacy frontend direct-access code isolated under `apps/web/src/legacy`.
3. Replace direct Supabase calls with dedicated API client modules.
4. Move auth decisions to the API layer.
5. Retire the legacy Supabase SQL and storage assumptions after equivalent Postgres-backed behavior exists.
