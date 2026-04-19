FROM --platform=$BUILDPLATFORM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json

RUN npm ci --ignore-scripts \
  && npm rebuild esbuild \
  && mkdir -p apps/web/node_modules apps/server/node_modules packages/db/node_modules

FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY package.json package-lock.json .npmrc tsconfig.json tsconfig.base.json ./
COPY apps/server ./apps/server
COPY packages/db ./packages/db

RUN npm run build --workspace @inplace/db \
  && npm run build --workspace @inplace/server

FROM --platform=$TARGETPLATFORM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/server/docker-entrypoint.sh ./apps/server/docker-entrypoint.sh
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/migrations ./packages/db/migrations

RUN chmod +x ./apps/server/docker-entrypoint.sh

EXPOSE 4000

CMD ["./apps/server/docker-entrypoint.sh"]
