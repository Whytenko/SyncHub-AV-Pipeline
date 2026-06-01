-- SyncHub AV Pipeline — migration 004: project kind + music clip timeline
-- PostgreSQL 16

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_kind    TEXT NOT NULL DEFAULT 'short_film',
  ADD COLUMN IF NOT EXISTS audio_track_id  INTEGER,
  ADD COLUMN IF NOT EXISTS music_timeline  JSONB NOT NULL DEFAULT '[]';
