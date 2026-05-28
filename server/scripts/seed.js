'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = require('../src/pool');
const { createId, nowISO, hashPassword } = require('../src/db');

async function seed() {
  // Check if demo user already exists
  const existing = await pool.query("SELECT id FROM users WHERE nickname = 'demo'");
  if (existing.rows.length > 0) {
    console.log('ℹ  Demo user already exists — skipping seed.');
    await pool.end();
    return;
  }

  const userId = createId('usr');
  const projectId = createId('prj');
  const now = nowISO();

  // Insert demo user
  await pool.query(
    `INSERT INTO users (id, first_name, last_name, nickname, email, role, avatar, gender, birthdate, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [userId, 'Демо', 'Пользователь', 'demo', 'demo@example.com', 'Режиссёр', '🎬', 'male', '1996-04-12', hashPassword('demo1234'), now, now]
  );

  // Insert demo project
  await pool.query(
    `INSERT INTO projects (id, name, description, owner_id, members, deadline, timeline_duration,
       script_text, director_notes, markers, body_markers, body_silhouettes,
       storyboard_grid, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      projectId,
      'Арт-хаус видео',
      'Тестовый проект для демонстрации возможностей SyncHub.',
      userId,
      [userId],
      '2026-11-07',
      205,
      'СЦЕНА 1\nИНТ. КВАРТИРА - ДЕНЬ\n\nАЛЕКС (30) входит в комнату...',
      '• Важно передать эмоции персонажа в диалоге\n• Свет должен быть мягким',
      JSON.stringify([
        { id: 1, time: 25, color: '#FF391A', title: 'Начало кадра', comment: 'Мягкий переход', user: 'Режиссёр', icon: 'director', tabId: 'edit' },
        { id: 2, time: 85, color: '#08B0D9', title: 'Музыкальный вход', comment: 'Тише на 2 дБ', user: 'Композитор', icon: 'script', tabId: 'sound' }
      ]),
      JSON.stringify([
        { id: 1, time: 30, x: 50, y: 20, title: 'Костюм персонажа', description: 'Чёрный пиджак, белая рубашка', bodyPart: 'torso', images: [], comments: [], color: '#FF9800', tabId: 'costumes' }
      ]),
      JSON.stringify([{ id: 1, name: 'Человек 1' }]),
      JSON.stringify({ locationNames: [], columnCount: 4, cells: {} }),
      now,
      now
    ]
  );

  console.log('✅ Demo user (demo / demo1234) and project created.');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
