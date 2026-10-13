# The Syllabus Sync app as a Docker image, used by selfhost/docker-compose.yml.
#
# Three stages keep the final image small: install libraries, build the app,
# then copy only the finished "standalone" server into a clean image.
#
# The image contains no install-specific settings: the address and keys are read when the
# container starts (lib/runtime-config.ts), so one published image works for everyone.

ARG NODE_IMAGE=node:24-slim

# ---- 1. Install dependencies (cached until package-lock.json changes) ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 2. Build the app ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV BUILD_STANDALONE=true \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 3. The image that actually runs ----
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Run as the unprivileged "node" user, never as root.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
