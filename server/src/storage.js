'use strict';

// ─── Storage abstraction ────────────────────────────────────────────────────────
// Two backends behind one API:
//   • disk  (default)  → writes to server/public/uploads, served by express.static
//   • s3    (optional) → any S3-compatible bucket (AWS S3 / Cloudflare R2 / MinIO),
//                        enabled when S3_BUCKET is set. SDK is lazy-loaded so the
//                        dependency is only needed when actually using S3.
//
// save()  returns a URL the client can resolve: "/uploads/..." (disk) or an
// absolute https URL (S3). remove() understands both.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

const S3_BUCKET = process.env.S3_BUCKET;
const S3_ENABLED = !!S3_BUCKET;

let _s3 = null;
function getS3() {
  if (_s3) return _s3;
  let mod;
  try {
    mod = require('@aws-sdk/client-s3');
  } catch {
    throw new Error('S3_BUCKET is set but @aws-sdk/client-s3 is not installed. Run: npm i @aws-sdk/client-s3');
  }
  _s3 = {
    client: new mod.S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined, // R2/MinIO custom endpoint
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: process.env.S3_ACCESS_KEY_ID
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined
    }),
    PutObjectCommand: mod.PutObjectCommand,
    DeleteObjectCommand: mod.DeleteObjectCommand
  };
  return _s3;
}

const sanitize = (s) => String(s || 'misc').replace(/[^a-zA-Z0-9_-]/g, '');

/**
 * Persist a buffer. Returns a resolvable URL.
 * @param {Buffer} buffer
 * @param {{projectId?:string, subdir?:string, ext?:string, contentType?:string}} opts
 */
async function save(buffer, { projectId, subdir = '', ext = '', contentType } = {}) {
  const filename = `${Date.now()}_${crypto.randomUUID()}${ext}`;
  const key = ['uploads', sanitize(projectId), subdir, filename].filter(Boolean).join('/');

  if (S3_ENABLED) {
    const s3 = getS3();
    await s3.client.send(new s3.PutObjectCommand({
      Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: contentType
    }));
    const base = process.env.S3_PUBLIC_URL
      || `https://${S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com`;
    return `${base.replace(/\/$/, '')}/${key}`;
  }

  const dir = path.join(UPLOAD_DIR, sanitize(projectId), subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/${key}`;
}

/** Delete a previously saved asset by its URL. No-op for data: URLs / unknown paths. */
async function remove(url) {
  if (!url || /^data:/i.test(url)) return;

  if (S3_ENABLED && /^https?:/i.test(url)) {
    try {
      const key = new URL(url).pathname.replace(/^\//, '');
      const s3 = getS3();
      await s3.client.send(new s3.DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    } catch { /* ignore */ }
    return;
  }

  if (url.startsWith('/uploads/')) {
    fs.rm(path.join(__dirname, '..', 'public', url), { force: true }, () => {});
  }
}

module.exports = { save, remove, S3_ENABLED };
