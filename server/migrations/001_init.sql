-- SyncHub AV Pipeline — initial schema
-- PostgreSQL 16

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  nickname     TEXT UNIQUE NOT NULL,
  email        TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'Участник',
  avatar       TEXT NOT NULL DEFAULT '👤',
  gender       TEXT NOT NULL DEFAULT '',
  birthdate    TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  owner_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  members          TEXT[] NOT NULL DEFAULT '{}',
  deadline         TEXT NOT NULL DEFAULT '',
  timeline_duration INTEGER NOT NULL DEFAULT 205,
  script_text      TEXT NOT NULL DEFAULT '',
  director_notes   TEXT NOT NULL DEFAULT '',
  markers          JSONB NOT NULL DEFAULT '[]',
  body_markers     JSONB NOT NULL DEFAULT '[]',
  body_silhouettes JSONB NOT NULL DEFAULT '[]',
  locations        JSONB NOT NULL DEFAULT '[]',
  media_files      JSONB NOT NULL DEFAULT '[]',
  documents        JSONB NOT NULL DEFAULT '[]',
  comments         JSONB NOT NULL DEFAULT '[]',
  script_params    JSONB,
  storyboard_grid  JSONB,
  tasks            JSONB NOT NULL DEFAULT '[]',
  makeup_looks     JSONB NOT NULL DEFAULT '[]',
  costume_outfits  JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for frequent lookups
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS users_nickname_lower_idx ON users(LOWER(nickname));
