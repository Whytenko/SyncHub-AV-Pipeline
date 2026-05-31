-- SyncHub AV Pipeline — migration 003: per-project member roles
-- PostgreSQL 16

-- Maps user_id (text) → role (text). One role per user per project, chosen once on first entry.
-- Example: { "usr_abc123": "Сценарист", "usr_def456": "Режиссёр" }
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_roles JSONB NOT NULL DEFAULT '{}';
