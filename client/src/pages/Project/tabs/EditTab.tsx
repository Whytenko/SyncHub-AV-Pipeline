import React, { useRef, useState, useCallback } from 'react';
import { Music, Film, Upload, Eye, MessageSquarePlus, Reply, Trash2, Loader, FileText } from 'lucide-react';
import type { MediaFile, DocumentFile, ProjectComment, TabType, ProjectMarker, Task, TaskStatus, Scene } from '../../../types';
import TabMarkersPanel from '../components/TabMarkersPanel';
import TabTasksPanel from '../components/TabTasksPanel';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

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
  scenes, onSceneStatusChange
}) => {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
                <span className="doc-item-icon">{DOC_ICONS[doc.type?.toLowerCase()] || '📎'}</span>
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
                        ✂️ Смонтировать
                      </button>
                    )}
                    {scene.status === 'edited' && (
                      <button className="edit-scene-btn edit-scene-btn--approve" onClick={() => onSceneStatusChange(scene.id, 'approved')}>
                        ✓ Утвердить
                      </button>
                    )}
                    {scene.status === 'approved' && <span style={{ color: '#22c55e', fontSize: 12 }}>✓ Утверждено</span>}
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
