# ─── SyncHub API ──────────────────────────────────────────────────────────────
# Production image for the Express backend.
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install only production deps (cached unless package files change)
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY . .

# Uploads dir — NOTE: container filesystem is ephemeral. For real deployments
# mount a persistent volume here or switch uploads to object storage (S3/R2).
RUN mkdir -p public/uploads

EXPOSE 5001

# Run DB migrations on boot, then start the server.
# (Idempotent: migrations use "ADD COLUMN IF NOT EXISTS".)
CMD ["sh", "-c", "node scripts/migrate.js && node index.js"]
