# syntax=docker/dockerfile:1

# ── Builder ───────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# --ignore-scripts skips the native better-sqlite3 build (dev-only, unused at
# runtime) and the postinstall prisma generate (run explicitly below).
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

# Bake CLIP weights into the image (own layer, cached across deploys unless
# warm-models.ts/its model id changes) instead of fetching them at runtime.
COPY scripts/warm-models.ts ./scripts/warm-models.ts
RUN npx tsx scripts/warm-models.ts

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# SENTRY_AUTH_TOKEN (if provided as a build secret) enables source map upload
RUN --mount=type=secret,id=sentry_auth_token \
  SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
  npm run build

# Standalone-output file tracing only follows static require()/import graphs,
# so it misses native binaries and data files (model weights, .wasm) loaded
# by path at runtime — onnxruntime-node, sharp, face-api, tfjs all hit this.
# Pruning dev deps then copying the whole tree wholesale (below) is simpler
# and more robust than chasing each missing transitive dependency by hand.
RUN npm prune --omit=dev

# ── Runner ────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Full pruned (production-only) node_modules, overlaid on top of the
# standalone output's traced subset — see the npm-prune step above for why.
# This supersedes the old Prisma-only manual copy (still correct, just now
# redundant: the engine/client are already inside this full tree).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
