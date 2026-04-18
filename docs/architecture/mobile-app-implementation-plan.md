# Mobile App Implementation Plan

## Goal

Add first-party Android and iOS support to the current monorepo without forking backend logic or duplicating business rules.

The implementation should:

- keep `apps/server` as the single backend for web and mobile
- keep `packages/db` as the only database access layer
- preserve `apps/web` while extracting reusable business logic for mobile
- add `apps/mobile` as one shared React Native codebase for Android and iOS

## Recommended Stack

### Mobile app

- `Expo`
- `React Native`
- `TypeScript`
- `Expo Router`
- `@tanstack/react-query`
- `expo-secure-store`
- `expo-image-picker`
- `expo-image-manipulator`
- `expo-camera` or `expo-barcode-scanner`

### Shared layers

- `packages/domain`: shared types, DTOs, schemas, mapping helpers
- `packages/api-client`: shared HTTP client and auth token plumbing
- `packages/app-core`: shared feature-facing queries, mutations, and service functions

## Target Repository Layout

```text
.
├── apps
│   ├── server
│   ├── web
│   └── mobile
├── packages
│   ├── db
│   ├── domain
│   ├── api-client
│   └── app-core
└── docs
    └── architecture
```

## Current-State Analysis

The repo already has most of the backend prerequisites for mobile:

- auth routes exist under `/api/v1/auth`
- item routes exist under `/api/v1/items`
- category routes exist under `/api/v1/categories`
- tag routes exist under `/api/v1/tags`
- image uploads exist under `/api/v1/uploads/images`
- AI routes exist under `/api/v1/ai`

The main gap is frontend layering. Several web flows still live in `apps/web/src/legacy/*`, even when they already call the API. That means the code is partly reusable in behavior, but not yet reusable in structure.

### Immediate constraints

1. `apps/web/src/shared/api/client.ts` is browser-specific because it reads `window.localStorage`.
2. Image compression in `apps/web/src/legacy/openai.ts` depends on DOM APIs such as `canvas`.
3. Some screens mix UI logic and data access tightly, especially inventory and scan flows.
4. Profile statistics currently derive from broad item search rather than a dedicated stats endpoint.

## Delivery Strategy

Implement the mobile app in four phases.

### Phase 0: Extract shared app layers

This is the highest-leverage phase. Do this before building screens in `apps/mobile`.

#### Deliverables

- add `packages/domain`
- add `packages/api-client`
- add `packages/app-core`
- migrate web API wrappers out of `apps/web/src/legacy/*`

#### `packages/domain` responsibilities

- shared entity types
- request and response DTOs
- enum values such as `ItemType` and `ItemStatus`
- mapping helpers from server payload to UI model
- zod schemas that are safe to share between web and mobile

#### Suggested file layout

```text
packages/domain/
├── package.json
├── tsconfig.json
└── src
    ├── auth.ts
    ├── item.ts
    ├── category.ts
    ├── tag.ts
    ├── ai.ts
    └── index.ts
```

#### `packages/api-client` responsibilities

- build request URLs from base URL
- handle request headers
- map HTTP failures to `ApiError`
- provide a token provider abstraction instead of directly using browser storage

#### Suggested API client shape

```ts
export interface TokenStorage {
  get(): Promise<string | null> | string | null;
  set(token: string | null): Promise<void> | void;
}

export interface ApiClientConfig {
  baseUrl: string;
  tokenStorage?: TokenStorage;
}
```

Web can back this with `localStorage`. Mobile can back it with `SecureStore`.

#### Suggested file layout

```text
packages/api-client/
├── package.json
├── tsconfig.json
└── src
    ├── client.ts
    ├── errors.ts
    ├── token-storage.ts
    └── index.ts
```

#### `packages/app-core` responsibilities

- auth service functions
- item/category/tag query functions
- AI settings and recognition functions
- upload helpers
- optional React Query helpers and query keys

#### Suggested file layout

```text
packages/app-core/
├── package.json
├── tsconfig.json
└── src
    ├── auth/
    ├── items/
    ├── categories/
    ├── tags/
    ├── ai/
    ├── uploads/
    └── index.ts
```

#### Web migration targets

Move these modules first:

- `apps/web/src/shared/api/client.ts` -> `packages/api-client`
- `apps/web/src/shared/api/types.ts` -> `packages/domain`
- `apps/web/src/legacy/items.ts` -> `packages/app-core/src/items`
- `apps/web/src/legacy/openai.ts` -> split between `packages/app-core/src/ai` and platform image utilities
- `apps/web/src/legacy/categories.ts` -> `packages/app-core/src/categories`
- `apps/web/src/legacy/ai-settings.ts` -> `packages/app-core/src/ai`
- `apps/web/src/legacy/tags.ts` -> `packages/app-core/src/tags`

#### Phase 0 acceptance criteria

- web still builds successfully
- web no longer imports API wrappers from `legacy/*`
- token access is pluggable
- shared types no longer live only under `apps/web`

### Phase 1: Create `apps/mobile`

Build the mobile shell only after Phase 0 extracts the reusable layers.

#### Deliverables

- create `apps/mobile`
- configure Expo and TypeScript workspace support
- configure absolute imports for shared packages
- set up auth, routing, and query providers

#### Suggested mobile structure

```text
apps/mobile/
├── app
│   ├── (auth)
│   ├── (tabs)
│   ├── item
│   └── _layout.tsx
├── src
│   ├── providers
│   ├── features
│   ├── widgets
│   ├── shared
│   └── platform
├── app.json
├── babel.config.js
├── package.json
└── tsconfig.json
```

#### Providers to add

- `AuthProvider`
- `QueryClientProvider`
- app theme provider if needed later

#### Mobile-specific platform services

- `src/platform/auth/secureTokenStorage.ts`
- `src/platform/media/imagePicker.ts`
- `src/platform/media/imageCompression.ts`
- `src/platform/camera/scanner.ts`

#### Phase 1 acceptance criteria

- Expo app boots on iOS simulator and Android emulator
- login screen can call the existing server
- authenticated route guard works
- shared packages resolve cleanly in Metro

### Phase 2: Ship the first useful mobile version

Focus on core inventory flows. Do not try to port every web interaction before first delivery.

#### Scope for v1

- login
- register
- home inventory list
- container drill-down
- item detail
- search and filters
- categories
- tags
- profile
- image upload
- AI settings page

#### Defer from v1

- batch editing
- advanced drag interactions
- complex image cropping UX
- parity with all web animations
- deep offline write synchronization

#### Screen mapping

| Web screen | Mobile action |
| --- | --- |
| `HomePage` | Rebuild with React Native list components |
| `SearchPage` | Rebuild with native search input and filter chips |
| `ItemDetailPage` | Rebuild, reuse shared domain and service layer |
| `CategoriesPage` | Rebuild |
| `TagsPage` | Rebuild |
| `ProfilePage` | Rebuild |
| `ScanPage` | Delay full parity until Phase 3 |

#### Why rebuild the screens

The UI layer should not be shared directly between React DOM and React Native. The correct sharing boundary is the domain, service, and query layer.

#### Phase 2 acceptance criteria

- a user can sign in and stay signed in on mobile
- a user can browse containers and items
- a user can search items
- a user can create or edit a basic item
- a user can upload at least one image successfully

### Phase 3: Add mobile-native capabilities

After v1 is stable, add the features that justify a real app.

#### Capabilities

1. Camera capture for item recognition
2. Album selection for recognition
3. On-device image compression before upload and AI recognition
4. Barcode or QR scan support if product direction needs it
5. Push notifications
6. Local cache persistence for read flows

#### Important architectural split

Separate these concerns:

- shared recognition workflow
- platform-specific image acquisition
- platform-specific image compression

#### Recommended implementation split

- `packages/app-core/src/ai/recognizeItem.ts`: shared request workflow
- `apps/web/src/...`: browser file handling and canvas compression
- `apps/mobile/src/platform/media/...`: native image compression and permission handling

#### Phase 3 acceptance criteria

- mobile can capture or pick an image
- mobile can submit compressed media to `/api/v1/ai/recognize`
- recognized results can be reviewed and saved as items

### Phase 4: Backend hardening for mobile scale

Mobile can launch without all of these, but these changes reduce future risk.

#### Backend upgrades

1. Add refresh token support
2. Add a dedicated stats endpoint
3. Standardize error codes and response envelopes
4. Add request rate limiting where needed
5. Introduce upload storage abstraction for future object storage migration
6. Add OpenAPI or machine-readable endpoint documentation

#### Suggested new endpoints

- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/profile/stats`

#### Phase 4 acceptance criteria

- access token renewal works without forcing repeat login
- profile stats no longer rely on broad item search
- mobile-specific error handling can branch on stable server codes

## Work Breakdown by Week

## Week 1

- create `packages/domain`
- create `packages/api-client`
- extract shared auth, items, categories, tags, AI services
- update `apps/web` imports to use shared packages
- keep web behavior unchanged

## Week 2

- scaffold `apps/mobile`
- wire Expo Router
- wire secure token storage
- connect login/register/profile bootstrap
- validate Android and iOS local startup

## Week 3

- implement home, container drill-down, item detail
- implement search and filters
- implement category and tag screens
- implement image upload

## Week 4

- implement AI settings
- implement camera and album-based recognition flow
- add offline cache persistence for read paths
- stabilize error handling and release candidate testing

## Detailed Task List

### Shared packages

1. Add workspace package definitions for `domain`, `api-client`, and `app-core`.
2. Add package-level build or typecheck scripts.
3. Export stable public entrypoints from each package.
4. Avoid importing from deep internal paths across packages.

### Web refactor

1. Replace browser-only token access with a storage adapter.
2. Replace `legacy` imports in page components one feature at a time.
3. Keep DOM-only image helpers inside web-specific files.
4. Rename or retire `legacy` modules after migration to reduce confusion.

### Mobile app

1. Set up `EXPO_PUBLIC_API_BASE_URL`.
2. Build a mobile auth bootstrap using secure token storage.
3. Add tab navigation matching the product’s main information architecture.
4. Build screen-level loading, empty, and error states.
5. Keep UI intentionally native rather than copying every web motion detail.

### Backend

1. Review CORS assumptions for device and simulator access.
2. Ensure the API base URL works from emulator and real-device environments.
3. Add a refresh flow before public beta.
4. Add server-side observability for upload and AI failures.

## Risks and Mitigations

### Risk 1: Shared code is extracted too late

If `apps/mobile` starts before service extraction, the team will duplicate request wrappers and DTO mapping.

Mitigation:

- complete Phase 0 first
- block new mobile feature work on shared package boundaries

### Risk 2: Browser-only image logic leaks into mobile

Current AI compression logic uses DOM APIs.

Mitigation:

- define a shared service contract
- keep platform image manipulation implementations separate

### Risk 3: Token lifecycle is too weak for app use

A single long-lived JWT is workable short term but not ideal for mobile.

Mitigation:

- launch internal testing with current auth
- schedule refresh token support before wider rollout

### Risk 4: Device networking causes local development friction

Emulators and physical devices cannot always reach `127.0.0.1` the same way web can.

Mitigation:

- document base URL rules for iOS simulator, Android emulator, and real devices
- support environment-based API host overrides in `apps/mobile`

## Definition of Done

The mobile initiative is in a healthy first-release state when:

1. shared business services live in packages outside `apps/web`
2. `apps/mobile` runs on both Android and iOS from the same codebase
3. login, browse, search, detail, upload, and profile all work against the same API as web
4. image recognition works through native media flows
5. backend auth and stats endpoints are sufficient for stable app sessions

## Recommended Execution Order

Build in this order and do not skip ahead:

1. extract shared packages
2. migrate web imports to the new shared packages
3. scaffold `apps/mobile`
4. implement auth and app shell
5. implement v1 inventory flows
6. implement mobile-native media flows
7. harden backend auth and stats

## Notes for Implementation

- Do not share React component trees between web and mobile.
- Do share schemas, DTOs, request wrappers, and query logic.
- Keep the server as the only authority for auth, AI, uploads, and persistence.
- Prefer incremental migration over a large rewrite branch.
