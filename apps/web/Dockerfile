FROM --platform=$BUILDPLATFORM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/app-core/package.json packages/app-core/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/db/package.json packages/db/package.json

RUN npm ci --ignore-scripts \
  && npm rebuild esbuild \
  && mkdir -p apps/web/node_modules apps/server/node_modules apps/mobile/node_modules packages/app-core/node_modules packages/domain/node_modules packages/api-client/node_modules packages/db/node_modules

FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/apps/mobile/node_modules ./apps/mobile/node_modules
COPY --from=deps /app/packages/app-core/node_modules ./packages/app-core/node_modules
COPY --from=deps /app/packages/domain/node_modules ./packages/domain/node_modules
COPY --from=deps /app/packages/api-client/node_modules ./packages/api-client/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY package.json package-lock.json .npmrc tsconfig.json tsconfig.base.json ./
COPY apps/web ./apps/web
COPY apps/mobile/tsconfig.json ./apps/mobile/tsconfig.json
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY packages/app-core ./packages/app-core
COPY packages/domain ./packages/domain
COPY packages/api-client ./packages/api-client
COPY packages/db/tsconfig.json ./packages/db/tsconfig.json

RUN npm run build --workspace @inplace/web

FROM --platform=$TARGETPLATFORM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
