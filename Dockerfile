# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci --include=dev

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV VENDELIA_STANDALONE=true
COPY --from=dependencies /app/ ./
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# The monorepo tracing root preserves frontend/server.js and shared runtime dependencies.
COPY --from=builder --chown=node:node /app/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=node:node /app/frontend/public ./frontend/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health/live', {signal: AbortSignal.timeout(3000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "frontend/server.js"]
