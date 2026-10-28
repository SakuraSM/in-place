# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project is expected to follow Semantic Versioning once release management is formalized.

## [0.4.0] - 2026-10-28

### Added

- MCP access settings on Web and mobile, with expiring, scoped credentials that can be revoked.
- Agent tools to query inventory and preview or atomically import items, containers, and locations with request deduplication.
- Shared design tokens, reusable layouts, and persisted Web and mobile visual designs.

### Changed

- Refresh Web and mobile pages with a consistent, minimal visual style.
- Run database migrations and MCP integration tests in container CI.

### Fixed

- Correct native inventory card alignment, excess spacing, image fallbacks, and safe areas.
- Send native image authentication headers only to the configured API origin.
- Flush lifecycle request completion inside React test updates to avoid CI timing failures.

### Upgrade

- Container startup applies migration `0013_create_mcp_access.sql`. Configure `PUBLIC_ORIGIN` for external MCP access.
- Advance the mobile build number baseline to 8 so production builds increment beyond v0.3.6.
- Previous application versions can run with the added MCP tables retained.

## [0.3.5] - 2026-10-13

### Fixed

- Preserve household selection after refresh and isolate cached inventory and saved filters by household.
- Remove silent inventory limits and apply stable, database-backed pagination for large households.
- Align Web and Android expiry reports, latest stocktake counts, duplicate merging, and import permissions.
- Recover partial batch failures without repeating successful writes; export the selected household consistently.
- Keep mobile Web pagination reachable above bottom navigation and improve dialog keyboard handling.

### Changed

- Share Android inventory forms and draft validation across creation and editing flows.
- Improve tablet home layout, Android recent records, touch targets, and filtered statistics navigation.
- Add Web, Server, and Mobile tests to release workflows and synchronize lockfile workspace versions.

## [Unreleased]

### Added

- Workspace-based repository layout with `apps/web`, `apps/server`, and `packages/db`
- Fastify server scaffold
- Drizzle ORM database package
- Local PostgreSQL Docker setup
- Chinese README
- Common open source community files

### Changed

- Repository architecture shifted from frontend-direct data access toward a PostgreSQL-first layered design
- Root documentation rewritten to match open source repository conventions
