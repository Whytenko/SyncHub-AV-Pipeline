const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// ====================
// Middleware
// ====================
app.use(express.json()); // Для парсинга JSON
app.use(express.urlencoded({ extended: true })); // Для парсинга form-data

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS headers (позже настроим правильно)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ====================
// Routes
// ====================

// Главная страница API
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎬 SyncHub AV Pipeline API',
    version: '1.0.0',
    documentation: 'Документация будет здесь',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      projects: '/api/projects (coming soon)',
      users: '/api/users (coming soon)'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Status
app.get('/api/status', (req, res) => {
  res.json({
    service: 'SyncHub API',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    platform: process.platform
  });
});

// Тестовый endpoint для проектов (заглушка)
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    count: 0,
    message: 'API для проектов в разработке',
    data: []
  });
});

// 404 - не найден
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.url
  });
});

// ====================
// Запуск сервера
// ====================
app.listen(PORT, () => {
  console.log('═'.repeat(60));
  console.log('🚀 SyncHub AV Pipeline Server');
  console.log('═'.repeat(60));
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Status: http://localhost:${PORT}/api/status`);
  console.log('⚡ Режим: ' + (process.env.NODE_ENV || 'development'));
  console.log('═'.repeat(60));
  console.log('Press Ctrl+C to stop\n');
});

// Обработка graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down...');
  process.exit(0);
});
