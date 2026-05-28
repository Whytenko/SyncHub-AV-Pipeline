import React from 'react';
import { Music, Film, Upload, Eye, MessageSquarePlus, Reply } from 'lucide-react';
import type { MediaFile, DocumentFile, ProjectComment, TabType } from '../../../types';

const tabColorEdit = '#FF391A';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export interface EditTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  mediaFiles: MediaFile[];
  selectedMedia: MediaFile | null;
  setSelectedMediaId: (id: number | null) => void;
  openMediaModal: () => void;
  currentTime: number;
  timelineDuration: number;
  commentsByTabEdit: ProjectComment[];
  handleToggleResolved: (id: number) => void;
  openCommentModal: (tab: TabType) => void;
  documents: DocumentFile[];
  setPreviewDocument: (doc: DocumentFile | null) => void;
  openDocModal: () => void;
}

const EditTab: React.FC<EditTabProps> = ({
  t, mediaFiles, selectedMedia, setSelectedMediaId, openMediaModal,
  currentTime, timelineDuration,
  commentsByTabEdit, handleToggleResolved, openCommentModal,
  documents, setPreviewDocument, openDocModal
}) => (
  <div className="tab-content edit-tab">
    <div className="columns-container">
      {/* Media library */}
      <div className="column media-column">
        <h3>{t('Медиатека')}</h3>
        <div className="media-list">
          {mediaFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              className={`media-item ${selectedMedia?.id === file.id ? 'active' : ''}`}
              onClick={() => setSelectedMediaId(file.id)}
            >
              <div className="media-icon">
                {file.type === 'audio' ? <Music size={18} /> : <Film size={18} />}
              </div>
              <div className="media-info">
                <div className="media-name">{file.name}</div>
                <div className="media-duration">{file.duration} • {file.size}</div>
              </div>
            </button>
          ))}
          {mediaFiles.length === 0 && (
            <div className="empty-state-rich">
              <Film size={32} className="empty-state-icon" />
              <div className="empty-state-text">{t('Медиафайлов пока нет')}</div>
              <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={openMediaModal}>
                {t('Добавить файл')}
              </button>
            </div>
          )}
        </div>
        <button className="upload-btn" onClick={openMediaModal}>
          <Upload size={20} className="upload-icon" />
          {t('Загрузить медиа')}
        </button>
      </div>

      {/* Preview */}
      <div className="column preview-column">
        <div className="video-preview">
          {selectedMedia ? (
            <div className="media-preview-card">
              <div className="media-preview-head">
                {selectedMedia.type === 'audio'
                  ? <Music size={18} className="preview-icon" />
                  : <Film size={18} className="preview-icon" />}
                <div className="media-preview-titles">
                  <div className="media-preview-name">{selectedMedia.name}</div>
                  <div className="media-preview-meta">
                    {t('Тип: {type} • {duration} • {size}', {
                      type: selectedMedia.type,
                      duration: selectedMedia.duration,
                      size: selectedMedia.size
                    })}
                  </div>
                </div>
              </div>
              <div className="media-preview-progress">
                <div
                  className="media-preview-progress-bar"
                  style={{ width: `${Math.min(100, (currentTime / Math.max(timelineDuration, 1)) * 100)}%` }}
                />
              </div>
              <div className="media-preview-time">
                {fmt(currentTime)} / {fmt(timelineDuration)}
              </div>
            </div>
          ) : (
            <div className="placeholder-video">
              <Eye size={16} className="preview-icon" />
              <div className="video-placeholder-text">{t('Выберите медиафайл для предпросмотра')}</div>
            </div>
          )}
        </div>

        {/* Documents */}
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
        <button className="upload-btn" style={{ marginTop: documents.length > 0 ? 8 : 16 }} onClick={openDocModal}>
          <Upload size={16} className="upload-icon" />
          {t('Загрузить документ')}
        </button>
      </div>

      {/* Comments */}
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

export default EditTab;
