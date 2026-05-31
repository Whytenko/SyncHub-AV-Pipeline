'use strict';

const crypto = require('crypto');
const pool = require('./pool');

// ─── Utilities ────────────────────────────────────────────────────────────────

const nowISO = () => new Date().toISOString();

const createId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, password_hash, ...rest } = user;
  return rest;
};

// ─── Row mappers (DB snake_case → app camelCase) ──────────────────────────────

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    email: row.email || '',
    role: row.role || 'Участник',
    avatar: row.avatar || '👤',
    gender: row.gender || '',
    birthdate: row.birthdate || '',
    passwordHash: row.password_hash,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
};

const mapProject = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    ownerId: row.owner_id,
    members: row.members || [],
    deadline: row.deadline || '',
    timelineDuration: row.timeline_duration,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    scriptText: row.script_text || '',
    directorNotes: row.director_notes || '',
    markers: row.markers || [],
    bodyMarkers: row.body_markers || [],
    bodySilhouettes: row.body_silhouettes || [],
    locations: row.locations || [],
    mediaFiles: row.media_files || [],
    documents: row.documents || [],
    comments: row.comments || [],
    scriptParams: row.script_params || null,
    storyboardGrid: row.storyboard_grid || null,
    tasks: row.tasks || [],
    makeupLooks: row.makeup_looks || [],
    costumeOutfits: row.costume_outfits || [],
    productionStage: row.production_stage || 'development',
    scenes: row.scenes || [],
    shootingDays: row.shooting_days || [],
    projectRoles: row.project_roles || {}
  };
};

// ─── Database helpers ─────────────────────────────────────────────────────────

const cleanExpiredSessions = async () => {
  try {
    const result = await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    if (result.rowCount > 0) {
      console.log(`[DB] Cleaned ${result.rowCount} expired session(s)`);
    }
  } catch (err) {
    console.error('[DB] cleanExpiredSessions error:', err.message);
  }
};

module.exports = {
  nowISO,
  createId,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  mapUser,
  mapProject,
  cleanExpiredSessions
};
