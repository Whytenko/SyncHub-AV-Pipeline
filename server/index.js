const express = require('express');
const {
  readDb,
  updateDb,
  createId,
  nowISO,
  hashPassword,
  verifyPassword,
  sanitizeUser
} = require('./src/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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
    return res.status(401).json({ success: false, message: 'Сессия недействительна' });
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

const toUserSummary = (user) => ({
  id: user.id,
  nickname: user.nickname,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  avatar: user.avatar
});

const isProjectMember = (project, userId) => project.members.includes(userId);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎬 SyncHub AV Pipeline API',
    version: '2.0.0',
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
    uptime: process.uptime(),
    memory: process.memoryUsage()
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

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName = '', nickname, email = '', password, gender = '', birthdate = '' } = req.body || {};

  const safeFirstName = firstName || 'User';
  const safeNickname = nickname || `user_${Math.floor(Math.random() * 10000)}`;
  const safePassword = password || 'password';

  const db = readDb();
  const nicknameExists = db.users.some((user) => user.nickname.toLowerCase() === safeNickname.toLowerCase());
  if (nicknameExists) {
    // dev mode: allow duplicates by appending suffix
    const suffix = Math.floor(Math.random() * 1000);
    return res.status(409).json({ success: false, message: `Никнейм уже используется. Попробуйте ${safeNickname}${suffix}` });
  }

  if (email) {
    const emailExists = db.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email уже используется' });
    }
  }

  const createdAt = nowISO();
  const user = {
    id: createId('usr'),
    firstName: safeFirstName,
    lastName,
    nickname: safeNickname,
    email,
    role: 'Участник',
    avatar: '👤',
    gender,
    birthdate,
    passwordHash: hashPassword(safePassword),
    createdAt,
    updatedAt: createdAt
  };

  const token = createId('session');

  db.users.push(user);
  db.sessions.push({ token, userId: user.id, createdAt });
  updateDb(() => db);

  return res.status(201).json({
    success: true,
    user: sanitizeUser(user),
    token
  });
});

app.post('/api/auth/login', (req, res) => {
  const { nickname, password } = req.body || {};
  const safeNickname = nickname || 'demo';

  const db = readDb();
  let user = db.users.find((item) => item.nickname.toLowerCase() === safeNickname.toLowerCase() || item.email === safeNickname);
  if (!user) {
    // dev mode: auto-create user on first login
    const createdAt = nowISO();
    user = {
      id: createId('usr'),
      firstName: 'User',
      lastName: '',
      nickname: safeNickname,
      email: '',
      role: 'Участник',
      avatar: '👤',
      gender: '',
      birthdate: '',
      passwordHash: hashPassword(password || 'password'),
      createdAt,
      updatedAt: createdAt
    };
    db.users.push(user);
  }

  const token = createId('session');
  db.sessions.push({ token, userId: user.id, createdAt: nowISO() });
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

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Пароль должен быть не короче 6 символов' });
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
  const { name, description = '', deadline = '' } = req.body || {};
  if (!name) {
    return res.status(400).json({ success: false, message: 'Название проекта обязательно' });
  }

  const createdAt = nowISO();
  const project = {
    id: createId('prj'),
    name,
    description,
    ownerId: req.user.id,
    members: [req.user.id],
    deadline,
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
    comments: []
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
  const allowedFields = [
    'name',
    'description',
    'deadline',
    'scriptText',
    'directorNotes',
    'markers',
    'bodyMarkers',
    'bodySilhouettes',
    'locations',
    'mediaFiles',
    'documents',
    'comments'
  ];

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

    const patch = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        patch[field] = req.body[field];
      }
    }

    current.projects[projectIndex] = {
      ...project,
      ...patch,
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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.url
  });
});

const server = app.listen(PORT, () => {
  console.log('═'.repeat(60));
  console.log('🚀 SyncHub AV Pipeline Server');
  console.log('═'.repeat(60));
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Status: http://localhost:${PORT}/api/status`);
  console.log('⚡ Режим: ' + (process.env.NODE_ENV || 'development'));
  console.log('═'.repeat(60));
  console.log('Press Ctrl+C to stop\\n');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('close', () => {
  console.log('Server closed');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\\nSIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
