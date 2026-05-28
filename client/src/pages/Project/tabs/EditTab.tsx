import React, { useRef, useState, useCallback } from 'react';
import { Music, Film, Upload, Eye, MessageSquarePlus, Reply, Trash2, Loader } from 'lucide-react';
import type { MediaFile, DocumentFile, ProjectComment, TabType } from '../../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const tabColorEdit = '#FF391A';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

const getMediaSrc = (url?: string) => {
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
}

const EditTab: React.FC<EditTabProps> = ({
  t, mediaFiles, selectedMedia, setSelectedMediaId,
  currentTime, setCurrentTime, timelineDuration,
  commentsByTabEdit, handleToggleResolved, openCommentModal,
  documents, setPreviewDocument, openDocModal,
  onUploadMedia, onDeleteMedia
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadProgress('Определяем длительность...');
    try {
      const duration = await getDurationFromFile(file);
      setUploadProgress('Загружаем файл...');
      await onUploadMedia(file, duration);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [onUploadMedia]);

  const handleTimeUpdate = useCallback(() => {
    const el = selectedMedia?.type === 'audio' ? audioRef.current : videoRef.current;
    if (el) setCurrentTime(el.currentTime);
  }, [selectedMedia, setCurrentTime]);

  const mediaSrc = selectedMedia?.url ? getMediaSrc(selectedMedia.url) : '';

  return (
    <div className="tab-content edit-tab">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/flac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="columns-container">
        {/* Медиатека */}
        <div className="column media-column">
          <h3>{t('Медиатека')}</h3>
          <div className="media-list">
            {mediaFiles.length === 0 && !uploading && (
              <div className="empty-state-rich">
                <Film size={32} className="empty-state-icon" />
                <div className="empty-state-text">{t('Медиафайлов пока нет')}</div>
                <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={() => fileInputRef.current?.click()}>
                  {t('Загрузить файл')}
                </button>
              </div>
            )}
            {uploading && (
              <div className="media-upload-progress">
                <Loader size={18} className="media-upload-spinner" />
                <span>{uploadProgress}</span>
              </div>
            )}
            {mediaFiles.map((file) => (
              <div
                key={file.id}
                className={`media-item-row${selectedMedia?.id === file.id ? ' active' : ''}`}
                onClick={() => setSelectedMediaId(file.id)}
              >
                <div className="media-icon">
                  {file.type === 'audio' ? <Music size={16} /> : <Film size={16} />}
                </div>
                <div className="media-info">
                  <div className="media-name" title={file.name}>{file.name}</div>
                  <div className="media-duration">{file.duration} · {file.size}</div>
                </div>
                <button
                  className="media-delete-btn"
                  title={t('Удалить')}
                  onClick={(e) => { e.stopPropagation(); onDeleteMedia(file.id); }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <button className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading
              ? <><Loader size={16} className="media-upload-spinner" /> {t('Загрузка...')}</>
              : <><Upload size={16} className="upload-icon" /> {t('Загрузить медиа')}</>}
          </button>

          {documents.length > 0 && (
            <div className="documents-list" style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: 13 }}>{t('Документы')}</h4>
              {documents.map((doc) => (
                <div key={doc.id} className="document-item" onClick={() => setPreviewDocument(doc)} style={{ cursor: 'pointer' }}>
                  <span className="document-name">📄 {doc.name}</span>
                  <span className="document-meta">{doc.size}</span>
                </div>
              ))}
            </div>
          )}
          <button className="upload-btn" style={{ marginTop: 8 }} onClick={openDocModal}>
            <Upload size={14} className="upload-icon" /> {t('Загрузить документ')}
          </button>
        </div>

        {/* Плеер */}
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
              <audio
                ref={audioRef}
                src={mediaSrc}
                controls
                className="audio-player-el"
                onTimeUpdate={handleTimeUpdate}
              />
              <div className="media-preview-time">{fmt(currentTime)} / {fmt(timelineDuration)}</div>
            </div>
          ) : (
            <div className="video-player-wrap">
              <video
                ref={videoRef}
                src={mediaSrc}
                controls
                className="video-player-el"
                onTimeUpdate={handleTimeUpdate}
              />
              <div className="video-player-meta">
                <span className="video-player-name">{selectedMedia.name}</span>
                <span className="video-player-time">{fmt(currentTime)} / {fmt(timelineDuration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Комментарии */}
        <div className="column comments-column">
          <h3>{t('Комментарии к монтажу')}</h3>
          <div className="comments-list">
            {commentsByTabEdit.length === 0 && (
              <div className="empty-state">{t('Комментариев пока нет.')}</div>
            )}
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
    </div>
  );
};

export default EditTab;
