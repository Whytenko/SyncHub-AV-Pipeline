# SyncHub AV Pipeline
Проект для дипломной работы. Клиент на React + Vite, сервер на Express с локальным JSON-хранилищем.

## Быстрый старт
1) Сервер:
```
cd server
npm install
npm run dev
```

2) Клиент:
```
cd client
npm install
npm run dev
```

По умолчанию сервер стартует на `http://localhost:5000`, клиент — на `http://localhost:5173`.

## Демо-доступ
После первого запуска автоматически создается демо-пользователь:
- Никнейм: `demo`
- Пароль: `demo1234`

## Структура
- `client/` — интерфейс SyncHub
- `server/` — API, хранение в `server/data/db.json`
