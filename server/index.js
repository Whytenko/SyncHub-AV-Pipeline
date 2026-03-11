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
const normalizeTimelineDuration = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 205;
  return Math.max(1, Math.floor(parsed));
};
const PROJECT_TAB_IDS = new Set(['edit', 'script', 'director', 'costumes', 'makeup']);
const MEDIA_TYPES = new Set(['audio', 'video', 'other']);

const isObjectRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const toNonNegativeInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};
const toPositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const normalizeComment = (value) => {
  if (!isObjectRecord(value)) return null;
  const id = toPositiveInt(value.id);
  if (!id) return null;
  if (typeof value.tabId !== 'string' || !PROJECT_TAB_IDS.has(value.tabId)) return null;
  if (typeof value.user !== 'string') return null;
  if (typeof value.text !== 'string') return null;
  if (typeof value.timestamp !== 'string') return null;
  if (hasOwn(value, 'resolved') && typeof value.resolved !== 'boolean') return null;

  return {
    id,
    tabId: value.tabId,
    user: value.user,
    text: value.text,
    timestamp: value.timestamp,
    resolved: Boolean(value.resolved)
  };
};

const validateProjectPatch = (payload) => {
  if (!isObjectRecord(payload)) {
    return { error: 'Некорректный формат данных проекта' };
  }

  const patch = {};

  if (hasOwn(payload, 'name')) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      return { error: 'Название проекта должно быть непустой строкой' };
    }
    patch.name = payload.name.trim();
  }

  if (hasOwn(payload, 'description')) {
    if (typeof payload.description !== 'string') {
      return { error: 'Описание проекта должно быть строкой' };
    }
    patch.description = payload.description;
  }

  if (hasOwn(payload, 'deadline')) {
    if (typeof payload.deadline !== 'string') {
      return { error: 'Дедлайн проекта должен быть строкой' };
    }
    patch.deadline = payload.deadline;
  }

  if (hasOwn(payload, 'timelineDuration')) {
    patch.timelineDuration = normalizeTimelineDuration(payload.timelineDuration);
  }

  if (hasOwn(payload, 'scriptText')) {
    if (typeof payload.scriptText !== 'string') {
      return { error: 'Текст сценария должен быть строкой' };
    }
    patch.scriptText = payload.scriptText;
  }

  if (hasOwn(payload, 'directorNotes')) {
    if (typeof payload.directorNotes !== 'string') {
      return { error: 'Заметки режиссера должны быть строкой' };
    }
    patch.directorNotes = payload.directorNotes;
  }

  if (hasOwn(payload, 'markers')) {
    if (!Array.isArray(payload.markers)) {
      return { error: 'Маркеры должны быть массивом' };
    }
    const normalizedMarkers = [];
    for (const marker of payload.markers) {
      if (!isObjectRecord(marker)) return { error: 'Некорректный формат маркера' };
      const id = toPositiveInt(marker.id);
      const time = toNonNegativeInt(marker.time);
      if (!id || time === null) return { error: 'Некорректные id/time у маркера' };
      if (typeof marker.color !== 'string') return { error: 'Некорректный color у маркера' };
      if (typeof marker.title !== 'string') return { error: 'Некорректный title у маркера' };
      if (typeof marker.user !== 'string') return { error: 'Некорректный user у маркера' };
      if (typeof marker.icon !== 'string') return { error: 'Некорректный icon у маркера' };
      if (typeof marker.tabId !== 'string' || !PROJECT_TAB_IDS.has(marker.tabId)) {
        return { error: 'Некорректный tabId у маркера' };
      }
      const markerComment =
        typeof marker.comment === 'string' && marker.comment.trim().length > 0
          ? marker.comment.trim()
          : marker.title.trim();
      if (!markerComment) {
        return { error: 'Комментарий маркера должен быть непустой строкой' };
      }
      normalizedMarkers.push({
        id,
        time,
        color: marker.color,
        title: marker.title,
        comment: markerComment,
        user: marker.user,
        icon: marker.icon,
        tabId: marker.tabId
      });
    }
    patch.markers = normalizedMarkers;
  }

  if (hasOwn(payload, 'bodySilhouettes')) {
    if (!Array.isArray(payload.bodySilhouettes)) {
      return { error: 'Силуэты должны быть массивом' };
    }
    const normalizedSilhouettes = [];
    for (const silhouette of payload.bodySilhouettes) {
      if (!isObjectRecord(silhouette)) return { error: 'Некорректный формат силуэта' };
      const id = toPositiveInt(silhouette.id);
      if (!id || typeof silhouette.name !== 'string' || !silhouette.name.trim()) {
        return { error: 'Некорректные данные силуэта' };
      }
      normalizedSilhouettes.push({ id, name: silhouette.name.trim() });
    }
    patch.bodySilhouettes = normalizedSilhouettes;
  }

  if (hasOwn(payload, 'bodyMarkers')) {
    if (!Array.isArray(payload.bodyMarkers)) {
      return { error: 'Маркерные точки тела должны быть массивом' };
    }
    const normalizedBodyMarkers = [];
    for (const marker of payload.bodyMarkers) {
      if (!isObjectRecord(marker)) return { error: 'Некорректный формат body-маркера' };
      const id = toPositiveInt(marker.id);
      const markerTime = hasOwn(marker, 'time') ? toNonNegativeInt(marker.time) : 0;
      const x = Number(marker.x);
      const y = Number(marker.y);
      if (!id || markerTime === null || !Number.isFinite(x) || !Number.isFinite(y)) {
        return { error: 'Некорректные координаты body-маркера' };
      }
      if (typeof marker.title !== 'string') return { error: 'Некорректный title body-маркера' };
      if (typeof marker.description !== 'string') return { error: 'Некорректный description body-маркера' };
      if (typeof marker.bodyPart !== 'string') return { error: 'Некорректный bodyPart body-маркера' };
      if (typeof marker.color !== 'string') return { error: 'Некорректный color body-маркера' };
      if (typeof marker.tabId !== 'string' || !PROJECT_TAB_IDS.has(marker.tabId)) {
        return { error: 'Некорректный tabId body-маркера' };
      }
      if (!Array.isArray(marker.images) || !marker.images.every((item) => typeof item === 'string')) {
        return { error: 'Некорректный список изображений body-маркера' };
      }
      if (!Array.isArray(marker.comments)) {
        return { error: 'Некорректный список комментариев body-маркера' };
      }
      const normalizedComments = [];
      for (const comment of marker.comments) {
        const normalizedComment = normalizeComment(comment);
        if (!normalizedComment) return { error: 'Некорректный комментарий body-маркера' };
        normalizedComments.push(normalizedComment);
      }
      const personId = hasOwn(marker, 'personId') ? toPositiveInt(marker.personId) : null;
      if (hasOwn(marker, 'personId') && !personId) return { error: 'Некорректный personId body-маркера' };
      normalizedBodyMarkers.push({
        id,
        time: markerTime,
        x: Math.min(100, Math.max(0, x)),
        y: Math.min(100, Math.max(0, y)),
        title: marker.title,
        description: marker.description,
        bodyPart: marker.bodyPart,
        images: marker.images,
        comments: normalizedComments,
        color: marker.color,
        tabId: marker.tabId,
        ...(personId ? { personId } : {})
      });
    }
    patch.bodyMarkers = normalizedBodyMarkers;
  }

  if (hasOwn(payload, 'locations')) {
    if (!Array.isArray(payload.locations)) {
      return { error: 'Локации должны быть массивом' };
    }
    const normalizedLocations = [];
    for (const location of payload.locations) {
      if (!isObjectRecord(location)) return { error: 'Некорректный формат локации' };
      const id = toPositiveInt(location.id);
      if (!id || typeof location.name !== 'string' || typeof location.description !== 'string') {
        return { error: 'Некорректные данные локации' };
      }
      if (!Array.isArray(location.shots)) return { error: 'Кадры локации должны быть массивом' };
      const normalizedShots = [];
      for (const shot of location.shots) {
        if (!isObjectRecord(shot)) return { error: 'Некорректный формат кадра' };
        const shotId = toPositiveInt(shot.id);
        const shotTime = toNonNegativeInt(shot.time);
        if (!shotId || shotTime === null) return { error: 'Некорректные id/time кадра' };
        if (typeof shot.title !== 'string' || typeof shot.description !== 'string' || typeof shot.image !== 'string') {
          return { error: 'Некорректные данные кадра' };
        }
        normalizedShots.push({
          id: shotId,
          time: shotTime,
          title: shot.title,
          description: shot.description,
          image: shot.image
        });
      }
      normalizedLocations.push({
        id,
        name: location.name,
        description: location.description,
        shots: normalizedShots
      });
    }
    patch.locations = normalizedLocations;
  }

  if (hasOwn(payload, 'mediaFiles')) {
    if (!Array.isArray(payload.mediaFiles)) {
      return { error: 'Медиафайлы должны быть массивом' };
    }
    const normalizedMediaFiles = [];
    for (const file of payload.mediaFiles) {
      if (!isObjectRecord(file)) return { error: 'Некорректный формат медиафайла' };
      const id = toPositiveInt(file.id);
      if (!id) return { error: 'Некорректный id медиафайла' };
      if (typeof file.name !== 'string' || typeof file.duration !== 'string' || typeof file.size !== 'string') {
        return { error: 'Некорректные данные медиафайла' };
      }
      if (typeof file.type !== 'string' || !MEDIA_TYPES.has(file.type)) {
        return { error: 'Некорректный тип медиафайла' };
      }
      normalizedMediaFiles.push({
        id,
        name: file.name,
        type: file.type,
        duration: file.duration,
        size: file.size
      });
    }
    patch.mediaFiles = normalizedMediaFiles;
  }

  if (hasOwn(payload, 'documents')) {
    if (!Array.isArray(payload.documents)) {
      return { error: 'Документы должны быть массивом' };
    }
    const normalizedDocuments = [];
    for (const document of payload.documents) {
      if (!isObjectRecord(document)) return { error: 'Некорректный формат документа' };
      const id = toPositiveInt(document.id);
      if (!id) return { error: 'Некорректный id документа' };
      if (
        typeof document.name !== 'string' ||
        typeof document.size !== 'string' ||
        typeof document.uploadedBy !== 'string' ||
        typeof document.uploadedAt !== 'string' ||
        typeof document.type !== 'string'
      ) {
        return { error: 'Некорректные данные документа' };
      }
      normalizedDocuments.push({
        id,
        name: document.name,
        size: document.size,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.uploadedAt,
        type: document.type
      });
    }
    patch.documents = normalizedDocuments;
  }

  if (hasOwn(payload, 'comments')) {
    if (!Array.isArray(payload.comments)) {
      return { error: 'Комментарии должны быть массивом' };
    }
    const normalizedComments = [];
    for (const comment of payload.comments) {
      const normalizedComment = normalizeComment(comment);
      if (!normalizedComment) return { error: 'Некорректный формат комментария' };
      normalizedComments.push(normalizedComment);
    }
    patch.comments = normalizedComments;
  }

  return { patch };
};

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
  const { name, description = '', deadline = '', timelineDuration = 205 } = req.body || {};
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
