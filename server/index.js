const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const {
  readDb,
  updateDb,
  createId,
  nowISO,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  cleanExpiredSessions,
  backupDb
} = require('./src/db');
const {
  validatePassword,
  validateProjectPatch,
  PROJECT_TAB_IDS,
  MEDIA_TYPES
} = require('./src/validate');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

// ─── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ─── Body parsing with size limit ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Слишком много попыток. Подождите 15 минут.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Слишком много запросов. Попробуйте позже.' }
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

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
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getTokenFromReq = (req) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer') return null;
  return token;
};

const authRequired = (req, res, next) => {
  const token = getTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Требуется авторизация' });
  }

  const db = readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Сессия недействительна или истекла' });
  }

  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    return res.status(401).json({ success: false, message: 'Сессия истекла. Войдите снова' });
  }

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Пользователь не найден' });
  }

  req.user = user;
  req.session = session;
  req.db = db;
  next();
};

// ─── Domain helpers ────────────────────────────────────────────────────────────
const toUserSummary = (user) => ({
  id: user.id,
  nickname: user.nickname,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  avatar: user.avatar
});

const isProjectMember = (project, userId) => project.members.includes(userId);

// ─── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎬 SyncHub AV Pipeline API',
    version: '2.1.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      users: {
        me: 'GET /api/users/me',
        update: 'PATCH /api/users/me',
        password: 'PATCH /api/users/me/password'
      },
      projects: {
        list: 'GET /api/projects',
        create: 'POST /api/projects',
        get: 'GET /api/projects/:id',
        update: 'PATCH /api/projects/:id',
        remove: 'DELETE /api/projects/:id',
        export: 'GET /api/projects/:id/export'
      },
      health: '/api/health',
      status: '/api/status'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: nowISO(),
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    service: 'SyncHub API',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    platform: process.platform
  });
});

// ─── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName = '', nickname, email = '', password, gender = '', birthdate = '' } = req.body || {};

  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    return res.status(400).json({ success: false, message: 'Имя обязательно' });
  }
  if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
    return res.status(400).json({ success: false, message: 'Никнейм обязателен' });
  }
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(nickname.trim())) {
    return res.status(400).json({ success: false, message: 'Никнейм: 3–30 символов, только буквы, цифры и _' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  const db = readDb();
  const nicknameExists = db.users.some((user) => user.nickname.toLowerCase() === nickname.trim().toLowerCase());
  if (nicknameExists) {
    return res.status(409).json({ success: false, message: 'Никнейм уже занят. Попробуйте другой.' });
  }

  if (email) {
    const emailExists = db.users.some((user) => user.email && user.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email уже используется' });
    }
  }

  const createdAt = nowISO();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const user = {
    id: createId('usr'),
    firstName: firstName.trim(),
    lastName,
    nickname: nickname.trim(),
    email,
    role: 'Участник',
    avatar: '👤',
    gender,
    birthdate,
    passwordHash: hashPassword(password),
    createdAt,
    updatedAt: createdAt
  };

  const token = createId('session');

  db.users.push(user);
  db.sessions.push({ token, userId: user.id, createdAt, expiresAt });
  updateDb(() => db);

  return res.status(201).json({
    success: true,
    user: sanitizeUser(user),
    token
  });
});

app.post('/api/auth/login', (req, res) => {
  const { nickname, password } = req.body || {};

  if (!nickname || typeof nickname !== 'string') {
    return res.status(400).json({ success: false, message: 'Укажите никнейм или email' });
  }

  const db = readDb();
  const user = db.users.find(
    (item) => item.nickname.toLowerCase() === nickname.trim().toLowerCase() || item.email === nickname.trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, message: 'Пользователь не найден' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Укажите пароль' });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Неверный пароль' });
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const token = createId('session');
  db.sessions.push({ token, userId: user.id, createdAt: nowISO(), expiresAt });
  updateDb(() => db);

  return res.json({
    success: true,
    user: sanitizeUser(user),
    token
  });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

app.post('/api/auth/logout', authRequired, (req, res) => {
  updateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.token !== req.session.token);
    return db;
  });
  res.json({ success: true });
});

// ─── Users ─────────────────────────────────────────────────────────────────────

app.get('/api/users/me', authRequired, (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

app.patch('/api/users/me', authRequired, (req, res) => {
  const { firstName, lastName, email, role, avatar, gender, birthdate } = req.body || {};

  if (email) {
    const db = readDb();
    const emailExists = db.users.some((user) => user.email && user.email.toLowerCase() === email.toLowerCase() && user.id !== req.user.id);
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email уже используется' });
    }
  }

  const updatedDb = updateDb((db) => {
    const userIndex = db.users.findIndex((item) => item.id === req.user.id);
    if (userIndex === -1) return db;
    const current = db.users[userIndex];

    db.users[userIndex] = {
      ...current,
      firstName: firstName ?? current.firstName,
      lastName: lastName ?? current.lastName,
      email: email ?? current.email,
      role: role ?? current.role,
      avatar: avatar ?? current.avatar,
      gender: gender ?? current.gender,
      birthdate: birthdate ?? current.birthdate,
      updatedAt: nowISO()
    };
    return db;
  });

  const user = updatedDb.users.find((item) => item.id === req.user.id);
  res.json({ success: true, user: sanitizeUser(user) });
});

app.patch('/api/users/me/password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Укажите текущий и новый пароль' });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  if (!verifyPassword(currentPassword, req.user.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Текущий пароль неверен' });
  }

  updateDb((db) => {
    const userIndex = db.users.findIndex((item) => item.id === req.user.id);
    if (userIndex === -1) return db;
    db.users[userIndex].passwordHash = hashPassword(newPassword);
    db.users[userIndex].updatedAt = nowISO();
    return db;
  });

  res.json({ success: true });
});

// ─── Projects ──────────────────────────────────────────────────────────────────

app.get('/api/projects', authRequired, (req, res) => {
  const db = readDb();
  const projects = db.projects
    .filter((project) => isProjectMember(project, req.user.id))
    .map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      members: project.members.map((userId) => {
        const user = db.users.find((item) => item.id === userId);
        return user ? toUserSummary(user) : { id: userId, nickname: 'Unknown', role: 'Участник', avatar: '👤' };
      }),
      mediaCount: project.mediaFiles.length,
      editsCount: project.markers.length,
      commentsCount: project.comments.length
    }));

  res.json({ success: true, projects });
});

app.post('/api/projects', authRequired, (req, res) => {
  const { name, description = '', deadline = '', timelineDuration = 205 } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Название проекта обязательно' });
  }

  const createdAt = nowISO();
  const project = {
    id: createId('prj'),
    name: name.trim().slice(0, 200),
    description: (description || '').slice(0, 2000),
    ownerId: req.user.id,
    members: [req.user.id],
    deadline,
    timelineDuration: normalizeTimelineDuration(timelineDuration),
    createdAt,
    updatedAt: createdAt,
    scriptText: '',
    directorNotes: '',
    markers: [],
    bodyMarkers: [],
    bodySilhouettes: [{ id: 1, name: 'Человек 1' }],
    locations: [],
    mediaFiles: [],
    documents: [],
    comments: [],
    scriptParams: null,
    storyboardGrid: { locationNames: [], columnCount: 4, cells: {} },
    makeupLooks: [],
    costumeOutfits: []
  };

  updateDb((db) => {
    db.projects.push(project);
    return db;
  });

  res.status(201).json({ success: true, project });
});

app.get('/api/projects/:id', authRequired, (req, res) => {
  const db = readDb();
  const project = db.projects.find((item) => item.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Проект не найден' });
  }
  if (!isProjectMember(project, req.user.id)) {
    return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });
  }

  res.json({ success: true, project });
});

app.patch('/api/projects/:id', authRequired, (req, res) => {
  const validation = validateProjectPatch(req.body || {});
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  const db = readDb();
  const existingProject = db.projects.find((item) => item.id === req.params.id);
  if (!existingProject) {
    return res.status(404).json({ success: false, message: 'Проект не найден' });
  }
  if (!isProjectMember(existingProject, req.user.id)) {
    return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });
  }

  const updatedDb = updateDb((current) => {
    const projectIndex = current.projects.findIndex((item) => item.id === req.params.id);
    if (projectIndex === -1) return current;
    const project = current.projects[projectIndex];

    current.projects[projectIndex] = {
      ...project,
      ...validation.patch,
      updatedAt: nowISO()
    };
    return current;
  });

  const project = updatedDb.projects.find((item) => item.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Проект не найден' });
  }

  res.json({ success: true, project });
});

app.delete('/api/projects/:id', authRequired, (req, res) => {
  const db = readDb();
  const project = db.projects.find((item) => item.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Проект не найден' });
  }
  if (project.ownerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Удалять проекты может только владелец' });
  }

  updateDb((current) => {
    current.projects = current.projects.filter((item) => item.id !== req.params.id);
    return current;
  });

  res.json({ success: true });
});

app.get('/api/projects/:id/export', authRequired, (req, res) => {
  const db = readDb();
  const project = db.projects.find((item) => item.id === req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Проект не найден' });
  }
  if (!isProjectMember(project, req.user.id)) {
    return res.status(403).json({ success: false, message: 'Недостаточно прав доступа' });
  }

  res.json({
    success: true,
    exportedAt: nowISO(),
    project
  });
});

// ─── 404 fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint не найден',
    path: req.url
  });
});

// ─── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}`, err);
  res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
});

// ─── Startup ───────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  cleanExpiredSessions();
  backupDb();
  // Periodic backup every 5 minutes
  setInterval(() => backupDb(), 5 * 60 * 1000);
  // Periodic session cleanup every hour
  setInterval(() => cleanExpiredSessions(), 60 * 60 * 1000);
  console.log('═'.repeat(60));
  console.log('🚀 SyncHub AV Pipeline Server v2.1.0');
  console.log('═'.repeat(60));
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('═'.repeat(60));
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
