# syntax=docker/dockerfile:1

# ── Builder ───────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# OpenSSL is required by the Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# --ignore-scripts skips native builds and the postinstall prisma generate (run explicitly below).
RUN npm ci --ignore-scripts

# onnxruntime-node ships prebuilt binaries for win32/darwin/linux in one tarball.
# Only linux is reachable from this image, and the other two (~159 MB) otherwise
# ride through npm prune, the runner COPY, and the registry layer cache.
RUN rm -rf node_modules/onnxruntime-node/bin/napi-v*/win32 node_modules/onnxruntime-node/bin/napi-v*/darwin

COPY prisma ./prisma
RUN npx prisma generate

# CLIP and face-recognition weights are deliberately NOT baked in. Vector search
# is an optional beta add-on, so shipping ~600 MB of weights to every install
# would tax the majority that never enables it. They are downloaded on the first
# index run instead, into the model_cache volume from docker-compose.search.yml.

COPY . .

ARG APP_VERSION=1.0.1
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

RUN npm prune --omit=dev

# ── Runner ────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runner
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

# Transformers.js writes downloaded weights here. The path must exist and be
# owned by nextjs in the image: Docker seeds a fresh named volume from the image
# directory, so without this the search add-on's model_cache volume would come
# up root-owned and the non-root app could not write to it.
RUN mkdir -p /app/node_modules/@huggingface/transformers/.cache \
  && chown -R nextjs:nodejs /app/node_modules/@huggingface/transformers/.cache

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
