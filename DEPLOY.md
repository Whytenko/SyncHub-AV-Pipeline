# Deploying SyncHub AV Pipeline

SyncHub is two deployables backed by Postgres:

| Component | Stack | Where |
|-----------|-------|-------|
| **API** (`server/`) | Express + `pg` | Node web service |
| **Web** (`client/`) | Vite/React SPA | Static hosting (or nginx) |
| **DB** | PostgreSQL 16 | Managed Postgres |

---

## Environment variables

### Server (`server/`)
| Var | Required | Example | Notes |
|-----|----------|---------|-------|
| `DATABASE_URL` | ✅ prod | `postgresql://user:pass@host:5432/synchub` | Managed-DB connection string |
| `DATABASE_SSL` | prod | `true` | Managed Postgres needs SSL. Unset = auto (on in prod) |
| `NODE_ENV` | prod | `production` | |
| `ALLOWED_ORIGINS` | ✅ prod | `https://app.example.com` | Comma-separated CORS allowlist = your client URL(s) |
| `PORT` | — | `5001` | Platform usually injects this |
| `UPLOAD_MAX_MB` | — | `500` | Media upload cap |
| `UPLOAD_DOC_MAX_MB` | — | `100` | Document upload cap |

### Client (`client/`)
| Var | Required | Example | Notes |
|-----|----------|---------|-------|
| `VITE_API_URL` | ✅ prod | `https://api.example.com` | **Inlined at build time** — must be set before `npm run build` |

---

## Option 1 — Render (one-click Blueprint)

The repo ships a [`render.yaml`](./render.yaml) that provisions the DB, API and static client together.

1. Push the repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml`.
3. After the first deploy, set the two cross-referencing URLs:
   - `synchub-api` → `ALLOWED_ORIGINS` = the `synchub-web` URL
   - `synchub-web` → `VITE_API_URL` = the `synchub-api` URL
   - Trigger a redeploy of `synchub-web` (Vite needs `VITE_API_URL` at build time).
4. Migrations run automatically via `preDeployCommand: npm run migrate`.

Health check: `GET /api/health`.

---

## Option 2 — Docker (any container platform: Fly, Railway, ECS…)

Dockerfiles are provided for both apps.

```bash
# API
docker build -t synchub-api ./server
docker run -p 5001:5001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/synchub \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://app.example.com \
  synchub-api
# (the API image runs `migrate` then starts on boot)

# Web — VITE_API_URL is a BUILD arg
docker build -t synchub-web \
  --build-arg VITE_API_URL=https://api.example.com ./client
docker run -p 8080:80 synchub-web
```

---

## Database migrations

```bash
cd server
npm run migrate        # applies migrations/*.sql in order (idempotent)
npm run seed           # optional: demo user (demo / demo1234) + sample project
```

Migrations use `ADD COLUMN IF NOT EXISTS`, so re-running is safe. There is no
rollback / version-tracking table yet — see limitations.

---

## Persistent uploads (large media/docs)

Cover/frame/shot/reference **images** already survive redeploys when `S3_*` is set
(they go through the storage layer). Large **media/document/script** uploads still
write to `server/public/uploads`, which is ephemeral unless you persist it:

**Render** — attach a disk (requires a paid `starter`+ instance). In `render.yaml`
uncomment the `plan: starter` + `disk:` block under `synchub-api`:
```yaml
    plan: starter
    disk:
      name: synchub-uploads
      mountPath: /opt/render/project/src/server/public/uploads
      sizeGB: 5
```

**Docker** — mount a named volume at the uploads path:
```bash
docker run -p 5001:5001 \
  -v synchub_uploads:/app/public/uploads \
  -e DATABASE_URL=... -e DATABASE_SSL=true -e NODE_ENV=production \
  synchub-api
```

**Free tier / no disk** — leave it ephemeral (fine for a demo/defense), or move
these routes to `multer-s3` streaming so they go to the bucket too.

---

## Post-deploy checklist

- [ ] `GET /api/health` returns `{ "status": "healthy", "db": "connected" }`
- [ ] Client loads and can register/login (CORS = client origin in `ALLOWED_ORIGINS`)
- [ ] HTTPS on both services (handled by the platform)
- [ ] DB SSL connects (`DATABASE_SSL=true`)
- [ ] Rate limiting works (we set `trust proxy` — needs the platform to forward `X-Forwarded-For`)

---

## ⚠️ Known limitations before onboarding real clients

These are **not yet fixed** and matter for production use:

1. ✅ **All image assets are now stored as files**, not base64 in the DB:
   covers, storyboard frames, editor shots and look references all route through
   the storage abstraction (`server/src/storage.js`) via
   `POST /api/projects/:id/cover` and `POST /api/projects/:id/image`.
   - **Object storage (recommended for prod):** set `S3_BUCKET` (+ `S3_*` creds)
     and `npm i @aws-sdk/client-s3`. Works with AWS S3, Cloudflare R2, MinIO. See
     `.env.example`. Images then live in the bucket and survive redeploys.
2. **Large media/document/script uploads still stream to the container disk**
   (`server/public/uploads`) — these can be hundreds of MB, so they're not
   buffered through the image storage path. On ephemeral PaaS filesystems they're
   **lost on redeploy**. Fix: mount a persistent disk at `server/public/uploads`,
   or add `multer-s3` streaming for these routes.
3. **No automated DB backups** — enable them on the managed DB.
4. **Per-project roles are enforced client-side only** — any project member can
   edit any tab via the API. Fine for a trusted team, not for untrusted clients.
5. **Concurrent edits are last-write-wins** — two people editing one project can
   overwrite each other silently.
6. **No realtime transport** (no WebSocket/SSE) — "instant sync" is request/response;
   changes appear on reload, not live.

See the full audit for context and a remediation plan.
