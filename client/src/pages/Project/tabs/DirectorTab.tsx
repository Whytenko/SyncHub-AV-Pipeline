import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Film, Upload, Clock, StickyNote, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock, Unlock } from 'lucide-react';
import type { StoryboardFrame, ProjectMarker, Task, TaskStatus, ProjectComment, TabType, Scene, ClipFrame, MediaFile, ProjectKind } from '../../../types';
import TabMarkersPanel from '../components/TabMarkersPanel';
import TabTasksPanel from '../components/TabTasksPanel';
import TabCommentsPanel from '../components/TabCommentsPanel';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import Modal from '../../../components/Modal';
import MusicClipTimeline from '../components/MusicClipTimeline';
import { resolveAssetUrl } from '../../../api/assets';

const SHOT_TYPES = [
  { code: 'ДЛ',  label: 'Дальний план' },
  { code: 'ОП',  label: 'Общий план' },
  { code: 'СП',  label: 'Средний план' },
  { code: 'ПП',  label: 'Поясной план' },
  { code: 'КП',  label: 'Крупный план' },
  { code: 'ДТЛ', label: 'Деталь' },
  { code: 'ПАН', label: 'Панорама' },
  { code: 'ТИЛТ', label: 'Тилт' },
  { code: 'ТРК', label: 'Трекинг' },
  { code: 'ПОВ', label: 'POV (субъект. камера)' },
  { code: 'ВИД', label: 'Вид сверху' },
  { code: 'НИЗ', label: 'Вид снизу' },
];

const compressImage = (file: File, maxW = 480, maxH = 320): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

export interface DirectorTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  scenes: Scene[];
  onSaveScenes: (scenes: Scene[]) => Promise<void>;
  projectId: string;
  timelineDuration: number;
  onSaveTimelineDuration: (next: number) => Promise<void>;
  timelineDurationInput: string;
  setTimelineDurationInput: (v: string) => void;
  handleSaveTimelineDuration: () => void;
  // Music clip context — for music_video / commercial projects
  projectKind?: ProjectKind;
  mediaFiles: MediaFile[];
  audioTrackId?: number;
  musicTimeline: ClipFrame[];
  onSaveMusicTimeline: (next: ClipFrame[]) => Promise<void>;
  apiBase: string;
  directorNotes: string;
  setDirectorNotes: (v: string) => void;
  handleSaveNotes: () => void;
  handleShareNotes: () => void;
  canEdit: boolean;
  userRole?: string;
  markers: ProjectMarker[];
  onDeleteMarker: (id: number) => void;
  onMarkerSeek: (time: number) => void;
  onAddMarker?: () => void;
  deptTasks: Task[];
  onTaskStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  tabComments: ProjectComment[];
  onToggleResolved: (id: number) => void;
  onAddComment: (tabId: TabType) => void;
}

const DEFAULT_FRAME_COUNT = 4;
const EMPTY_FRAME: StoryboardFrame = { shotType: '', description: '', imageUrl: '' };

const DirectorTab: React.FC<DirectorTabProps> = ({
  t, scenes, onSaveScenes, projectId,
  timelineDuration, onSaveTimelineDuration,
  timelineDurationInput, setTimelineDurationInput, handleSaveTimelineDuration,
  directorNotes, setDirectorNotes, handleSaveNotes, handleShareNotes,
  canEdit, userRole, markers, onDeleteMarker, onMarkerSeek, onAddMarker,
  deptTasks, onTaskStatusChange,
  tabComments, onToggleResolved, onAddComment,
  projectKind, mediaFiles, audioTrackId, musicTimeline, onSaveMusicTimeline, apiBase,
}) => {
  const masterAudio = mediaFiles.find(f => f.id === audioTrackId && f.type === 'audio');
  const showMusicClip = (projectKind === 'music_video' || projectKind === 'commercial') && !!masterAudio;
  const [frameEditorOpen, setFrameEditorOpen] = useState(false);
  const [editorSceneId, setEditorSceneId] = useState<string | null>(null);
  const [editorFrameIdx, setEditorFrameIdx] = useState<number>(0);
  const [editorDraft, setEditorDraft] = useState<StoryboardFrame>({ ...EMPTY_FRAME });
  const [collapsedScenes, setCollapsedScenes] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(false);

  // Auto / manual timeline duration mode — per-project, stored locally.
  // When 'auto', timeline length = sum of all frame durations (updated on save).
  // When 'manual', the value stays whatever the user typed.
  const tlAutoKey = `synchub-timeline-auto-${projectId}`;
  const [timelineAuto, setTimelineAuto] = useState<boolean>(() => {
    const stored = localStorage.getItem(tlAutoKey);
    return stored === null ? true : stored === '1';
  });
  const setTimelineAutoPersisted = (v: boolean) => {
    setTimelineAuto(v);
    localStorage.setItem(tlAutoKey, v ? '1' : '0');
  };

  const openFrameEditor = (scene: Scene, frameIdx: number) => {
    const frames = scene.frames ?? [];
    const existing = frames[frameIdx] ?? { ...EMPTY_FRAME };
    setEditorSceneId(scene.id);
    setEditorFrameIdx(frameIdx);
    setEditorDraft({ ...existing });
    setFrameEditorOpen(true);
  };

  const handleSaveFrame = async () => {
    if (!editorSceneId) return;
    const updated = scenes.map(s => {
      if (s.id !== editorSceneId) return s;
      const frameCount = s.storyboardFrameCount || DEFAULT_FRAME_COUNT;
      const frames = Array.from({ length: frameCount }, (_, i) => (s.frames ?? [])[i] ?? { ...EMPTY_FRAME });
      frames[editorFrameIdx] = { ...editorDraft };
      return { ...s, frames };
    });
    await onSaveScenes(updated);
    setFrameEditorOpen(false);
  };

  const handleDeleteFrame = async () => {
    if (!editorSceneId) return;
    const updated = scenes.map(s => {
      if (s.id !== editorSceneId) return s;
      const frameCount = s.storyboardFrameCount || DEFAULT_FRAME_COUNT;
      const frames = Array.from({ length: frameCount }, (_, i) => (s.frames ?? [])[i] ?? { ...EMPTY_FRAME });
      frames[editorFrameIdx] = { ...EMPTY_FRAME };
      return { ...s, frames };
    });
    await onSaveScenes(updated);
    setFrameEditorOpen(false);
  };

  const handleFrameCountChange = async (sceneId: string, count: number) => {
    await onSaveScenes(scenes.map(s =>
      s.id === sceneId ? { ...s, storyboardFrameCount: Math.max(1, count) } : s
    ));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setEditorDraft(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch { /* ignore */ }
    e.target.value = '';
  };

  const toggleSceneCollapse = (id: string) => {
    setCollapsedScenes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const collapseAll = () => setCollapsedScenes(new Set(scenes.map(s => s.id)));
  const expandAll = () => setCollapsedScenes(new Set());

  const sortedScenes = [...scenes].sort((a, b) => a.number - b.number);
  const currentEditorScene = scenes.find(s => s.id === editorSceneId);

  // ── Aggregate stats ──
  const totalFramesPlanned = sortedScenes.reduce(
    (sum, s) => sum + (s.storyboardFrameCount || DEFAULT_FRAME_COUNT), 0
  );
  const totalFramesFilled = sortedScenes.reduce((sum, s) => {
    const frames = s.frames ?? [];
    return sum + frames.filter(f => f && (f.imageUrl || f.description || f.shotType)).length;
  }, 0);
  const totalDurationSec = sortedScenes.reduce((sum, s) => {
    const frames = s.frames ?? [];
    return sum + frames.reduce((fSum, f) => fSum + (f?.duration || 0), 0);
  }, 0);
  const coveragePct = totalFramesPlanned > 0
    ? Math.round((totalFramesFilled / totalFramesPlanned) * 100)
    : 0;

  const allCollapsed = scenes.length > 0 && collapsedScenes.size === scenes.length;

  // ── Flat list of all frames across all scenes — used for prev/next navigation ──
  const flatFrames = useMemo(() => {
    const list: Array<{ sceneId: string; sceneNumber: number; sceneTitle: string; frameIdx: number; total: number }> = [];
    for (const s of sortedScenes) {
      const total = s.storyboardFrameCount || DEFAULT_FRAME_COUNT;
      for (let i = 0; i < total; i++) {
        list.push({ sceneId: s.id, sceneNumber: s.number, sceneTitle: s.title, frameIdx: i, total });
      }
    }
    return list;
  }, [sortedScenes]);

  const currentFlatIndex = useMemo(() => {
    if (!editorSceneId) return -1;
    return flatFrames.findIndex(f => f.sceneId === editorSceneId && f.frameIdx === editorFrameIdx);
  }, [flatFrames, editorSceneId, editorFrameIdx]);

  // ── Auto timeline duration: when ON, push sum of frame durations to server ──
  // Debounced to avoid PATCH spam; persists current scene mutations first.
  const lastAutoSavedRef = useRef<number>(timelineDuration);
  useEffect(() => {
    if (!timelineAuto || !canEdit) return;
    if (totalDurationSec <= 0) return;
    if (totalDurationSec === lastAutoSavedRef.current) return;
    const handle = setTimeout(() => {
      lastAutoSavedRef.current = totalDurationSec;
      onSaveTimelineDuration(totalDurationSec).catch(() => {});
    }, 800);
    return () => clearTimeout(handle);
  }, [timelineAuto, canEdit, totalDurationSec, onSaveTimelineDuration]);

  // Sync the manual input field with the live duration value
  useEffect(() => {
    if (timelineAuto) {
      const mm = Math.floor(timelineDuration / 60);
      const ss = String(timelineDuration % 60).padStart(2, '0');
      setTimelineDurationInput(`${mm}:${ss}`);
    }
  }, [timelineAuto, timelineDuration, setTimelineDurationInput]);

  const navigateFrame = (direction: -1 | 1) => {
    if (currentFlatIndex < 0) return;
    const nextIdx = currentFlatIndex + direction;
    if (nextIdx < 0 || nextIdx >= flatFrames.length) return;
    const target = flatFrames[nextIdx];
    const scene = scenes.find(s => s.id === target.sceneId);
    if (!scene) return;
    const frames = scene.frames ?? [];
    setEditorSceneId(target.sceneId);
    setEditorFrameIdx(target.frameIdx);
    setEditorDraft({ ...(frames[target.frameIdx] ?? EMPTY_FRAME) });
  };

  // Keyboard nav inside the editor
  useEffect(() => {
    if (!frameEditorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateFrame(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateFrame(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="tab-content director-tab">
      {!canEdit && <ReadOnlyBanner t={t} role={userRole} />}

      {/* ── Top toolbar: stats + tools ── */}
      <div className="director-top-row">

        {/* Stats card */}
        <div className="director-stat-card">
          <div className="director-stat-row">
            <div className="director-stat">
              <div className="director-stat-value">{sortedScenes.length}</div>
              <div className="director-stat-label">{t('Сцен')}</div>
            </div>
            <div className="director-stat">
              <div className="director-stat-value">{totalFramesFilled}<span className="director-stat-sub">/{totalFramesPlanned}</span></div>
              <div className="director-stat-label">{t('Кадров')}</div>
            </div>
            <div className="director-stat">
              <div className="director-stat-value">{coveragePct}<span className="director-stat-sub">%</span></div>
              <div className="director-stat-label">{t('Покрытие')}</div>
            </div>
            <div className="director-stat">
              <div className="director-stat-value">
                {Math.floor(totalDurationSec / 60)}:{String(totalDurationSec % 60).padStart(2, '0')}
              </div>
              <div className="director-stat-label">{t('Хронометраж')}</div>
            </div>
          </div>
          <div className="director-coverage-bar">
            <div
              className="director-coverage-bar-fill"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>

        {/* Timeline duration card — auto-syncs to sum of frame durations */}
        <div className="director-tool-card">
          <div className="director-tool-card-head">
            <Clock size={14} className="director-tool-card-icon" />
            <span className="director-tool-card-title">{t('Длительность таймлайна')}</span>
            {timelineAuto && (
              <span className="director-tl-badge director-tl-badge--auto">{t('авто')}</span>
            )}
            {!timelineAuto && (
              <span className="director-tl-badge director-tl-badge--manual">{t('вручную')}</span>
            )}
          </div>
          {timelineAuto ? (
            <>
              <div className="director-tl-auto-value">
                {Math.floor(timelineDuration / 60)}:{String(timelineDuration % 60).padStart(2, '0')}
                <span className="director-tl-auto-hint">{t('= сумма кадров')}</span>
              </div>
              {canEdit && (
                <button
                  className="director-tl-share director-tl-mode-btn"
                  onClick={() => setTimelineAutoPersisted(false)}
                  title={t('Открепить от хронометража')}
                >
                  <Unlock size={12} /> {t('Открепить, задать вручную')}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="director-tool-card-row">
                <input
                  className="form-input director-tl-input"
                  placeholder={t('240 или 4:00')}
                  value={timelineDurationInput}
                  onChange={(e) => setTimelineDurationInput(e.target.value)}
                  disabled={!canEdit}
                />
                {canEdit && (
                  <button className="director-tl-apply" onClick={handleSaveTimelineDuration}>
                    {t('Применить')}
                  </button>
                )}
              </div>
              {canEdit && (
                <button
                  className="director-tl-share director-tl-mode-btn"
                  onClick={() => setTimelineAutoPersisted(true)}
                  title={t('Прикрепить к хронометражу')}
                >
                  <Lock size={12} /> {t('Прикрепить к сумме кадров')}
                </button>
              )}
            </>
          )}
        </div>

        {/* Notes card (collapsible) */}
        <div className={`director-tool-card${showNotes ? ' director-tool-card--active' : ''}`}>
          <button
            className="director-tool-card-head director-tool-card-head--toggle"
            onClick={() => setShowNotes(v => !v)}
          >
            <StickyNote size={14} className="director-tool-card-icon" />
            <span className="director-tool-card-title">{t('Заметки режиссёра')}</span>
            {showNotes ? <ChevronUp size={13} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={13} style={{ marginLeft: 'auto' }} />}
          </button>
          {!showNotes && (
            <div className="director-notes-preview">
              {directorNotes
                ? directorNotes.slice(0, 80) + (directorNotes.length > 80 ? '…' : '')
                : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('Нет заметок')}</span>
              }
            </div>
          )}
          {showNotes && (
            <>
              <textarea
                className="director-notes-editor director-notes-editor--inline"
                placeholder={t('Ваши заметки и идеи по съёмке...')}
                rows={4}
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                disabled={!canEdit}
              />
              <div className="director-notes-actions">
                {canEdit && <button className="director-tl-apply" onClick={handleSaveNotes}>{t('Сохранить')}</button>}
                <button className="director-tl-share" onClick={handleShareNotes}>{t('Поделиться')}</button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Storyboard ── */}
      <div className="storyboard-section">
        <div className="storyboard-toolbar">
          <div className="storyboard-toolbar-left">
            <h3>{t('Раскадровка по сценам')}</h3>
          </div>
          {scenes.length > 0 && (
            <div className="storyboard-toolbar-right">
              <button
                className="storyboard-ctrl-btn"
                onClick={allCollapsed ? expandAll : collapseAll}
              >
                {allCollapsed ? t('Развернуть все') : t('Свернуть все')}
              </button>
            </div>
          )}
        </div>

        {scenes.length === 0 ? (
          <div className="storyboard-empty">
            <Film size={40} style={{ opacity: 0.18 }} />
            <div className="storyboard-empty-title">{t('Нет сцен')}</div>
            <div className="storyboard-empty-hint">{t('Сценарист должен создать сцены — раскадровка привязывается к ним')}</div>
          </div>
        ) : (
          <div className="sb-scene-list">
            {sortedScenes.map(scene => {
              const frameCount = scene.storyboardFrameCount || DEFAULT_FRAME_COUNT;
              const frames = scene.frames ?? [];
              const filledCount = frames.filter(f => f && (f.imageUrl || f.description || f.shotType)).length;
              const isCollapsed = collapsedScenes.has(scene.id);
              const fullCovered = filledCount === frameCount;

              return (
                <div key={scene.id} className={`sb-scene-block${isCollapsed ? ' sb-scene-block--collapsed' : ''}`}>
                  <div
                    className="sb-scene-header"
                    onClick={() => toggleSceneCollapse(scene.id)}
                  >
                    <button className="sb-scene-toggle" title={isCollapsed ? t('Развернуть') : t('Свернуть')}>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    {fullCovered
                      ? <CheckCircle2 size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                      : <Circle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                    <span className="sb-scene-num">Сц. {scene.number}</span>
                    <span className="sb-scene-ie">
                      {scene.interiorExterior === 'INT' ? 'ИНТ' : 'НАТ'} · {scene.dayNight === 'DAY' ? 'ДЕНЬ' : 'НОЧЬ'}
                    </span>
                    <span className="sb-scene-title">{scene.title}</span>
                    <span className="sb-scene-coverage">{filledCount}/{frameCount}</span>
                    <div className="sb-frame-count-ctrl" onClick={e => e.stopPropagation()}>
                      <span className="sb-frame-count-label">{t('Кадров')}:</span>
                      {canEdit ? (
                        <input
                          type="number"
                          min={1}
                          max={50}
                          className="sb-frame-count-input"
                          value={frameCount}
                          onChange={e => handleFrameCountChange(scene.id, parseInt(e.target.value) || 1)}
                          onClick={e => e.stopPropagation()}
                          title={t('Количество кадров в раскадровке')}
                        />
                      ) : (
                        <span className="sb-frame-count-input" style={{ background: 'none', border: 'none', textAlign: 'center' }}>{frameCount}</span>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="sb-frames-row">
                      {Array.from({ length: frameCount }, (_, fi) => {
                        const frame = frames[fi];
                        const filled = frame && (frame.imageUrl || frame.description || frame.shotType);
                        return (
                          <div
                            key={fi}
                            className={`sb-frame${filled ? ' sb-frame--filled' : ''}`}
                            onClick={() => canEdit && openFrameEditor(scene, fi)}
                            title={canEdit ? t('Нажмите для редактирования кадра') : t('Кадр раскадровки')}
                          >
                            <span className="sb-frame-num">{fi + 1}</span>
                            {frame?.imageUrl
                              ? <img src={resolveAssetUrl(frame.imageUrl)} alt="" className="sb-frame-img" />
                              : <div className="sb-frame-placeholder"><Film size={18} style={{ opacity: 0.3 }} /></div>
                            }
                            {frame?.shotType && <div className="sb-frame-type">{frame.shotType}</div>}
                            {frame?.description && <div className="sb-frame-desc">{frame.description}</div>}
                            {frame?.duration ? <div className="sb-frame-dur">{frame.duration}с</div> : null}
                            {frame?.editorShotUrl && (
                              <div className="sb-frame-editor-badge" title={t('Монтажёр загрузил финальный шот')}>
                                <CheckCircle2 size={11} /> {t('шот')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Frame editor modal — z-index above header (.modal already at 1000, header at 100) */}
      <Modal
        title={`${t('Кадр')} ${editorFrameIdx + 1}/${currentEditorScene?.storyboardFrameCount || DEFAULT_FRAME_COUNT} — ${t('Сц.')} ${currentEditorScene?.number ?? ''} ${currentEditorScene?.title ?? ''}`}
        isOpen={frameEditorOpen}
        onClose={() => setFrameEditorOpen(false)}
        actions={
          <>
            <button
              className="secondary-btn sb-nav-btn"
              onClick={() => navigateFrame(-1)}
              disabled={currentFlatIndex <= 0}
              title={`${t('Предыдущий кадр')} (←)`}
            >
              <ChevronLeft size={14} /> {t('Назад')}
            </button>
            <button
              className="secondary-btn sb-nav-btn"
              onClick={() => navigateFrame(1)}
              disabled={currentFlatIndex < 0 || currentFlatIndex >= flatFrames.length - 1}
              title={`${t('Следующий кадр')} (→)`}
            >
              {t('Вперёд')} <ChevronRight size={14} />
            </button>
            <span className="sb-nav-counter">
              {currentFlatIndex + 1} / {flatFrames.length}
            </span>
            <span style={{ flex: 1 }} />
            <button className="secondary-btn" style={{ color: 'var(--error)' }} onClick={handleDeleteFrame}>
              {t('Очистить')}
            </button>
            <button className="secondary-btn" onClick={() => setFrameEditorOpen(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveFrame}>{t('Сохранить')}</button>
          </>
        }
      >
        <div className="sb-editor sb-editor--split">
          <div className="sb-editor-image-side">
            {editorDraft.imageUrl ? (
              <div className="sb-editor-preview-big">
                <img src={resolveAssetUrl(editorDraft.imageUrl)} alt="" className="sb-editor-img-big" />
                <button className="sb-editor-remove-img" onClick={() => setEditorDraft(p => ({ ...p, imageUrl: '' }))}>
                  {t('Удалить фото')}
                </button>
              </div>
            ) : (
              <label className="sb-editor-upload sb-editor-upload--big">
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <Upload size={28} />
                <span>{t('Добавить фото кадра')}</span>
                <span className="sb-editor-upload-hint">{t('PNG / JPG до 5 МБ')}</span>
              </label>
            )}
          </div>

          <div className="sb-editor-form-side">
            <div>
              <div className="form-label">{t('Тип плана')}</div>
              <select
                className="form-input"
                value={editorDraft.shotType}
                onChange={e => setEditorDraft(p => ({ ...p, shotType: e.target.value }))}
              >
                <option value="">{t('Выбрать тип плана...')}</option>
                {SHOT_TYPES.map(st => (
                  <option key={st.code} value={st.code}>{st.code} — {st.label}</option>
                ))}
              </select>
            </div>

            <div className="sb-editor-duration-row">
              <label className="sb-editor-duration-label">{t('Длит. кадра (сек)')}:</label>
              <input
                type="number"
                className="form-input sb-editor-duration-input"
                min={0}
                max={9999}
                placeholder="0"
                value={editorDraft.duration ?? ''}
                onChange={e => setEditorDraft(p => ({
                  ...p,
                  duration: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0)
                }))}
              />
            </div>

            <textarea
              className="form-input"
              placeholder={t('Описание кадра: действие, персонажи, атмосфера...')}
              value={editorDraft.description}
              onChange={e => setEditorDraft(p => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>
        </div>
      </Modal>

      {/* ── Music clip timeline — only when projectKind requires it and audio is set ── */}
      {showMusicClip && masterAudio && (
        <MusicClipTimeline
          t={t}
          scenes={scenes}
          audioFile={masterAudio}
          apiBase={apiBase}
          timeline={musicTimeline}
          onSave={onSaveMusicTimeline}
          canEdit={canEdit}
        />
      )}

      {/* When music clip is supported but no audio yet — show CTA */}
      {(projectKind === 'music_video' || projectKind === 'commercial') && !masterAudio && (
        <div className="music-clip-empty">
          <div className="music-clip-empty-title">{t('Раскадровка под музыку — ожидает трек')}</div>
          <div className="music-clip-empty-hint">
            {t('Звукорежиссёр должен выбрать главный аудио-трек на вкладке «Звук» — после этого здесь появится таймлайн.')}
          </div>
        </div>
      )}

      <TabCommentsPanel t={t} comments={tabComments} tabId="director" canEdit={canEdit} onToggleResolved={onToggleResolved} onAddComment={onAddComment} />
      <TabTasksPanel t={t} tasks={deptTasks} canEdit={canEdit} onStatusChange={onTaskStatusChange} />
      <TabMarkersPanel
        t={t} markers={markers} tabId="director"
        canEdit={canEdit} onDelete={onDeleteMarker} onSeek={onMarkerSeek} onAddMarker={onAddMarker}
      />
    </div>
  );
};

export default DirectorTab;
