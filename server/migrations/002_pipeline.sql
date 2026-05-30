-- SyncHub AV Pipeline — migration 002: production pipeline fields
-- PostgreSQL 16

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS production_stage TEXT NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS scenes           JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS shooting_days   JSONB NOT NULL DEFAULT '[]';

-- Index for quick stage queries
CREATE INDEX IF NOT EXISTS projects_stage_idx ON projects(production_stage);
