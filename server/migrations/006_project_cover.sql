-- SyncHub AV Pipeline — migration 006: project cover image
-- PostgreSQL 16

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cover_url TEXT NOT NULL DEFAULT '';
