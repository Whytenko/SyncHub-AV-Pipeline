import React, { useState } from 'react';
import { Film, Upload } from 'lucide-react';
import type { StoryboardFrame, ProjectMarker, Task, TaskStatus, ProjectComment, TabType, Scene } from '../../../types';
import TabMarkersPanel from '../components/TabMarkersPanel';
import TabTasksPanel from '../components/TabTasksPanel';
import TabCommentsPanel from '../components/TabCommentsPanel';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import Modal from '../../../components/Modal';

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
  timelineDurationInput: string;
  setTimelineDurationInput: (v: string) => void;
  handleSaveTimelineDuration: () => void;
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
  t, scenes, onSaveScenes,
  timelineDurationInput, setTimelineDurationInput, handleSaveTimelineDuration,
  directorNotes, setDirectorNotes, handleSaveNotes, handleShareNotes,
  canEdit, userRole, markers, onDeleteMarker, onMarkerSeek, onAddMarker,
  deptTasks, onTaskStatusChange,
  tabComments, onToggleResolved, onAddComment,
}) => {
  const [frameEditorOpen, setFrameEditorOpen] = useState(false);
  const [editorSceneId, setEditorSceneId] = useState<string | null>(null);
  const [editorFrameIdx, setEditorFrameIdx] = useState<number>(0);
  const [editorDraft, setEditorDraft] = useState<StoryboardFrame>({ ...EMPTY_FRAME });

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

  const sortedScenes = [...scenes].sort((a, b) => a.number - b.number);
  const currentEditorScene = scenes.find(s => s.id === editorSceneId);

  return (
    <div className="tab-content director-tab">
      {!canEdit && <ReadOnlyBanner t={t} role={userRole} />}

      {/* Scene-based storyboard */}
      <div className="storyboard-section">
        <div className="storyboard-toolbar">
          <div className="storyboard-toolbar-left">
            <h3>{t('Раскадровка')}</h3>
            {scenes.length > 0 && (
              <span className="storyboard-dims">{scenes.length} сцен</span>
            )}
          </div>
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

              return (
                <div key={scene.id} className="sb-scene-block">
                  <div className="sb-scene-header">
                    <span className="sb-scene-num">Сц. {scene.number}</span>
                    <span className="sb-scene-ie">{scene.interiorExterior === 'INT' ? 'ИНТ' : 'НАТ'} · {scene.dayNight === 'DAY' ? 'ДЕНЬ' : 'НОЧЬ'}</span>
                    <span className="sb-scene-title">{scene.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {filledCount}/{frameCount} кадров
                    </span>
                    <div className="sb-frame-count-ctrl">
                      <span className="sb-frame-count-label">Кадров:</span>
                      {canEdit ? (
                        <input
                          type="number"
                          min={1}
                          max={50}
                          className="sb-frame-count-input"
                          value={frameCount}
                          onChange={e => handleFrameCountChange(scene.id, parseInt(e.target.value) || 1)}
                          onClick={e => e.stopPropagation()}
                          title="Количество кадров в раскадровке"
                        />
                      ) : (
                        <span className="sb-frame-count-input" style={{ background: 'none', border: 'none', textAlign: 'center' }}>{frameCount}</span>
                      )}
                    </div>
                  </div>

                  <div className="sb-frames-row">
                    {Array.from({ length: frameCount }, (_, fi) => {
                      const frame = frames[fi];
                      const filled = frame && (frame.imageUrl || frame.description || frame.shotType);
                      return (
                        <div
                          key={fi}
                          className={`sb-frame${filled ? ' sb-frame--filled' : ''}`}
                          onClick={() => canEdit && openFrameEditor(scene, fi)}
                          title={canEdit ? 'Нажмите для редактирования кадра' : 'Кадр раскадровки'}
                        >
                          <span className="sb-frame-num">{fi + 1}</span>
                          {frame?.imageUrl
                            ? <img src={frame.imageUrl} alt="" className="sb-frame-img" />
                            : <div className="sb-frame-placeholder"><Film size={18} style={{ opacity: 0.3 }} /></div>
                          }
                          {frame?.shotType && <div className="sb-frame-type">{frame.shotType}</div>}
                          {frame?.description && <div className="sb-frame-desc">{frame.description}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Secondary row */}
      <div className="director-secondary-row">
        <div className="director-secondary-card">
          <div className="director-secondary-title">{t('Параметры таймлайна')}</div>
          <div className="timeline-duration-form">
            <input
              className="form-input timeline-duration-input"
              placeholder={t('Например 240 или 4:00')}
              value={timelineDurationInput}
              onChange={(e) => setTimelineDurationInput(e.target.value)}
            />
            <button className="save-notes-btn save-timeline-btn" onClick={handleSaveTimelineDuration}>
              {t('Применить')}
            </button>
          </div>
        </div>

        <div className="director-secondary-card director-secondary-card--notes">
          <div className="director-secondary-title">{t('Заметки режиссёра')}</div>
          <textarea
            className="director-notes-editor"
            placeholder={t('Ваши заметки и идеи по съемке...')}
            rows={5}
            value={directorNotes}
            onChange={(e) => setDirectorNotes(e.target.value)}
          />
          <div className="notes-actions">
            {canEdit && <button className="save-notes-btn" onClick={handleSaveNotes}>{t('Сохранить')}</button>}
            <button className="share-notes-btn" onClick={handleShareNotes}>{t('Поделиться')}</button>
          </div>
        </div>
      </div>

      {/* Scene storyboard coverage summary */}
      {scenes.length > 0 && (
        <div className="director-scene-coverage">
          <div className="director-scene-coverage-title">
            <Film size={13} /> Покрытие сцен раскадровкой
          </div>
          <div className="director-scene-chips">
            {sortedScenes.map(scene => {
              const frames = scene.frames ?? [];
              const covered = frames.some(f => f && (f.imageUrl || f.description || f.shotType));
              return (
                <div key={scene.id} className={`director-scene-chip${covered ? ' director-scene-chip--covered' : ''}`}>
                  <span>Сц.{scene.number}</span>
                  <span className="director-scene-chip-title">{scene.title.slice(0, 20)}</span>
                  {covered
                    ? <span className="director-scene-chip-ok">Есть</span>
                    : <span className="director-scene-chip-no">Нет</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Frame editor modal */}
      <Modal
        title={`Кадр ${editorFrameIdx + 1} — ${currentEditorScene?.title ?? ''}`}
        isOpen={frameEditorOpen}
        onClose={() => setFrameEditorOpen(false)}
        actions={
          <>
            <button className="secondary-btn" style={{ marginRight: 'auto', color: 'var(--error)' }} onClick={handleDeleteFrame}>
              Очистить
            </button>
            <button className="secondary-btn" onClick={() => setFrameEditorOpen(false)}>Отмена</button>
            <button className="primary-btn" onClick={handleSaveFrame}>Сохранить</button>
          </>
        }
      >
        <div className="sb-editor">
          <div className="sb-editor-img-row">
            {editorDraft.imageUrl ? (
              <div className="sb-editor-preview">
                <img src={editorDraft.imageUrl} alt="" className="sb-editor-img" />
                <button className="sb-editor-remove-img" onClick={() => setEditorDraft(p => ({ ...p, imageUrl: '' }))}>
                  Удалить фото
                </button>
              </div>
            ) : (
              <label className="sb-editor-upload">
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <Upload size={16} /> Добавить фото кадра
              </label>
            )}
          </div>

          <div>
            <div className="form-label">Тип плана</div>
            <select
              className="form-input"
              value={editorDraft.shotType}
              onChange={e => setEditorDraft(p => ({ ...p, shotType: e.target.value }))}
            >
              <option value="">Выбрать тип плана...</option>
              {SHOT_TYPES.map(st => (
                <option key={st.code} value={st.code}>{st.code} — {st.label}</option>
              ))}
            </select>
          </div>

          <div className="sb-editor-duration-row">
            <label className="sb-editor-duration-label">Длит. кадра (сек):</label>
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
            placeholder="Описание кадра: действие, персонажи, атмосфера..."
            value={editorDraft.description}
            onChange={e => setEditorDraft(p => ({ ...p, description: e.target.value }))}
            rows={4}
          />
        </div>
      </Modal>

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
