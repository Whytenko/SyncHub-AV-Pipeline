'use strict';

const { nowISO } = require('./db');

// ─── Low-level helpers ────────────────────────────────────────────────────────

const isObjectRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasOwn = (obj, key) =>
  Object.prototype.hasOwnProperty.call(obj, key);

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

const normalizeTimelineDuration = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 205;
  return Math.max(1, Math.floor(parsed));
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_TAB_IDS = new Set([
  'edit', 'script', 'director', 'costumes', 'makeup', 'sound', 'manager'
]);
const MEDIA_TYPES = new Set(['audio', 'video', 'other']);
const TASK_STATUSES = new Set([
  'todo', 'in_progress', 'review', 'approved', 'changes', 'blocked'
]);
const TASK_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const LOOK_STATUSES = new Set(['todo', 'in_progress', 'ready', 'approved']);
const MAKEUP_ZONES = new Set([
  'skin', 'eyes', 'brows', 'lips', 'cheeks', 'contour', 'neck', 'other'
]);
const OUTFIT_STATUSES = new Set(['todo', 'in_progress', 'ready', 'approved']);
const GARMENT_CATEGORIES = new Set([
  'top', 'bottom', 'outerwear', 'shoes', 'accessories', 'headwear', 'underwear'
]);
const GARMENT_ACQUISITIONS = new Set(['owned', 'rented', 'to_buy', 'to_make']);
const BODY_MARKER_STATUSES = new Set(['todo', 'in_progress', 'ready', 'approved']);

// ─── Password validation ──────────────────────────────────────────────────────

/**
 * Returns an error message string, or null if valid.
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return 'Пароль обязателен';
  if (password.length < 8) return 'Пароль должен быть не короче 8 символов';
  if (!/\d/.test(password)) return 'Пароль должен содержать хотя бы одну цифру';
  return null;
};

// ─── Comment normalizer ───────────────────────────────────────────────────────

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

// ─── Project patch validator ──────────────────────────────────────────────────

/**
 * Validates and normalizes a partial project update payload.
 * Returns { patch } on success, or { error } on failure.
 */
const validateProjectPatch = (payload) => {
  if (!isObjectRecord(payload)) {
    return { error: 'Некорректный формат данных проекта' };
  }

  const patch = {};

  if (hasOwn(payload, 'name')) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      return { error: 'Название проекта должно быть непустой строкой' };
    }
    patch.name = payload.name.trim().slice(0, 200);
  }

  if (hasOwn(payload, 'description')) {
    if (typeof payload.description !== 'string') {
      return { error: 'Описание проекта должно быть строкой' };
    }
    patch.description = payload.description.slice(0, 2000);
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
      if (!markerComment) return { error: 'Комментарий маркера должен быть непустой строкой' };
      normalizedMarkers.push({
        id, time,
        color: marker.color, title: marker.title,
        comment: markerComment, user: marker.user,
        icon: marker.icon, tabId: marker.tabId
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
      const markerStatus = hasOwn(marker, 'status') ? marker.status : undefined;
      if (markerStatus !== undefined && !BODY_MARKER_STATUSES.has(markerStatus)) {
        return { error: 'Некорректный status body-маркера' };
      }
      normalizedBodyMarkers.push({
        id, time: markerTime,
        x: Math.min(100, Math.max(0, x)),
        y: Math.min(100, Math.max(0, y)),
        title: marker.title, description: marker.description,
        bodyPart: marker.bodyPart, images: marker.images,
        comments: normalizedComments, color: marker.color, tabId: marker.tabId,
        ...(personId ? { personId } : {}),
        ...(markerStatus ? { status: markerStatus } : {})
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
          id: shotId, time: shotTime,
          title: shot.title, description: shot.description, image: shot.image
        });
      }
      normalizedLocations.push({
        id, name: location.name, description: location.description,
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
        id, name: file.name, type: file.type, duration: file.duration, size: file.size
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
        id, name: document.name, size: document.size,
        uploadedBy: document.uploadedBy, uploadedAt: document.uploadedAt, type: document.type
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

  if (hasOwn(payload, 'scriptParams')) {
    if (payload.scriptParams !== null &&
        (typeof payload.scriptParams !== 'object' || Array.isArray(payload.scriptParams))) {
      return { error: 'Некорректный формат scriptParams' };
    }
    patch.scriptParams = payload.scriptParams;
  }

  if (hasOwn(payload, 'storyboardGrid')) {
    if (payload.storyboardGrid !== null &&
        (typeof payload.storyboardGrid !== 'object' || Array.isArray(payload.storyboardGrid))) {
      return { error: 'Некорректный формат storyboardGrid' };
    }
    patch.storyboardGrid = payload.storyboardGrid;
  }

  if (hasOwn(payload, 'tasks')) {
    if (!Array.isArray(payload.tasks)) {
      return { error: 'Задачи должны быть массивом' };
    }
    const normalizedTasks = [];
    for (const task of payload.tasks) {
      if (!isObjectRecord(task)) return { error: 'Некорректный формат задачи' };
      if (typeof task.id !== 'string' || !task.id) return { error: 'Некорректный id задачи' };
      if (typeof task.title !== 'string' || !task.title.trim()) return { error: 'Некорректный title задачи' };
      if (!TASK_STATUSES.has(task.status)) return { error: 'Некорректный status задачи' };
      if (!TASK_PRIORITIES.has(task.priority)) return { error: 'Некорректный priority задачи' };
      if (typeof task.department !== 'string' || !PROJECT_TAB_IDS.has(task.department)) {
        return { error: 'Некорректный department задачи' };
      }
      normalizedTasks.push({
        id: task.id,
        title: task.title.trim().slice(0, 200),
        description: typeof task.description === 'string' ? task.description.slice(0, 1000) : '',
        status: task.status,
        priority: task.priority,
        department: task.department,
        assignee: typeof task.assignee === 'string' ? task.assignee : '',
        sceneRef: typeof task.sceneRef === 'string' ? task.sceneRef : '',
        dueDate: typeof task.dueDate === 'string' ? task.dueDate : '',
        createdAt: typeof task.createdAt === 'string' ? task.createdAt : nowISO(),
        updatedAt: nowISO()
      });
    }
    patch.tasks = normalizedTasks;
  }

  // ── Makeup looks ────────────────────────────────────────────────────────────
  if (hasOwn(payload, 'makeupLooks')) {
    if (!Array.isArray(payload.makeupLooks)) {
      return { error: 'makeupLooks должны быть массивом' };
    }
    const normalizedLooks = [];
    for (const look of payload.makeupLooks) {
      if (!isObjectRecord(look)) return { error: 'Некорректный формат образа визажа' };
      const id = toPositiveInt(look.id);
      if (!id || typeof look.name !== 'string') return { error: 'Некорректные данные образа визажа' };
      const products = Array.isArray(look.products) ? look.products : [];
      const normalizedProducts = [];
      for (const p of products) {
        if (!isObjectRecord(p)) return { error: 'Некорректный формат продукта визажа' };
        const pid = toPositiveInt(p.id);
        if (!pid) return { error: 'Некорректный id продукта визажа' };
        normalizedProducts.push({
          id: pid,
          zone: MAKEUP_ZONES.has(p.zone) ? p.zone : 'other',
          productName: typeof p.productName === 'string' ? p.productName.slice(0, 200) : '',
          colorHex: typeof p.colorHex === 'string' ? p.colorHex : '#888888',
          technique: typeof p.technique === 'string' ? p.technique.slice(0, 200) : ''
        });
      }
      normalizedLooks.push({
        id,
        name: String(look.name).slice(0, 200),
        characterName: typeof look.characterName === 'string' ? look.characterName.slice(0, 100) : '',
        sceneRefs: typeof look.sceneRefs === 'string' ? look.sceneRefs.slice(0, 500) : '',
        applyTimeMin: toNonNegativeInt(look.applyTimeMin) || 0,
        products: normalizedProducts,
        skinNotes: typeof look.skinNotes === 'string' ? look.skinNotes.slice(0, 2000) : '',
        referenceImage: typeof look.referenceImage === 'string' ? look.referenceImage : '',
        status: LOOK_STATUSES.has(look.status) ? look.status : 'todo'
      });
    }
    patch.makeupLooks = normalizedLooks;
  }

  // ── Costume outfits ─────────────────────────────────────────────────────────
  if (hasOwn(payload, 'costumeOutfits')) {
    if (!Array.isArray(payload.costumeOutfits)) {
      return { error: 'costumeOutfits должны быть массивом' };
    }
    const normalizedOutfits = [];
    for (const outfit of payload.costumeOutfits) {
      if (!isObjectRecord(outfit)) return { error: 'Некорректный формат образа костюма' };
      const id = toPositiveInt(outfit.id);
      if (!id || typeof outfit.name !== 'string') return { error: 'Некорректные данные образа костюма' };
      const garments = Array.isArray(outfit.garments) ? outfit.garments : [];
      const normalizedGarments = [];
      for (const g of garments) {
        if (!isObjectRecord(g)) return { error: 'Некорректный формат элемента костюма' };
        const gid = toPositiveInt(g.id);
        if (!gid) return { error: 'Некорректный id элемента костюма' };
        normalizedGarments.push({
          id: gid,
          category: GARMENT_CATEGORIES.has(g.category) ? g.category : 'accessories',
          name: typeof g.name === 'string' ? g.name.slice(0, 200) : '',
          colorHex: typeof g.colorHex === 'string' ? g.colorHex : '#888888',
          material: typeof g.material === 'string' ? g.material.slice(0, 100) : '',
          brand: typeof g.brand === 'string' ? g.brand.slice(0, 100) : '',
          acquisition: GARMENT_ACQUISITIONS.has(g.acquisition) ? g.acquisition : 'to_buy',
          price: toNonNegativeInt(g.price) || 0,
          notes: typeof g.notes === 'string' ? g.notes.slice(0, 500) : ''
        });
      }
      normalizedOutfits.push({
        id,
        name: String(outfit.name).slice(0, 200),
        characterName: typeof outfit.characterName === 'string' ? outfit.characterName.slice(0, 100) : '',
        sceneRefs: typeof outfit.sceneRefs === 'string' ? outfit.sceneRefs.slice(0, 500) : '',
        garments: normalizedGarments,
        referenceImage: typeof outfit.referenceImage === 'string' ? outfit.referenceImage : '',
        outfitNotes: typeof outfit.outfitNotes === 'string' ? outfit.outfitNotes.slice(0, 2000) : '',
        status: OUTFIT_STATUSES.has(outfit.status) ? outfit.status : 'todo'
      });
    }
    patch.costumeOutfits = normalizedOutfits;
  }

  return { patch };
};

module.exports = {
  // helpers (exported for testing)
  isObjectRecord,
  hasOwn,
  toNonNegativeInt,
  toPositiveInt,
  normalizeTimelineDuration,
  normalizeComment,
  // constants
  PROJECT_TAB_IDS,
  MEDIA_TYPES,
  // validators
  validatePassword,
  validateProjectPatch
};
