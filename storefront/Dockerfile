FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# The lockfile resolves through an internal npm mirror; point it at the public registry
# (same packages, versions, and integrity hashes) so the image builds anywhere.
RUN sed -i 's#https://artprod.dev.bloomberg.com/artifactory/api/npm/npm-repos/#https://registry.npmjs.org/#g' package-lock.json \
    && npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Public origin that serves /media; baked into next.config.ts's image allow-list at build time
ARG MEDIA_BASE_URL
ENV MEDIA_BASE_URL=$MEDIA_BASE_URL
# NEXT_PUBLIC_* values are inlined into the bundle at build time
ARG NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
