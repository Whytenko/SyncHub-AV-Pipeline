'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./src/swagger');
const pool = require('./src/pool');
const {
  nowISO, createId, hashPassword, verifyPassword,
  sanitizeUser, mapUser, mapProject, cleanExpiredSessions
} = require('./src/db');
const {
  validatePassword,
  validateProjectPatch,
  normalizeTimelineDuration
} = require('./src/validate');

const app = express();
const PORT = process.env.PORT || 5001;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

// ─── Upload storage ────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/ogg',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
  'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/webm'
]);

const multerStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.params.id || 'tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${crypto.randomUUID()}${ext}`);
  }
});

const UPLOAD_MAX_BYTES = parseInt(process.env.UPLOAD_MAX_MB || '500') * 1024 * 1024;
const UPLOAD_DOC_MAX_BYTES = parseInt(process.env.UPLOAD_DOC_MAX_MB || '100') * 1024 * 1024;

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Формат не поддерживается: ${file.mimetype}`));
    }
  }
});

// ─── Multer for documents ──────────────────────────────────────────────────────
const ALLOWED_DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp'
]);

const DOC_EXT_TO_TYPE = {
  '.pdf': 'pdf', '.doc': 'doc', '.docx': 'docx',
  '.xls': 'xls', '.xlsx': 'xlsx', '.ppt': 'ppt', '.pptx': 'pptx',
  '.txt': 'txt', '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg',
  '.gif': 'gif', '.webp': 'webp'
};

const uploadDoc = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(UPLOAD_DIR, req.params.id || 'tmp', 'docs');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}_${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: UPLOAD_DOC_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOC_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Формат не поддерживается: ${file.mimetype}`));
    }
  }
});

// ─── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Static file serving (uploads) ────────────────────────────────────────────
// Strip CSP frame-ancestors / etc — uploads are raw assets (images, audio, PDFs)
// served cross-origin to the SPA dev server. They must be embeddable in iframes.
app.use('/uploads', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.ogv'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'];
    if (videoExts.includes(ext)) res.setHeader('Content-Type', `video/${ext.slice(1) === 'mov' ? 'quicktime' : ext.slice(1)}`);
    else if (audioExts.includes(ext)) res.setHeader('Content-Type', `audio/${ext.slice(1) === 'm4a' ? 'mp4' : ext.slice(1)}`);
    else if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    // explicitly: remove CSP & X-Frame-Options after express.static set them
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
  }
}));

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Слишком много попыток. Подождите 15 минут.' }
}));
app.use('/api', rateLimit({
  windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Слишком много запросов. Попробуйте позже.' }
}));

// ─── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${new Date().toISOString()}] ${level} ${req.method} ${req.url} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// ─── Auth helpers ──────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const getTokenFromReq = (req) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  return type === 'Bearer' ? token : null;
};

const authRequired = async (req, res, next) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ success: false, message: 'Требуется авторизация' });

    const { rows: [session] } = await pool.query(
      'SELECT * FROM sessions WHERE token = $1', [token]
    );
    if (!session) return res.status(401).json({ success: false, message: 'Сессия недействительна или истекла' });
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ success: false, message: 'Сессия истекла. Войдите снова' });
    }

    const { rows: [userRow] } = await pool.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (!userRow) return res.status(401).json({ success: false, message: 'Пользователь не найден' });

    req.user = mapUser(userRow);
    req.sessionToken = session.token;

    // Slide session expiry on each request
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    pool.query('UPDATE sessions SET expires_at = $1 WHERE token = $2', [newExpiry, session.token])
      .catch(e => console.error('[SESSION SLIDE ERROR]', e.message));

    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка авторизации' });
  }
};

// ─── Domain helpers ────────────────────────────────────────────────────────────
const toUserSummary = (user) => ({
  id: user.id,
  nickname: user.nickname,
  firstName: user.first_name ?? user.firstName,
  lastName: user.last_name ?? user.lastName,
  role: user.role,
  avatar: user.avatar
});

// ─── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎬 SyncHub AV Pipeline API',
    version: '3.0.0',
    db: 'PostgreSQL 16',
    endpoints: {
      auth: { register: 'POST /api/auth/register', login: 'POST /api/auth/login', me: 'GET /api/auth/me', logout: 'POST /api/auth/logout' },
      users: { me: 'GET /api/users/me', update: 'PATCH /api/users/me', password: 'PATCH /api/users/me/password' },
      projects: { list: 'GET /api/projects', create: 'POST /api/projects', get: 'GET /api/projects/:id', update: 'PATCH /api/projects/:id', remove: 'DELETE /api/projects/:id', export: 'GET /api/projects/:id/export' },
      health: '/api/health'
    }
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT NOW() as db_time');
    res.json({
      status: 'healthy',
      timestamp: nowISO(),
      db: 'connected',
      db_time: row.db_time,
      uptime: Math.floor(process.uptime()),
      memory: { heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }
    });
  } catch {
    res.status(503).json({ status: 'unhealthy', db: 'disconnected' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ service: 'SyncHub API', environment: process.env.NODE_ENV || 'development', node_version: process.version, platform: process.platform });
});

// ─── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName = '', nickname, email = '', password, gender = '', birthdate = '', role = '' } = req.body || {};

    if (!firstName || typeof firstName !== 'string' || !firstName.trim())
      return res.status(400).json({ success: false, message: 'Имя обязательно' });
    if (!nickname || typeof nickname !== 'string' || !nickname.trim())
      return res.status(400).json({ success: false, message: 'Никнейм обязателен' });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(nickname.trim()))
      return res.status(400).json({ success: false, message: 'Никнейм: 3–30 символов, только буквы, цифры и _' });

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    // Check nickname uniqueness
    const { rows: [existing] } = await pool.query(
      'SELECT id FROM users WHERE LOWER(nickname) = LOWER($1)', [nickname.trim()]
    );
    if (existing) return res.status(409).json({ success: false, message: 'Никнейм уже занят. Попробуйте другой.' });

    // Check email uniqueness
    if (email) {
      const { rows: [emailRow] } = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]
      );
      if (emailRow) return res.status(409).json({ success: false, message: 'Email уже используется' });
    }

    const userId = createId('usr');
    const token = createId('session');
    const now = nowISO();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    const userRole = (typeof role === 'string' && role.trim()) ? role.trim() : 'Участник';
    await pool.query(
      `INSERT INTO users (id, first_name, last_name, nickname, email, role, avatar, gender, birthdate, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'👤',$7,$8,$9,$10,$11)`,
      [userId, firstName.trim(), lastName, nickname.trim(), email, userRole, gender, birthdate, hashPassword(password), now, now]
    );
    await pool.query(
      'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1,$2,$3,$4)',
      [token, userId, expiresAt, now]
    );

    const { rows: [userRow] } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return res.status(201).json({ success: true, user: sanitizeUser(mapUser(userRow)), token });
  } catch (err) {
    console.error('[REGISTER ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { nickname, password } = req.body || {};

    if (!nickname || typeof nickname !== 'string')
      return res.status(400).json({ success: false, message: 'Укажите никнейм или email' });
    if (!password || typeof password !== 'string')
      return res.status(400).json({ success: false, message: 'Укажите пароль' });

    const { rows: [userRow] } = await pool.query(
      'SELECT * FROM users WHERE LOWER(nickname) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [nickname.trim()]
    );
    if (!userRow) return res.status(401).json({ success: false, message: 'Пользователь не найден' });

    if (!verifyPassword(password, userRow.password_hash))
      return res.status(401).json({ success: false, message: 'Неверный пароль' });

    const token = createId('session');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await pool.query(
      'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1,$2,$3,$4)',
      [token, userRow.id, expiresAt, nowISO()]
    );

    return res.json({ success: true, user: sanitizeUser(mapUser(userRow)), token });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка входа' });
  }
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

app.post('/api/auth/logout', authRequired, async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE token = $1', [req.sessionToken]);
    res.json({ success: true });
  } catch (err) {
    console.error('[LOGOUT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка выхода' });
  }
});

// ─── Users ─────────────────────────────────────────────────────────────────────

app.get('/api/users/me', authRequired, (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

app.patch('/api/users/me', authRequired, async (req, res) => {
  try {
    const { firstName, lastName, email, role, avatar, gender, birthdate } = req.body || {};

    if (email) {
      const { rows: [existing] } = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [email, req.user.id]
      );
      if (existing) return res.status(409).json({ success: false, message: 'Email уже используется' });
    }

    const u = req.user;
    const { rows: [updated] } = await pool.query(
      `UPDATE users SET
         first_name = $1, last_name = $2, email = $3, role = $4,
         avatar = $5, gender = $6, birthdate = $7, updated_at = $8
       WHERE id = $9 RETURNING *`,
      [
        firstName ?? u.firstName, lastName ?? u.lastName,
        email ?? u.email, role ?? u.role,
        avatar ?? u.avatar, gender ?? u.gender,
        birthdate ?? u.birthdate, nowISO(), u.id
      ]
    );
    res.json({ success: true, user: sanitizeUser(mapUser(updated)) });
  } catch (err) {
    console.error('[UPDATE USER ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка обновления профиля' });
  }
});

app.patch('/api/users/me/password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Укажите текущий и новый пароль' });

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    if (!verifyPassword(currentPassword, req.user.passwordHash))
      return res.status(401).json({ success: false, message: 'Текущий пароль неверен' });

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
      [hashPassword(newPassword), nowISO(), req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[CHANGE PASSWORD ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка смены пароля' });
  }
});

// ─── User search (for invite) ──────────────────────────────────────────────────

app.get('/api/users/search', authRequired, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    if (!q || q.length < 2) return res.json({ success: true, users: [] });
    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE (LOWER(nickname) LIKE $1 OR LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1)
         AND id != $2
       ORDER BY nickname LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json({ success: true, users: rows.map(u => toUserSummary(mapUser(u))) });
  } catch (err) {
    console.error('[SEARCH USERS ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка поиска пользователей' });
  }
});

// ─── Projects ──────────────────────────────────────────────────────────────────

app.get('/api/projects', authRequired, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE $1 = ANY(members) ORDER BY updated_at DESC',
      [req.user.id]
    );

    // Fetch all member users in one query
    const allMemberIds = [...new Set(rows.flatMap(p => p.members || []))];
    let usersMap = {};
    if (allMemberIds.length > 0) {
      const { rows: userRows } = await pool.query(
        'SELECT * FROM users WHERE id = ANY($1)', [allMemberIds]
      );
      usersMap = Object.fromEntries(userRows.map(u => [u.id, u]));
    }

    const projects = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      deadline: row.deadline,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
      members: (row.members || []).map(uid => {
        const u = usersMap[uid];
        return u ? toUserSummary(u) : { id: uid, nickname: 'Unknown', role: 'Участник', avatar: '👤' };
      }),
      mediaCount: (row.media_files || []).length,
      editsCount: (row.markers || []).length,
      commentsCount: (row.comments || []).length
    }));

    res.json({ success: true, projects });
  } catch (err) {
    console.error('[GET PROJECTS ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка загрузки проектов' });
  }
});

app.post('/api/projects', authRequired, async (req, res) => {
  try {
    const { name, description = '', deadline = '', timelineDuration = 205 } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim())
      return res.status(400).json({ success: false, message: 'Название проекта обязательно' });

    const id = createId('prj');
    const now = nowISO();
    const members = [req.user.id];

    const { rows: [row] } = await pool.query(
      `INSERT INTO projects (id, name, description, owner_id, members, deadline, timeline_duration,
         script_text, director_notes, body_silhouettes, storyboard_grid,
         makeup_looks, costume_outfits, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'','',
         '[{"id":1,"name":"Человек 1"}]'::jsonb,
         '{"locationNames":[],"columnCount":4,"cells":{}}'::jsonb,
         '[]'::jsonb, '[]'::jsonb, $8, $9)
       RETURNING *`,
      [id, name.trim().slice(0, 200), description.slice(0, 2000), req.user.id, members, deadline,
       normalizeTimelineDuration(timelineDuration), now, now]
    );

    res.status(201).json({ success: true, project: mapProject(row) });
  } catch (err) {
    console.error('[CREATE PROJECT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка создания проекта' });
  }
});

app.get('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    res.json({ success: true, project: mapProject(row) });
  } catch (err) {
    console.error('[GET PROJECT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка загрузки проекта' });
  }
});

app.patch('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const validation = validateProjectPatch(req.body || {});
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });

    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    const p = validation.patch;

    // Build SET clause dynamically from validated patch
    const fieldMap = {
      name: 'name', description: 'description', deadline: 'deadline',
      timelineDuration: 'timeline_duration', scriptText: 'script_text',
      directorNotes: 'director_notes', markers: 'markers',
      bodyMarkers: 'body_markers', bodySilhouettes: 'body_silhouettes',
      locations: 'locations', mediaFiles: 'media_files', documents: 'documents',
      comments: 'comments', scriptParams: 'script_params',
      storyboardGrid: 'storyboard_grid', tasks: 'tasks',
      makeupLooks: 'makeup_looks', costumeOutfits: 'costume_outfits',
      productionStage: 'production_stage', scenes: 'scenes', shootingDays: 'shooting_days',
      projectRoles: 'project_roles', projectKind: 'project_kind',
      audioTrackId: 'audio_track_id', musicTimeline: 'music_timeline'
    };

    const sets = ['updated_at = NOW()'];
    const values = [];
    let idx = 1;

    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (camel in p) {
        const val = p[camel];
        sets.push(`${snake} = $${idx++}`);
        values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
    }

    values.push(req.params.id);
    const { rows: [updated] } = await pool.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json({ success: true, project: mapProject(updated) });
  } catch (err) {
    console.error('[UPDATE PROJECT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка обновления проекта' });
  }
});

app.delete('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT owner_id FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (row.owner_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Удалять проекты может только владелец' });

    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE PROJECT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка удаления проекта' });
  }
});

// ─── Project members ───────────────────────────────────────────────────────────

app.post('/api/projects/:id/members', authRequired, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId || typeof userId !== 'string')
      return res.status(400).json({ success: false, message: 'userId обязателен' });

    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (row.owner_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Только владелец может добавлять участников' });

    const { rows: [targetUser] } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Пользователь не найден' });

    const members = row.members || [];
    if (members.includes(userId))
      return res.status(409).json({ success: false, message: 'Пользователь уже в команде' });

    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET members = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [[...members, userId], req.params.id]
    );
    res.json({ success: true, project: mapProject(updated) });
  } catch (err) {
    console.error('[ADD MEMBER ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка добавления участника' });
  }
});

app.delete('/api/projects/:id/members/:userId', authRequired, async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (row.owner_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Только владелец может удалять участников' });

    const targetId = req.params.userId;
    if (targetId === row.owner_id)
      return res.status(400).json({ success: false, message: 'Нельзя удалить владельца из проекта' });

    const newMembers = (row.members || []).filter(id => id !== targetId);
    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET members = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newMembers, req.params.id]
    );
    res.json({ success: true, project: mapProject(updated) });
  } catch (err) {
    console.error('[REMOVE MEMBER ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка удаления участника' });
  }
});

// Set the calling user's role within a specific project. Chosen once on first entry.
// Owner can later re-assign via the same endpoint (treated as administrative override).
app.put('/api/projects/:id/role', authRequired, async (req, res) => {
  try {
    const { role } = req.body || {};
    const ALLOWED = ['Сценарист','Режиссёр','Костюмер','Визажист','Монтажёр','Звукорежиссёр','Менеджер'];
    if (!role || typeof role !== 'string' || !ALLOWED.includes(role))
      return res.status(400).json({ success: false, message: 'Недопустимая роль для проекта' });

    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Вы не участник проекта' });

    const roles = row.project_roles || {};
    // Owner can overwrite anyone's role; participants can only set their own once
    if (roles[req.user.id] && row.owner_id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Роль уже выбрана — обратитесь к владельцу' });
    }
    roles[req.user.id] = role;

    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET project_roles = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [roles, req.params.id]
    );
    res.json({ success: true, project: mapProject(updated) });
  } catch (err) {
    console.error('[SET PROJECT ROLE ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка установки роли' });
  }
});

app.get('/api/projects/:id/export', authRequired, async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    res.json({ success: true, exportedAt: nowISO(), project: mapProject(row) });
  } catch (err) {
    console.error('[EXPORT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка экспорта' });
  }
});

// ─── Media: upload ─────────────────────────────────────────────────────────────
app.post('/api/projects/:id/media/upload', authRequired, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Ошибка загрузки: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Файл не получен' });

    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    const mimeType = req.file.mimetype;
    const type = mimeType.startsWith('video/') ? 'video' : 'audio';
    const sizeBytes = req.file.size;
    const sizeMB = sizeBytes < 1024 * 1024
      ? `${(sizeBytes / 1024).toFixed(0)} KB`
      : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

    const mediaFile = {
      id: Date.now(),
      name: req.file.originalname,
      type,
      duration: req.body.duration || '—',
      size: sizeMB,
      url: `/uploads/${req.params.id}/${req.file.filename}`
    };

    const existingFiles = row.media_files || [];
    const updatedFiles = [...existingFiles, mediaFile];

    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET media_files = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(updatedFiles), req.params.id]
    );

    res.json({ success: true, mediaFile, project: mapProject(updated) });
  } catch (err) {
    console.error('[UPLOAD MEDIA ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка сохранения файла' });
  }
});

// ─── Media: delete ─────────────────────────────────────────────────────────────
app.delete('/api/projects/:id/media/:mediaId', authRequired, async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    const mediaId = Number(req.params.mediaId);
    const existing = row.media_files || [];
    const target = existing.find(f => f.id === mediaId);

    // Delete file from disk
    if (target?.url) {
      const filePath = path.join(__dirname, 'public', target.url);
      fs.rm(filePath, { force: true }, () => {});
    }

    const updatedFiles = existing.filter(f => f.id !== mediaId);
    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET media_files = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(updatedFiles), req.params.id]
    );

    res.json({ success: true, project: mapProject(updated) });
  } catch (err) {
    console.error('[DELETE MEDIA ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка удаления файла' });
  }
});

// ─── Documents: upload ────────────────────────────────────────────────────────
app.post('/api/projects/:id/documents/upload', authRequired, (req, res, next) => {
  uploadDoc.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Ошибка загрузки: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Файл не получен' });

    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const docType = DOC_EXT_TO_TYPE[ext] || 'other';
    const sizeBytes = req.file.size;
    const sizeFmt = sizeBytes < 1024 * 1024
      ? `${(sizeBytes / 1024).toFixed(0)} KB`
      : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

    const document = {
      id: Date.now(),
      name: req.file.originalname,
      size: sizeFmt,
      type: docType,
      uploadedBy: req.user.nickname,
      uploadedAt: new Date().toLocaleDateString('ru-RU'),
      url: `/uploads/${req.params.id}/docs/${req.file.filename}`
    };

    const existingDocs = row.documents || [];
    const updatedDocs = [...existingDocs, document];

    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET documents = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(updatedDocs), req.params.id]
    );

    res.json({ success: true, document, project: mapProject(updated) });
  } catch (err) {
    console.error('[UPLOAD DOC ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка сохранения документа' });
  }
});

// ─── Script: upload (PDF/DOC/TXT → scriptParams.scriptFile.url) ───────────────
const uploadScriptFile = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(UPLOAD_DIR, req.params.id || 'tmp', 'scripts');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}_${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: UPLOAD_DOC_MAX_BYTES }
});

app.post('/api/projects/:id/script/upload', authRequired, (req, res, next) => {
  uploadScriptFile.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ success: false, message: `Ошибка загрузки: ${err.message}` });
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Файл не получен' });

    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    const ext = path.extname(req.file.originalname).toLowerCase().replace(/^\./, '');
    const sizeBytes = req.file.size;
    const sizeFmt = sizeBytes < 1024 * 1024
      ? `${(sizeBytes / 1024).toFixed(0)} KB`
      : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

    const scriptFile = {
      name: req.file.originalname,
      type: ext || 'file',
      size: sizeFmt,
      url:  `/uploads/${req.params.id}/scripts/${req.file.filename}`
    };

    const params = row.script_params || {};
    params.scriptFile = scriptFile;

    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET script_params = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(params), req.params.id]
    );
    res.json({ success: true, scriptFile, project: mapProject(updated) });
  } catch (err) {
    console.error('[UPLOAD SCRIPT ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка сохранения сценария' });
  }
});

// ─── Documents: delete ─────────────────────────────────────────────────────────
app.delete('/api/projects/:id/documents/:docId', authRequired, async (req, res) => {
  try {
    const { rows: [row] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, message: 'Проект не найден' });
    if (!(row.members || []).includes(req.user.id))
      return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });

    const docId = Number(req.params.docId);
    const existing = row.documents || [];
    const target = existing.find(d => d.id === docId);

    if (target?.url) {
      const filePath = path.join(__dirname, 'public', target.url);
      fs.rm(filePath, { force: true }, () => {});
    }

    const updatedDocs = existing.filter(d => d.id !== docId);
    const { rows: [updated] } = await pool.query(
      'UPDATE projects SET documents = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(updatedDocs), req.params.id]
    );

    res.json({ success: true, project: mapProject(updated) });
  } catch (err) {
    console.error('[DELETE DOC ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Ошибка удаления документа' });
  }
});

// ─── Swagger UI ────────────────────────────────────────────────────────────────
app.get('/api/docs', (req, res, next) => {
  if (!req.originalUrl.endsWith('/')) return res.redirect(301, '/api/docs/');
  next();
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, {
  customSiteTitle: 'SyncHub API Docs',
  swaggerOptions: { persistAuthorization: true }
}));

// ─── 404 / Error handlers ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint не найден', path: req.url });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}`, err);
  res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
});

// ─── Startup ───────────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  // Verify DB connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }

  await cleanExpiredSessions();
  setInterval(cleanExpiredSessions, 60 * 60 * 1000);

  console.log('═'.repeat(60));
  console.log('🚀 SyncHub AV Pipeline Server v3.0.0');
  console.log('═'.repeat(60));
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`🐘 База данных: PostgreSQL`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log('═'.repeat(60));
});

server.on('error', (err) => { console.error('[SERVER ERROR]', err); });
process.on('SIGTERM', () => { server.close(() => { pool.end(); process.exit(0); }); });
process.on('SIGINT', () => { server.close(() => { pool.end(); process.exit(0); }); });
process.on('uncaughtException', (err) => { console.error('[UNCAUGHT]', err); });
process.on('unhandledRejection', (reason) => { console.error('[UNHANDLED]', reason); });
