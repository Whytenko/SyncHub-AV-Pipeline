'use strict';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SyncHub AV Pipeline API',
    version: '3.0.0',
    description: `REST API для платформы координации съёмочной группы SyncHub.

Все защищённые маршруты требуют заголовок \`Authorization: Bearer <token>\`.
Токен выдаётся при регистрации или входе.`,
    contact: { name: 'Whytenko', email: 'whywhytenko@gmail.com' }
  },
  servers: [
    { url: 'http://localhost:5001', description: 'Local development' }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Токен сессии из /api/auth/login или /api/auth/register'
      }
    },
    schemas: {
      // ── Auth ──────────────────────────────────────────────────────────────
      RegisterRequest: {
        type: 'object', required: ['firstName', 'nickname', 'password'],
        properties: {
          firstName: { type: 'string', example: 'Алекс' },
          lastName:  { type: 'string', example: 'Войтенко' },
          nickname:  { type: 'string', example: 'alex_v', description: '3–30 символов, [a-zA-Z0-9_]' },
          email:     { type: 'string', format: 'email', example: 'alex@example.com' },
          password:  { type: 'string', minLength: 8, example: 'secret12', description: 'Минимум 8 символов, хотя бы 1 цифра' },
          gender:    { type: 'string', enum: ['male', 'female', ''] },
          birthdate: { type: 'string', example: '1998-03-15' }
        }
      },
      LoginRequest: {
        type: 'object', required: ['nickname', 'password'],
        properties: {
          nickname: { type: 'string', example: 'demo', description: 'Никнейм или email' },
          password: { type: 'string', example: 'demo1234' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token:   { type: 'string', example: 'session_f3e2...' },
          user:    { $ref: '#/components/schemas/User' }
        }
      },
      // ── User ──────────────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id:        { type: 'string', example: 'usr_a1b2c3' },
          firstName: { type: 'string', example: 'Алекс' },
          lastName:  { type: 'string', example: 'Войтенко' },
          nickname:  { type: 'string', example: 'alex_v' },
          email:     { type: 'string', example: 'alex@example.com' },
          role:      { type: 'string', example: 'Режиссёр' },
          avatar:    { type: 'string', example: '🎬' },
          gender:    { type: 'string', example: 'male' },
          birthdate: { type: 'string', example: '1998-03-15' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          firstName: { type: 'string' }, lastName: { type: 'string' },
          email: { type: 'string', format: 'email' }, role: { type: 'string' },
          avatar: { type: 'string' }, gender: { type: 'string' }, birthdate: { type: 'string' }
        }
      },
      ChangePasswordRequest: {
        type: 'object', required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'oldpass1' },
          newPassword:     { type: 'string', example: 'newpass2', description: 'Минимум 8 символов, хотя бы 1 цифра' }
        }
      },
      // ── Project ───────────────────────────────────────────────────────────
      ProjectSummary: {
        type: 'object',
        properties: {
          id:            { type: 'string', example: 'prj_x1y2z3' },
          name:          { type: 'string', example: 'Арт-хаус видео' },
          description:   { type: 'string' },
          deadline:      { type: 'string', example: '2026-11-07' },
          createdAt:     { type: 'string', format: 'date-time' },
          updatedAt:     { type: 'string', format: 'date-time' },
          members:       { type: 'array', items: { $ref: '#/components/schemas/UserSummary' } },
          mediaCount:    { type: 'integer', example: 3 },
          editsCount:    { type: 'integer', example: 7 },
          commentsCount: { type: 'integer', example: 12 }
        }
      },
      CreateProjectRequest: {
        type: 'object', required: ['name'],
        properties: {
          name:             { type: 'string', example: 'Мой фильм' },
          description:      { type: 'string', example: 'Короткометражка' },
          deadline:         { type: 'string', example: '2026-12-31' },
          timelineDuration: { type: 'integer', example: 300, description: 'Длительность в секундах' }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id:               { type: 'string' },
          name:             { type: 'string' },
          description:      { type: 'string' },
          ownerId:          { type: 'string' },
          members:          { type: 'array', items: { type: 'string' } },
          deadline:         { type: 'string' },
          timelineDuration: { type: 'integer' },
          scriptText:       { type: 'string' },
          directorNotes:    { type: 'string' },
          markers:          { type: 'array', items: { $ref: '#/components/schemas/ProjectMarker' } },
          tasks:            { type: 'array', items: { $ref: '#/components/schemas/Task' } },
          mediaFiles:       { type: 'array', items: { $ref: '#/components/schemas/MediaFile' } },
          documents:        { type: 'array', items: { $ref: '#/components/schemas/DocumentFile' } },
          makeupLooks:      { type: 'array' },
          costumeOutfits:   { type: 'array' },
          storyboardGrid:   { type: 'object' },
          createdAt:        { type: 'string', format: 'date-time' },
          updatedAt:        { type: 'string', format: 'date-time' }
        }
      },
      // ── Nested entities ───────────────────────────────────────────────────
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' }, nickname: { type: 'string' },
          firstName: { type: 'string' }, lastName: { type: 'string' },
          role: { type: 'string' }, avatar: { type: 'string' }
        }
      },
      ProjectMarker: {
        type: 'object', required: ['id', 'time', 'color', 'title', 'tabId'],
        properties: {
          id:      { type: 'integer', example: 1 },
          time:    { type: 'integer', example: 45, description: 'Позиция на таймлайне (секунды)' },
          color:   { type: 'string', example: '#FF391A' },
          title:   { type: 'string', example: 'Начало сцены' },
          comment: { type: 'string' },
          user:    { type: 'string', example: 'Режиссёр' },
          icon:    { type: 'string', example: 'director' },
          tabId:   { type: 'string', enum: ['edit', 'script', 'director', 'costumes', 'makeup', 'sound', 'manager'] }
        }
      },
      Task: {
        type: 'object', required: ['id', 'title', 'status', 'priority', 'department'],
        properties: {
          id:          { type: 'string', example: 'task_abc123' },
          title:       { type: 'string', example: 'Подобрать костюмы для сцены 3' },
          description: { type: 'string' },
          status:      { type: 'string', enum: ['todo', 'in_progress', 'review', 'approved', 'changes', 'blocked'] },
          priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          department:  { type: 'string', enum: ['edit', 'script', 'director', 'costumes', 'makeup', 'sound', 'manager'] },
          assignee:    { type: 'string' },
          dueDate:     { type: 'string', example: '2026-09-15' }
        }
      },
      MediaFile: {
        type: 'object',
        properties: {
          id:       { type: 'integer', example: 1748000000000 },
          name:     { type: 'string', example: 'scene_01.mp4' },
          type:     { type: 'string', enum: ['video', 'audio', 'other'] },
          duration: { type: 'string', example: '2:34' },
          size:     { type: 'string', example: '145.2 MB' },
          url:      { type: 'string', example: '/uploads/prj_xxx/1748000000000_uuid.mp4' }
        }
      },
      DocumentFile: {
        type: 'object',
        properties: {
          id:         { type: 'integer', example: 1748000000001 },
          name:       { type: 'string', example: 'script_v3.pdf' },
          size:       { type: 'string', example: '2.1 MB' },
          type:       { type: 'string', example: 'pdf' },
          uploadedBy: { type: 'string', example: 'demo' },
          uploadedAt: { type: 'string', example: '28.05.2026' },
          url:        { type: 'string', example: '/uploads/prj_xxx/docs/1748000000001_uuid.pdf' }
        }
      },
      // ── Generic responses ─────────────────────────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: { success: { type: 'boolean', example: true } }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Описание ошибки' }
        }
      }
    }
  },
  security: [{ BearerAuth: [] }],
  paths: {
    // ── System ──────────────────────────────────────────────────────────────
    '/': {
      get: {
        tags: ['System'], summary: 'API info', security: [],
        responses: { 200: { description: 'API version and available endpoints' } }
      }
    },
    '/api/health': {
      get: {
        tags: ['System'], summary: 'Health check с проверкой БД', security: [],
        responses: {
          200: { description: 'Сервер и PostgreSQL работают' },
          503: { description: 'PostgreSQL недоступен' }
        }
      }
    },
    '/api/status': {
      get: {
        tags: ['System'], summary: 'Информация о среде выполнения', security: [],
        responses: { 200: { description: 'Node version, platform, environment' } }
      }
    },
    // ── Auth ────────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Регистрация нового пользователя', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          201: { description: 'Пользователь создан, токен выдан', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Неверный формат данных или слабый пароль', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Никнейм или email уже занят' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Вход по никнейму/email + паролю', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Успешный вход', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Пароль не указан' },
          401: { description: 'Пользователь не найден или неверный пароль' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Текущий пользователь по токену',
        responses: {
          200: { description: 'Данные пользователя', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { user: { $ref: '#/components/schemas/User' } } }] } } } },
          401: { description: 'Токен отсутствует или истёк' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Выход — удаляет сессию',
        responses: {
          200: { description: 'Сессия удалена', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
          401: { description: 'Токен недействителен' }
        }
      }
    },
    // ── Users ────────────────────────────────────────────────────────────────
    '/api/users/me': {
      get: {
        tags: ['Users'], summary: 'Получить профиль текущего пользователя',
        responses: { 200: { description: 'Профиль пользователя' }, 401: { description: 'Не авторизован' } }
      },
      patch: {
        tags: ['Users'], summary: 'Обновить профиль (имя, роль, аватар и т.д.)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } } },
        responses: {
          200: { description: 'Обновлённый профиль', content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { user: { $ref: '#/components/schemas/User' } } }] } } } },
          409: { description: 'Email уже используется' }
        }
      }
    },
    '/api/users/me/password': {
      patch: {
        tags: ['Users'], summary: 'Сменить пароль',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } } },
        responses: {
          200: { description: 'Пароль изменён' },
          400: { description: 'Слабый пароль' },
          401: { description: 'Текущий пароль неверен' }
        }
      }
    },
    // ── Projects ─────────────────────────────────────────────────────────────
    '/api/projects': {
      get: {
        tags: ['Projects'], summary: 'Список проектов текущего пользователя',
        responses: {
          200: { description: 'Массив кратких сводок проектов', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, projects: { type: 'array', items: { $ref: '#/components/schemas/ProjectSummary' } } } } } } }
        }
      },
      post: {
        tags: ['Projects'], summary: 'Создать новый проект',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } } },
        responses: {
          201: { description: 'Проект создан', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, project: { $ref: '#/components/schemas/Project' } } } } } },
          400: { description: 'Название не указано' }
        }
      }
    },
    '/api/projects/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID проекта (prj_...)' }],
      get: {
        tags: ['Projects'], summary: 'Получить проект целиком со всеми данными',
        responses: {
          200: { description: 'Полный объект проекта', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, project: { $ref: '#/components/schemas/Project' } } } } } },
          403: { description: 'Нет доступа' }, 404: { description: 'Проект не найден' }
        }
      },
      patch: {
        tags: ['Projects'], summary: 'Обновить любое поле проекта (частичное обновление)',
        description: 'Принимает любое подмножество полей проекта. Все данные валидируются на сервере перед записью в PostgreSQL.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } } },
        responses: {
          200: { description: 'Обновлённый проект' },
          400: { description: 'Ошибка валидации' },
          403: { description: 'Нет доступа' }
        }
      },
      delete: {
        tags: ['Projects'], summary: 'Удалить проект (только владелец)',
        responses: {
          200: { description: 'Проект удалён' },
          403: { description: 'Только владелец может удалить проект' }
        }
      }
    },
    '/api/projects/{id}/export': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Projects'], summary: 'Экспорт проекта в JSON',
        responses: {
          200: { description: 'Полный дамп проекта с временной меткой экспорта' }
        }
      }
    },
    // ── Media ────────────────────────────────────────────────────────────────
    '/api/projects/{id}/media/upload': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      post: {
        tags: ['Media'], summary: 'Загрузить видео или аудио файл',
        description: 'Файл сохраняется в `server/public/uploads/{projectId}/`. Метаданные + URL записываются в PostgreSQL (JSONB поле media_files).\n\n**Форматы:** mp4, webm, mov, avi, mkv, mp3, wav, ogg, aac, m4a, flac\n\n**Лимит:** 2 ГБ',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object', required: ['file'],
                properties: {
                  file:     { type: 'string', format: 'binary', description: 'Медиафайл' },
                  duration: { type: 'string', description: 'Длительность в формате М:СС, определяется браузером перед отправкой', example: '1:34' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Файл загружен', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, mediaFile: { $ref: '#/components/schemas/MediaFile' }, project: { $ref: '#/components/schemas/Project' } } } } } },
          400: { description: 'Файл отсутствует или формат не поддерживается' },
          403: { description: 'Нет доступа к проекту' }
        }
      }
    },
    '/api/projects/{id}/media/{mediaId}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'mediaId', in: 'path', required: true, schema: { type: 'integer' }, description: 'id поля из объекта MediaFile' }
      ],
      delete: {
        tags: ['Media'], summary: 'Удалить медиафайл (с диска и из БД)',
        responses: {
          200: { description: 'Файл удалён' },
          403: { description: 'Нет доступа' }, 404: { description: 'Проект не найден' }
        }
      }
    },
    // ── Documents ────────────────────────────────────────────────────────────
    '/api/projects/{id}/documents/upload': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      post: {
        tags: ['Documents'], summary: 'Загрузить документ (PDF, Word, Excel, изображение)',
        description: 'Файл сохраняется в `server/public/uploads/{projectId}/docs/`. URL записывается в поле `documents` проекта.\n\n**Форматы:** pdf, doc, docx, xls, xlsx, ppt, pptx, txt, png, jpg, jpeg, gif\n\n**Лимит:** 100 МБ',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object', required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Документ' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Документ загружен', content: { 'application/json': { schema: { properties: { success: { type: 'boolean' }, document: { $ref: '#/components/schemas/DocumentFile' }, project: { $ref: '#/components/schemas/Project' } } } } } },
          400: { description: 'Файл отсутствует или формат не поддерживается' }
        }
      }
    },
    '/api/projects/{id}/documents/{docId}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'docId', in: 'path', required: true, schema: { type: 'integer' } }
      ],
      delete: {
        tags: ['Documents'], summary: 'Удалить документ (с диска и из БД)',
        responses: {
          200: { description: 'Документ удалён' },
          403: { description: 'Нет доступа' }
        }
      }
    }
  }
};

module.exports = swaggerDefinition;
