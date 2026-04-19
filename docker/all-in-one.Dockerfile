FROM --platform=$BUILDPLATFORM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
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
COPY apps/server ./apps/server
COPY apps/web ./apps/web
COPY apps/mobile/tsconfig.json ./apps/mobile/tsconfig.json
COPY packages/app-core ./packages/app-core
COPY packages/domain ./packages/domain
COPY packages/api-client ./packages/api-client
COPY packages/db ./packages/db

RUN npm run build --workspace @inplace/db \
  && npm run build --workspace @inplace/server \
  && npm run build --workspace @inplace/web

FROM --platform=$TARGETPLATFORM node:20-alpine AS node-runtime

FROM --platform=$TARGETPLATFORM postgres:16-alpine AS runner

RUN apk add --no-cache nginx tini ca-certificates wget \
  && rm -f /etc/nginx/http.d/default.conf

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV POSTGRES_DB=inplace
ENV POSTGRES_USER=inplace

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/all-in-one/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/all-in-one/entrypoint.sh /usr/local/bin/inplace-all-in-one

RUN chmod +x /usr/local/bin/inplace-all-in-one \
  && mkdir -p /app/storage/uploads \
  && mkdir -p /var/lib/postgresql/data

EXPOSE 80

ENTRYPOINT ["tini", "--", "/usr/local/bin/inplace-all-in-one"]
