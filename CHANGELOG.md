# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project is expected to follow Semantic Versioning once release management is formalized.

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
