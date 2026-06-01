-- SyncHub AV Pipeline — migration 005
-- audio_track_id was INTEGER (max ~2.1B) but media file IDs come from Date.now()
-- which produces 13-digit timestamps exceeding INTEGER range. Change to BIGINT.
ALTER TABLE projects
  ALTER COLUMN audio_track_id TYPE BIGINT;
