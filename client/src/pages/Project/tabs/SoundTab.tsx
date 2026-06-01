import React, { useRef, useState } from 'react';
import { Music, MapPinPlus, MessageSquarePlus, Reply, Trash2, Mic, Scissors, MapPin, Clock, Users, CalendarDays, Film, CheckCircle2, Upload, Loader } from 'lucide-react';
import type { ProjectMarker, ProjectComment, TabType, Task, TaskStatus, Scene, ShootingDay, MediaFile, ProjectKind } from '../../../types';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import TabTasksPanel from '../components/TabTasksPanel';

const tabColorSound = '#06b6d4';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const getDurationFromAudio = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const el = new Audio();
    const objUrl = URL.createObjectURL(file);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(objUrl);
      const secs = Math.floor(el.duration);
      resolve(isFinite(secs) ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '—');
    };
    el.onerror = () => { URL.revokeObjectURL(objUrl); resolve('—'); };
    el.src = objUrl;
  });

type SoundMode = 'on_set' | 'post';

export interface SoundTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  soundMarkers: ProjectMarker[];
  commentsByTabSound: ProjectComment[];
  handleToggleResolved: (id: number) => void;
  openCommentModal: (tab: TabType) => void;
  openMarkerModal: () => void;
  handleOpenTimelineMarkerDetails: (marker: ProjectMarker) => void;
  canEdit: boolean;
  userRole?: string;
  onDeleteMarker: (id: number) => void;
  onMarkerSeek: (time: number) => void;
  deptTasks: Task[];
  onTaskStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  scenes: Scene[];
  shootingDays: ShootingDay[];
  projectId: string;
  // Music clip context (used by music_video / commercial projects)
  projectKind?: ProjectKind;
  mediaFiles: MediaFile[];
  audioTrackId?: number;
  onSetAudioTrack: (mediaId: number | null) => Promise<void>;
  onUploadAudio: (file: File, duration: string) => Promise<void>;
  onDeleteAudio: (mediaId: number) => Promise<void>;
}

const DAY_STATUS_LABEL: Record<string, string> = {
  planned:   'Запланирован',
  shooting:  'Идут съёмки',
  wrapped:   'Завершён',
  postponed: 'Перенесён'
};
const DAY_STATUS_COLOR: Record<string, string> = {
  planned: '#6b7280', shooting: '#FF9800', wrapped: '#22c55e', postponed: '#9C27B0'
};

const SoundTab: React.FC<SoundTabProps> = ({
  t, soundMarkers, commentsByTabSound,
  handleToggleResolved, openCommentModal, openMarkerModal,
  handleOpenTimelineMarkerDetails,
  canEdit, userRole, onDeleteMarker, onMarkerSeek,
  deptTasks, onTaskStatusChange,
  scenes, shootingDays, projectId,
  projectKind, mediaFiles, audioTrackId, onSetAudioTrack,
  onUploadAudio, onDeleteAudio
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingAudio(true);
    try {
      const duration = await getDurationFromAudio(file);
      await onUploadAudio(file, duration);
    } finally {
      setUploadingAudio(false);
    }
  };

  const supportsAudioClip = projectKind === 'music_video' || projectKind === 'commercial';
  const audioFiles = mediaFiles.filter(f => f.type === 'audio');
  const activeAudio = audioFiles.find(f => f.id === audioTrackId);
  // Persisted mode choice — sound engineer toggles between locations
  const modeKey = `synchub-sound-mode-${projectId}`;
  const [mode, setMode] = useState<SoundMode | null>(() => {
    const stored = localStorage.getItem(modeKey);
    return (stored === 'on_set' || stored === 'post') ? stored as SoundMode : null;
  });
  const chooseMode = (m: SoundMode) => {
    setMode(m);
    localStorage.setItem(modeKey, m);
  };
  const resetMode = () => {
    setMode(null);
    localStorage.removeItem(modeKey);
  };

  const sortedDays = [...shootingDays].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className="tab-content sound-tab">
      {!canEdit && <ReadOnlyBanner t={t} role={userRole} />}

      {/* ── Music clip master track (only for music_video / commercial) ── */}
      {supportsAudioClip && (
        <div className="sound-master-track">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/flac"
            style={{ display: 'none' }}
            onChange={handleAudioFileChange}
          />
          <div className="sound-master-track-head">
            <Music size={16} style={{ color: '#06b6d4' }} />
            <span className="sound-master-track-title">{t('Главный аудиотрек')}</span>
            {activeAudio && (
              <span className="sound-master-track-status">
                <CheckCircle2 size={12} style={{ color: '#22c55e' }} /> {t('Выбран')}
              </span>
            )}
          </div>
          <div className="sound-master-track-body">
            {audioFiles.length === 0 && !uploadingAudio ? (
              <div className="sound-master-track-empty">
                {t('Аудиофайл не загружен')}
              </div>
            ) : uploadingAudio ? (
              <div className="media-upload-progress">
                <Loader size={16} className="media-upload-spinner" />
                <span>{t('Загружаем аудио...')}</span>
              </div>
            ) : (
              <>
                <select
                  className="form-input"
                  value={audioTrackId ?? ''}
                  disabled={!canEdit}
                  onChange={e => onSetAudioTrack(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{t('Не выбран')}</option>
                  {audioFiles.map(f => (
                    <option key={f.id} value={f.id}>{f.name} · {f.duration}</option>
                  ))}
                </select>
                <div className="sound-master-track-files">
                  {audioFiles.map(f => (
                    <div key={f.id} className="sound-master-track-file-row">
                      <Music size={13} style={{ color: '#06b6d4', flexShrink: 0 }} />
                      <span className="sound-master-track-file-name" title={f.name}>{f.name}</span>
                      <span className="sound-master-track-file-dur">{f.duration}</span>
                      {canEdit && (
                        <button
                          className="media-delete-btn"
                          title={t('Удалить')}
                          onClick={() => onDeleteAudio(f.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {activeAudio && (
                  <div className="sound-master-track-hint">
                    {t('Режиссёр получит таймлайн под этот трек для раскадровки клипа.')}
                  </div>
                )}
              </>
            )}
            {canEdit && (
              <button
                className="upload-btn"
                style={{ marginTop: 10 }}
                onClick={() => audioInputRef.current?.click()}
                disabled={uploadingAudio}
              >
                {uploadingAudio
                  ? <><Loader size={14} className="media-upload-spinner" /> {t('Загрузка...')}</>
                  : <><Upload size={14} className="upload-icon" /> {t('Загрузить аудио')}</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Mode selector — two cards, sound engineer picks where they work ── */}
      <div className="sound-mode-row">
        <button
          type="button"
          className={`sound-mode-card sound-mode-card--onset${mode === 'on_set' ? ' sound-mode-card--active' : ''}`}
          onClick={() => chooseMode('on_set')}
        >
          <div className="sound-mode-icon"><Mic size={28} /></div>
          <div className="sound-mode-title">{t('Звук на площадке')}</div>
          <div className="sound-mode-desc">{t('Запись на съёмочной площадке: эмбиенс, петлички, дубли. Видны съёмочные дни, сцены, локации.')}</div>
          {mode === 'on_set' && <div className="sound-mode-active-dot" />}
        </button>

        <button
          type="button"
          className={`sound-mode-card sound-mode-card--post${mode === 'post' ? ' sound-mode-card--active' : ''}`}
          onClick={() => chooseMode('post')}
        >
          <div className="sound-mode-icon"><Scissors size={28} /></div>
          <div className="sound-mode-title">{t('Звук на пост-продакшне')}</div>
          <div className="sound-mode-desc">{t('Сведение, музыка, эффекты. Метки на таймлайне, маркеры под сцены, синхронизация с монтажом.')}</div>
          {mode === 'post' && <div className="sound-mode-active-dot" />}
        </button>
      </div>

      {/* Reset mode button when chosen */}
      {mode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button className="storyboard-ctrl-btn" onClick={resetMode}>
            {t('Сменить режим')}
          </button>
        </div>
      )}

      {/* ── ON-SET MODE: shooting days panel with all info the engineer needs ── */}
      {mode === 'on_set' && (
        <div className="sound-onset-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Mic size={18} style={{ color: tabColorSound }} />
            {t('Информация со съёмочной площадки')}
          </h3>

          {sortedDays.length === 0 ? (
            <div className="empty-state-rich">
              <CalendarDays size={32} className="empty-state-icon" />
              <div className="empty-state-text">{t('Съёмочные дни ещё не запланированы менеджером')}</div>
            </div>
          ) : (
            <div className="sound-onset-days">
              {sortedDays.map(day => {
                const dayScenes = scenes.filter(s => day.sceneIds.includes(s.id));
                const totalChars = Array.from(new Set(dayScenes.flatMap(s => s.characters)));
                return (
                  <div key={day.id} className="sound-onset-day">
                    <div className="sound-onset-day-header">
                      <div className="sound-onset-day-num">{t('День')} {day.dayNumber}</div>
                      <div className="sound-onset-day-date">{day.date}</div>
                      <span
                        className="sound-onset-day-status"
                        style={{ color: DAY_STATUS_COLOR[day.status], borderColor: DAY_STATUS_COLOR[day.status] }}
                      >
                        {DAY_STATUS_LABEL[day.status] || day.status}
                      </span>
                    </div>

                    <div className="sound-onset-day-meta">
                      <span><Clock size={12} /> {day.callTime} — {day.wrapTime}</span>
                      {day.location && <span><MapPin size={12} /> {day.location}</span>}
                      {day.totalMinutes > 0 && <span>~{day.totalMinutes} {t('мин')}</span>}
                    </div>

                    {day.notes && (
                      <div className="sound-onset-day-notes">{day.notes}</div>
                    )}

                    <div className="sound-onset-scenes-title">
                      <Film size={12} /> {t('Сцены в этот день')} ({dayScenes.length})
                    </div>
                    {dayScenes.length === 0 ? (
                      <div className="sound-onset-no-scenes">{t('Сцены пока не назначены')}</div>
                    ) : (
                      <div className="sound-onset-scenes">
                        {dayScenes.map(scene => (
                          <div key={scene.id} className="sound-onset-scene">
                            <div className="sound-onset-scene-head">
                              <span className="sound-onset-scene-num">Сц.{scene.number}</span>
                              <span className="sound-onset-scene-ie">
                                {scene.interiorExterior === 'INT' ? 'ИНТ' : 'НАТ'}·{scene.dayNight === 'DAY' ? 'ДН' : 'НЧ'}
                              </span>
                              <span className="sound-onset-scene-title">{scene.title}</span>
                            </div>
                            <div className="sound-onset-scene-info">
                              {scene.location && (
                                <span className="sound-onset-chip"><MapPin size={11} /> {scene.location}</span>
                              )}
                              {scene.characters.length > 0 && (
                                <span className="sound-onset-chip"><Users size={11} /> {scene.characters.join(', ')}</span>
                              )}
                              {scene.estimatedMinutes > 0 && (
                                <span className="sound-onset-chip"><Clock size={11} /> {scene.estimatedMinutes} {t('мин')}</span>
                              )}
                              {scene.dayNight === 'NIGHT' && (
                                <span className="sound-onset-chip sound-onset-chip--warn">{t('Ночь — тише фон')}</span>
                              )}
                              {scene.interiorExterior === 'EXT' && (
                                <span className="sound-onset-chip sound-onset-chip--warn">{t('Натура — ветрозащита')}</span>
                              )}
                            </div>
                            {scene.description && (
                              <div className="sound-onset-scene-desc">{scene.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {totalChars.length > 0 && (
                      <div className="sound-onset-total">
                        <Users size={12} /> {t('Все персонажи дня')}: {totalChars.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── POST-PRODUCTION MODE: original timeline markers + comments ── */}
      {mode === 'post' && (
        <div className="sound-layout">
          <div className="sound-markers-col">
            <div className="sound-markers-head">
              <h3>{t('Звуковые метки')}</h3>
              {canEdit && (
                <button className="add-marker-btn" onClick={openMarkerModal}>
                  <MapPinPlus size={16} className="add-marker-icon" />
                  {t('Добавить метку')}
                </button>
              )}
            </div>
            <p className="sound-hint">{t('Переместите курсор таймлайна на нужную позицию, затем нажмите «Добавить метку».')}</p>
            {soundMarkers.length === 0 ? (
              <div className="empty-state-rich">
                <Music size={32} className="empty-state-icon" />
                <div className="empty-state-text">{t('Звуковых меток пока нет')}</div>
                {canEdit && (
                  <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={openMarkerModal}>
                    {t('Добавить метку')}
                  </button>
                )}
              </div>
            ) : (
              <div className="sound-markers-list">
                {soundMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className="sound-marker-row"
                    onClick={() => { onMarkerSeek(marker.time); handleOpenTimelineMarkerDetails(marker); }}
                  >
                    <div className="sound-marker-time" style={{ color: tabColorSound }}>
                      {fmt(marker.time)}
                    </div>
                    <div className="sound-marker-info">
                      <div className="sound-marker-title">{marker.title}</div>
                      {marker.comment && <div className="sound-marker-desc">{marker.comment}</div>}
                    </div>
                    <div className="sound-marker-dot" style={{ background: tabColorSound }} />
                    {canEdit && (
                      <button
                        className="tab-marker-delete"
                        title={t('Удалить метку')}
                        onClick={(e) => { e.stopPropagation(); onDeleteMarker(marker.id); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="column comments-column">
            <h3>{t('Комментарии к звуку')}</h3>
            <div className="comments-list">
              {commentsByTabSound.length === 0 && (
                <div className="empty-state">{t('Комментариев пока нет.')}</div>
              )}
              {commentsByTabSound.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <div className="user-badge" style={{ backgroundColor: tabColorSound }}>{comment.user}</div>
                    <div className="comment-time">{comment.timestamp}</div>
                  </div>
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-footer">
                    <span className="timestamp" onClick={() => handleToggleResolved(comment.id)}>
                      {comment.resolved ? t('Решено') : t('Не решено')}
                    </span>
                    <button className="reply-btn" onClick={() => openCommentModal('sound')}>
                      <Reply size={14} /> {t('Ответить')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="add-comment-btn" onClick={() => openCommentModal('sound')}>
              <MessageSquarePlus size={16} className="add-comment-icon" />
              {t('Добавить комментарий')}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 0 0' }}>
        <TabTasksPanel t={t} tasks={deptTasks} canEdit={canEdit} onStatusChange={onTaskStatusChange} />
      </div>
    </div>
  );
};

export default SoundTab;
