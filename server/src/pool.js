'use strict';

const { Pool } = require('pg');

// Managed Postgres (Render/Supabase/Neon/Heroku) requires SSL, usually with a
// self-signed chain → rejectUnauthorized:false. Local dev runs without SSL.
// Override explicitly with DATABASE_SSL=true|false; otherwise default by env.
const useSSL = process.env.DATABASE_SSL != null
  ? process.env.DATABASE_SSL === 'true'
  : process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/synchub_dev',
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR]', err.message);
});

module.exports = pool;
