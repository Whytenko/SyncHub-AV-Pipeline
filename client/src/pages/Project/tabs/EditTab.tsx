import React, { useRef, useState, useCallback } from 'react';
import { Music, Film, Upload, Eye, MessageSquarePlus, Reply, Trash2, Loader, FileText, Scissors, Check, ImagePlus, CheckCircle2 } from 'lucide-react';
import type { MediaFile, DocumentFile, ProjectComment, TabType, ProjectMarker, Task, TaskStatus, Scene, StoryboardFrame } from '../../../types';
import TabMarkersPanel from '../components/TabMarkersPanel';
import TabTasksPanel from '../components/TabTasksPanel';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import FramePairViewer from '../components/FramePairViewer';
import { resolveAssetUrl } from '../../../api/assets';
import { projectsApi } from '../../../api/projects';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const tabColorEdit = '#FF391A';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

const getFileSrc = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

const getDurationFromFile = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const el = file.type.startsWith('audio') ? new Audio() : document.createElement('video');
    el.preload = 'metadata';
    const objUrl = URL.createObjectURL(file);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(objUrl);
      const secs = Math.floor(el.duration);
      resolve(isFinite(secs) ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '—');
    };
    el.onerror = () => { URL.revokeObjectURL(objUrl); resolve('—'); };
    el.src = objUrl;
  });

const DOC_ICONS: Record<string, string> = {
  pdf: 'PDF', doc: 'DOC', docx: 'DOC', xls: 'XLS', xlsx: 'XLS',
  ppt: 'PPT', pptx: 'PPT', txt: 'TXT', png: 'PNG', jpg: 'JPG',
  jpeg: 'JPG', gif: 'GIF', webp: 'WEB', other: 'FILE'
};

const DEFAULT_FRAME_COUNT = 4;
const EMPTY_FRAME: StoryboardFrame = { shotType: '', description: '', imageUrl: '' };

const compressEditorShot = (file: File, maxW = 480, maxH = 320): Promise<string> =>
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


export interface EditTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  projectId: string;
  mediaFiles: MediaFile[];
  selectedMedia: MediaFile | null;
  setSelectedMediaId: (id: number | null) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  timelineDuration: number;
  commentsByTabEdit: ProjectComment[];
  handleToggleResolved: (id: number) => void;
  openCommentModal: (tab: TabType) => void;
  documents: DocumentFile[];
  setPreviewDocument: (doc: DocumentFile | null) => void;
  openDocModal: () => void;
  onUploadMedia: (file: File, duration: string) => Promise<void>;
  onDeleteMedia: (mediaId: number) => Promise<void>;
  onUploadDocument: (file: File) => Promise<void>;
  onDeleteDocument: (docId: number) => Promise<void>;
  canEdit: boolean;
  userRole?: string;
  markers: ProjectMarker[];
  onDeleteMarker: (id: number) => void;
  onMarkerSeek: (time: number) => void;
  onAddMarker?: () => void;
  deptTasks: Task[];
  onTaskStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  scenes: Scene[];
  onSceneStatusChange: (sceneId: string, status: 'edited' | 'approved') => Promise<void>;
  onSaveScenes: (scenes: Scene[]) => Promise<void>;
}

const EditTab: React.FC<EditTabProps> = ({
  t, mediaFiles, selectedMedia, setSelectedMediaId,
  currentTime, setCurrentTime, timelineDuration,
  commentsByTabEdit, handleToggleResolved, openCommentModal,
  documents, setPreviewDocument,
  onUploadMedia, onDeleteMedia,
  onUploadDocument, onDeleteDocument,
  canEdit, userRole, markers, onDeleteMarker, onMarkerSeek, onAddMarker,
  deptTasks, onTaskStatusChange,
  scenes, onSceneStatusChange, onSaveScenes, projectId
}) => {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const editorShotInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [shotTarget, setShotTarget] = useState<{ sceneId: string; frameIdx: number } | null>(null);
  const [collapsedShotScenes, setCollapsedShotScenes] = useState<Set<string>>(new Set());
  const [pairViewer, setPairViewer] = useState<{ sceneId: string; frameIdx: number } | null>(null);

  const handleEditorShotUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = shotTarget;
    e.target.value = '';
    if (!file || !target) return;
    try {
      const dataUrl = await compressEditorShot(file);
      const blob = await (await fetch(dataUrl)).blob();
      const { url } = await projectsApi.uploadImage(projectId, blob);
      const updated = scenes.map(s => {
        if (s.id !== target.sceneId) return s;
        const count = s.storyboardFrameCount || DEFAULT_FRAME_COUNT;
        const frames = Array.from({ length: count }, (_, i) => (s.frames ?? [])[i] ?? { ...EMPTY_FRAME });
        frames[target.frameIdx] = { ...frames[target.frameIdx], editorShotUrl: url };
        return { ...s, frames };
      });
      await onSaveScenes(updated);
    } catch { /* ignore */ }
    setShotTarget(null);
  }, [scenes, shotTarget, onSaveScenes, projectId]);

  const triggerShotUpload = (sceneId: string, frameIdx: number) => {
    setShotTarget({ sceneId, frameIdx });
    setTimeout(() => editorShotInputRef.current?.click(), 0);
  };

  const removeEditorShot = async (sceneId: string, frameIdx: number) => {
    const updated = scenes.map(s => {
      if (s.id !== sceneId) return s;
      const count = s.storyboardFrameCount || DEFAULT_FRAME_COUNT;
      const frames = Array.from({ length: count }, (_, i) => (s.frames ?? [])[i] ?? { ...EMPTY_FRAME });
      frames[frameIdx] = { ...frames[frameIdx], editorShotUrl: '' };
      return { ...s, frames };
    });
    await onSaveScenes(updated);
  };

  const toggleShotScene = (id: string) => {
    setCollapsedShotScenes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const matchSortedScenes = [...scenes].sort((a, b) => a.number - b.number);
  const totalFrames = matchSortedScenes.reduce((sum, s) => sum + (s.storyboardFrameCount || 0), 0);
  const matchedFrames = matchSortedScenes.reduce((sum, s) => {
    return sum + (s.frames || []).filter(f => f?.editorShotUrl).length;
  }, 0);
  const matchPct = totalFrames > 0 ? Math.round((matchedFrames / totalFrames) * 100) : 0;

  const handleMediaChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingMedia(true);
    try {
      const duration = await getDurationFromFile(file);
      await onUploadMedia(file, duration);
    } finally { setUploadingMedia(false); }
  }, [onUploadMedia]);

  const handleDocChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingDoc(true);
    try { await onUploadDocument(file); }
    finally { setUploadingDoc(false); }
  }, [onUploadDocument]);

  const handleTimeUpdate = useCallback(() => {
    const el = selectedMedia?.type === 'audio' ? audioRef.current : videoRef.current;
    if (el) setCurrentTime(el.currentTime);
  }, [selectedMedia, setCurrentTime]);

  const mediaSrc = selectedMedia?.url ? getFileSrc(selectedMedia.url) : '';

  return (
    <div className="tab-content edit-tab">
      {!canEdit && <ReadOnlyBanner t={t} role={userRole} />}
      <input ref={mediaInputRef} type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/flac"
        style={{ display: 'none' }} onChange={handleMediaChange} />
      <input ref={docInputRef} type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
        style={{ display: 'none' }} onChange={handleDocChange} />

      {/* ── Соответствие раскадровке: монтажёр загружает шоты под каждый кадр ── */}
      <input
        ref={editorShotInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={handleEditorShotUpload}
      />
      {matchSortedScenes.length > 0 && totalFrames > 0 && (
        <div className="editor-match-section">
          <div className="editor-match-head">
            <div className="editor-match-head-left">
              <Film size={18} style={{ color: '#FF391A' }} />
              <h3 style={{ margin: 0 }}>{t('Соответствие раскадровке')}</h3>
            </div>
            <div className="editor-match-head-stats">
              <span className="editor-match-stat">
                <CheckCircle2 size={13} style={{ color: matchPct === 100 ? '#22c55e' : '#FF9800' }} />
                {matchedFrames} / {totalFrames} {t('кадров загружено')}
              </span>
              <div className="editor-match-bar">
                <div
                  className="editor-match-bar-fill"
                  style={{ width: `${matchPct}%`, background: matchPct === 100 ? '#22c55e' : '#FF391A' }}
                />
              </div>
              <span className="editor-match-pct">{matchPct}%</span>
            </div>
          </div>
          <div className="editor-match-hint">
            {t('Под каждый кадр раскадровки загрузите шот из готового монтажа. Это покажет команде, что порядок соблюдён и ни один кадр не пропущен.')}
          </div>

          <div className="editor-match-scene-list">
            {matchSortedScenes.map(scene => {
              const count = scene.storyboardFrameCount || 0;
              if (count === 0) return null;
              const frames = scene.frames || [];
              const sceneMatched = frames.filter(f => f?.editorShotUrl).length;
              const isCollapsed = collapsedShotScenes.has(scene.id);
              const fullMatched = sceneMatched === count;

              return (
                <div key={scene.id} className={`editor-match-scene${isCollapsed ? ' editor-match-scene--collapsed' : ''}`}>
                  <button className="editor-match-scene-head" onClick={() => toggleShotScene(scene.id)}>
                    {fullMatched
                      ? <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                      : <Film size={14} style={{ color: 'var(--text-muted)' }} />
                    }
                    <span className="editor-match-scene-num">Сц.{scene.number}</span>
                    <span className="editor-match-scene-title">{scene.title}</span>
                    <span className="editor-match-scene-count">{sceneMatched}/{count}</span>
                  </button>

                  {!isCollapsed && (
                    <div className="editor-match-frames">
                      {Array.from({ length: count }, (_, fi) => {
                        const frame = frames[fi];
                        const sb = frame?.imageUrl;
                        const shot = frame?.editorShotUrl;
                        return (
                          <div
                            key={fi}
                            className={`editor-match-frame editor-match-frame--clickable${shot ? ' editor-match-frame--matched' : ''}`}
                            onClick={() => setPairViewer({ sceneId: scene.id, frameIdx: fi })}
                            title={t('Открыть пару')}
                          >
                            <div className="editor-match-frame-num">#{fi + 1}</div>
                            <div className="editor-match-frame-pair">
                              <div className="editor-match-thumb editor-match-thumb--storyboard">
                                {sb
                                  ? <img src={resolveAssetUrl(sb)} alt="" />
                                  : <div className="editor-match-thumb-empty"><Film size={20} style={{ opacity: 0.25 }} /></div>
                                }
                                <span className="editor-match-thumb-label">{t('раскадровка')}</span>
                              </div>
                              <div className="editor-match-arrow">→</div>
                              <div className="editor-match-thumb editor-match-thumb--shot">
                                {shot
                                  ? <img src={resolveAssetUrl(shot)} alt="" />
                                  : <div className="editor-match-thumb-empty"><ImagePlus size={20} style={{ opacity: 0.3 }} /></div>
                                }
                                <span className="editor-match-thumb-label">{t('финальный шот')}</span>
                                {shot && <span className="editor-match-thumb-badge"><Check size={10} /></span>}
                              </div>
                            </div>
                            {canEdit && (
                              <div className="editor-match-frame-actions" onClick={e => e.stopPropagation()}>
                                <button
                                  className="editor-match-upload-btn"
                                  onClick={(e) => { e.stopPropagation(); triggerShotUpload(scene.id, fi); }}
                                  title={shot ? t('Заменить шот') : t('Загрузить шот')}
                                >
                                  <Upload size={11} />
                                  {shot ? t('Заменить') : t('Загрузить')}
                                </button>
                                {shot && (
                                  <button
                                    className="editor-match-clear-btn"
                                    onClick={(e) => { e.stopPropagation(); removeEditorShot(scene.id, fi); }}
                                    title={t('Убрать шот')}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
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
        </div>
      )}

      {pairViewer && (
        <FramePairViewer
          scenes={scenes}
          initial={pairViewer}
          onClose={() => setPairViewer(null)}
          t={t}
        />
      )}

      {/* ── Медиатека / Плеер / Комментарии — ниже основного блока соответствия ── */}
      <div className="columns-container">
        {/* ── Медиатека ── */}
        <div className="column media-column">
          <h3>{t('Медиатека')}</h3>
          <div className="media-list">
            {mediaFiles.length === 0 && !uploadingMedia && (
              <div className="empty-state-rich">
                <Film size={32} className="empty-state-icon" />
                <div className="empty-state-text">{t('Медиафайлов пока нет')}</div>
                <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={() => mediaInputRef.current?.click()}>
                  {t('Загрузить файл')}
                </button>
              </div>
            )}
            {uploadingMedia && (
              <div className="media-upload-progress">
                <Loader size={18} className="media-upload-spinner" />
                <span>{t('Загружаем файл...')}</span>
              </div>
            )}
            {mediaFiles.map((file) => (
              <div key={file.id} className={`media-item-row${selectedMedia?.id === file.id ? ' active' : ''}`}
                onClick={() => setSelectedMediaId(file.id)}>
                <div className="media-icon">
                  {file.type === 'audio' ? <Music size={16} /> : <Film size={16} />}
                </div>
                <div className="media-info">
                  <div className="media-name" title={file.name}>{file.name}</div>
                  <div className="media-duration">{file.duration} · {file.size}</div>
                </div>
                <button className="media-delete-btn" title={t('Удалить')}
                  onClick={(e) => { e.stopPropagation(); onDeleteMedia(file.id); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <button className="upload-btn" onClick={() => mediaInputRef.current?.click()} disabled={uploadingMedia}>
            {uploadingMedia
              ? <><Loader size={16} className="media-upload-spinner" /> {t('Загрузка...')}</>
              : <><Upload size={16} className="upload-icon" /> {t('Загрузить медиа')}</>}
          </button>

          {/* ── Документы ── */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 8 }}>{t('Документы')}</h3>
            {documents.length === 0 && !uploadingDoc && (
              <div className="empty-state" style={{ marginBottom: 8 }}>{t('Документов пока нет')}</div>
            )}
            {uploadingDoc && (
              <div className="media-upload-progress">
                <Loader size={18} className="media-upload-spinner" />
                <span>{t('Загружаем документ...')}</span>
              </div>
            )}
            {documents.map((doc) => (
              <div key={doc.id} className="doc-item-row" onClick={() => setPreviewDocument(doc)}>
                <span className="doc-item-icon">{DOC_ICONS[doc.type?.toLowerCase()] || 'FILE'}</span>
                <div className="doc-item-info">
                  <div className="doc-item-name" title={doc.name}>{doc.name}</div>
                  <div className="doc-item-meta">{doc.size} · {doc.uploadedAt}</div>
                </div>
                <button className="media-delete-btn" title={t('Удалить')}
                  onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button className="upload-btn" style={{ marginTop: 4 }} onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}>
              {uploadingDoc
                ? <><Loader size={14} className="media-upload-spinner" /> {t('Загрузка...')}</>
                : <><FileText size={14} className="upload-icon" /> {t('Загрузить документ')}</>}
            </button>
          </div>
        </div>

        {/* ── Плеер ── */}
        <div className="column preview-column">
          {!selectedMedia ? (
            <div className="placeholder-video">
              <Eye size={32} className="preview-icon" style={{ opacity: 0.3 }} />
              <div className="video-placeholder-text">{t('Выберите медиафайл для воспроизведения')}</div>
            </div>
          ) : !mediaSrc ? (
            <div className="placeholder-video">
              <Film size={32} className="preview-icon" style={{ opacity: 0.3 }} />
              <div className="video-placeholder-text">{t('Файл добавлен вручную — URL недоступен')}</div>
            </div>
          ) : selectedMedia.type === 'audio' ? (
            <div className="audio-player-wrap">
              <div className="audio-player-icon"><Music size={56} style={{ opacity: 0.4 }} /></div>
              <div className="audio-player-name">{selectedMedia.name}</div>
              <audio ref={audioRef} src={mediaSrc} controls className="audio-player-el" onTimeUpdate={handleTimeUpdate} />
              <div className="media-preview-time">{fmt(currentTime)} / {fmt(timelineDuration)}</div>
            </div>
          ) : (
            <div className="video-player-wrap">
              <video ref={videoRef} src={mediaSrc} controls className="video-player-el" onTimeUpdate={handleTimeUpdate} />
              <div className="video-player-meta">
                <span className="video-player-name">{selectedMedia.name}</span>
                <span className="video-player-time">{fmt(currentTime)} / {fmt(timelineDuration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Комментарии ── */}
        <div className="column comments-column">
          <h3>{t('Комментарии к монтажу')}</h3>
          <div className="comments-list">
            {commentsByTabEdit.length === 0 && <div className="empty-state">{t('Комментариев пока нет.')}</div>}
            {commentsByTabEdit.map((comment) => (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <div className="user-badge" style={{ backgroundColor: tabColorEdit }}>{comment.user}</div>
                  <div className="comment-time">{comment.timestamp}</div>
                </div>
                <div className="comment-text">{comment.text}</div>
                <div className="comment-footer">
                  <span className="timestamp" onClick={() => handleToggleResolved(comment.id)}>
                    {comment.resolved ? t('Решено') : t('Не решено')}
                  </span>
                  <button className="reply-btn" onClick={() => openCommentModal('edit')}>
                    <Reply size={14} /> {t('Ответить')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="add-comment-btn" onClick={() => openCommentModal('edit')}>
            <MessageSquarePlus size={16} className="add-comment-icon" />
            {t('Добавить комментарий')}
          </button>
        </div>
      </div>

      {/* Scene progress for post-production */}
      {scenes.some(s => s.status === 'shot' || s.status === 'edited' || s.status === 'approved') && (
        <div className="edit-scenes-panel">
          <div className="edit-scenes-title">Прогресс монтажа</div>
          <div className="edit-scenes-list">
            {scenes.filter(s => s.status === 'shot' || s.status === 'edited' || s.status === 'approved')
              .sort((a, b) => a.number - b.number)
              .map(scene => (
              <div key={scene.id} className="edit-scene-row">
                <span className="scene-number-sm">Сц.{scene.number}</span>
                <span className="edit-scene-title">{scene.title}</span>
                {canEdit && (
                  <div className="edit-scene-actions">
                    {scene.status === 'shot' && (
                      <button className="edit-scene-btn" onClick={() => onSceneStatusChange(scene.id, 'edited')}>
                        <Scissors size={12} /> Смонтировать
                      </button>
                    )}
                    {scene.status === 'edited' && (
                      <button className="edit-scene-btn edit-scene-btn--approve" onClick={() => onSceneStatusChange(scene.id, 'approved')}>
                        <Check size={12} /> Утвердить
                      </button>
                    )}
                    {scene.status === 'approved' && <span style={{ color: '#22c55e', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Утверждено</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <TabTasksPanel t={t} tasks={deptTasks} canEdit={canEdit} onStatusChange={onTaskStatusChange} />
      <TabMarkersPanel
        t={t} markers={markers} tabId="edit"
        canEdit={canEdit} onDelete={onDeleteMarker} onSeek={onMarkerSeek} onAddMarker={onAddMarker}
      />
    </div>
  );
};

export default EditTab;
