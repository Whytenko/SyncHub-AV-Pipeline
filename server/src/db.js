const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const nowISO = () => new Date().toISOString();

const createId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, hash] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
};

const createSeedData = () => {
  const createdAt = nowISO();
  const demoUserId = createId('usr');

  const demoUser = {
    id: demoUserId,
    firstName: 'Демо',
    lastName: 'Пользователь',
    nickname: 'demo',
    email: 'demo@example.com',
    role: 'Режиссёр',
    avatar: '🎬',
    gender: 'male',
    birthdate: '1996-04-12',
    passwordHash: hashPassword('demo1234'),
    createdAt,
    updatedAt: createdAt
  };

  const demoProjectId = createId('prj');

  const demoProject = {
    id: demoProjectId,
    name: 'Арт-хаус видео',
    description: 'Тестовый проект для демонстрации возможностей SyncHub.',
    ownerId: demoUserId,
    members: [demoUserId],
    deadline: '2026-11-07',
    timelineDuration: 205,
    createdAt,
    updatedAt: createdAt,
    scriptText: `СЦЕНА 1\nИНТ. КВАРТИРА - ДЕНЬ\n\nАЛЕКС (30) входит в комнату. Он выглядит уставшим.\n\n[Маркер: Диалог персонажа]\nАЛЕКС\nЯ не думал, что все так сложится...\n\nСОФИЯ (28) сидит на диване, смотрит в окно.\n\nСОФИЯ\nТы всегда так говоришь.`,
    directorNotes: '• Важно передать эмоции персонажа в диалоге\n• Свет должен быть мягким, рассеянным\n• Звук дождя на улице должен быть натуральным',
    markers: [
      { id: 1, time: 25, color: '#FF391A', title: 'Начало кадра', comment: 'Добавить мягкий переход в начале сцены', user: 'Режиссёр', icon: 'director', tabId: 'edit' },
      { id: 2, time: 85, color: '#08B0D9', title: 'Музыкальный вход', comment: 'Ввести основной музыкальный мотив тише на 2 дБ', user: 'Композитор', icon: 'script', tabId: 'edit' },
      { id: 3, time: 150, color: '#08D95F', title: 'Изменение сцены', comment: 'Сделать склейку по движению для плавного перехода', user: 'Монтажёр', icon: 'makeup', tabId: 'edit' },
      { id: 4, time: 45, color: '#9C27B0', title: 'Диалог персонажа', comment: 'Усилить драматизм реплики короткой паузой', user: 'Сценарист', icon: 'script', tabId: 'script' },
      { id: 5, time: 60, color: '#2196F3', title: 'Смена плана', comment: 'Перейти на крупный план лица главного героя', user: 'Режиссер', icon: 'director', tabId: 'director' },
      { id: 6, time: 30, color: '#FF9800', title: 'Смена костюма', comment: 'Заменить пиджак на более темный для контраста', user: 'Костюмер', icon: 'costumes', tabId: 'costumes' },
      { id: 7, time: 40, color: '#E91E63', title: 'Макияж лица', comment: 'Добавить немного матирующей пудры в Т-зоне', user: 'Визажист', icon: 'makeup', tabId: 'makeup' }
    ],
    bodyMarkers: [
      { id: 1, time: 30, x: 50, y: 20, title: 'Костюм персонажа', description: 'Черный пиджак, белая рубашка', bodyPart: 'torso', images: [], comments: [], color: '#FF9800', tabId: 'costumes' },
      { id: 2, time: 36, x: 50, y: 40, title: 'Обувь', description: 'Кожаные туфли', bodyPart: 'feet', images: [], comments: [], color: '#FF9800', tabId: 'costumes' },
      { id: 3, time: 40, x: 50, y: 25, title: 'Дневной макияж', description: 'Естественные тона, легкая подводка глаз', bodyPart: 'face', images: [], comments: [], color: '#E91E63', tabId: 'makeup' }
    ],
    locations: [
      {
        id: 1,
        name: 'Интерьер квартиры',
        description: 'Современная квартира с панорамными окнами',
        shots: [
          { id: 1, time: 25, title: 'Начало сцены', description: 'Персонаж входит в комнату', image: '' },
          { id: 2, time: 45, title: 'Диалог', description: 'Разговор между персонажами', image: '' },
          { id: 3, time: 85, title: 'Крупный план', description: 'Эмоции персонажа', image: '' },
          { id: 4, time: 120, title: 'Финал сцены', description: 'Персонаж уходит', image: '' }
        ]
      },
      {
        id: 2,
        name: 'Улица',
        description: 'Городская улица в дождь',
        shots: [
          { id: 5, time: 150, title: 'Прогулка', description: 'Персонаж идет под дождем', image: '' },
          { id: 6, time: 180, title: 'Такси', description: 'Садится в такси', image: '' }
        ]
      }
    ],
    mediaFiles: [
      { id: 1, name: 'audio1.mp3', type: 'audio', duration: '3:25', size: '4.2 MB' },
      { id: 2, name: 'video1.mp4', type: 'video', duration: '1:45', size: '120 MB' },
      { id: 3, name: 'voice_over.wav', type: 'audio', duration: '2:10', size: '28 MB' },
      { id: 4, name: 'scene2.mov', type: 'video', duration: '0:45', size: '86 MB' }
    ],
    documents: [
      { id: 1, name: 'Сценарий_финал.docx', size: '2.4 MB', uploadedBy: 'Сценарист', uploadedAt: '2024-01-15', type: 'script' },
      { id: 2, name: 'Диалоги.pdf', size: '1.8 MB', uploadedBy: 'Режиссер', uploadedAt: '2024-01-10', type: 'script' }
    ],
    comments: [
      { id: 1, tabId: 'edit', user: 'Режиссер', text: 'Нужно укоротить паузу перед диалогом', timestamp: '2 часа назад', resolved: false },
      { id: 2, tabId: 'costumes', user: 'Костюмер', text: 'Нужно подобрать более темный пиджак для вечерней сцены', timestamp: '2 часа назад', resolved: false },
      { id: 3, tabId: 'makeup', user: 'Визажист', text: 'Для вечерней сцены нужен более контрастный макияж', timestamp: '1 час назад', resolved: false }
    ]
  };

  return {
    users: [demoUser],
    sessions: [],
    projects: [demoProject]
  };
};

const ensureDb = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
};

const readDb = () => {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw || '{}');
};

const writeDb = (db) => {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

const updateDb = (mutator) => {
  const db = readDb();
  const updated = mutator(db) || db;
  writeDb(updated);
  return updated;
};

const cleanExpiredSessions = () => {
  const now = new Date();
  updateDb((db) => {
    const before = db.sessions.length;
    db.sessions = db.sessions.filter((s) => !s.expiresAt || new Date(s.expiresAt) > now);
    const removed = before - db.sessions.length;
    if (removed > 0) console.log(`[DB] Cleaned ${removed} expired session(s)`);
    return db;
  });
};

module.exports = {
  readDb,
  writeDb,
  updateDb,
  createId,
  nowISO,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  cleanExpiredSessions
};
