import React from 'react';
import { Music, MapPinPlus, MessageSquarePlus, Reply } from 'lucide-react';
import type { ProjectMarker, ProjectComment, TabType } from '../../../types';

const tabColorSound = '#06b6d4';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export interface SoundTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  soundMarkers: ProjectMarker[];
  commentsByTabSound: ProjectComment[];
  handleToggleResolved: (id: number) => void;
  openCommentModal: (tab: TabType) => void;
  openMarkerModal: () => void;
  handleOpenTimelineMarkerDetails: (marker: ProjectMarker) => void;
}

const SoundTab: React.FC<SoundTabProps> = ({
  t, soundMarkers, commentsByTabSound,
  handleToggleResolved, openCommentModal, openMarkerModal, handleOpenTimelineMarkerDetails
}) => (
  <div className="tab-content sound-tab">
    <div className="sound-layout">
      <div className="sound-markers-col">
        <div className="sound-markers-head">
          <h3>{t('Звуковые метки')}</h3>
          <button className="add-marker-btn" onClick={openMarkerModal}>
            <MapPinPlus size={16} className="add-marker-icon" />
            {t('Добавить метку')}
          </button>
        </div>
        <p className="sound-hint">{t('Переместите курсор таймлайна на нужную позицию, затем нажмите «Добавить метку».')}</p>
        {soundMarkers.length === 0 ? (
          <div className="empty-state-rich">
            <Music size={32} className="empty-state-icon" />
            <div className="empty-state-text">{t('Звуковых меток пока нет')}</div>
            <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={openMarkerModal}>
              {t('Добавить метку')}
            </button>
          </div>
        ) : (
          <div className="sound-markers-list">
            {soundMarkers.map((marker) => (
              <div
                key={marker.id}
                className="sound-marker-row"
                onClick={() => handleOpenTimelineMarkerDetails(marker)}
              >
                <div className="sound-marker-time" style={{ color: tabColorSound }}>
                  {fmt(marker.time)}
                </div>
                <div className="sound-marker-info">
                  <div className="sound-marker-title">{marker.title}</div>
                  {marker.comment && <div className="sound-marker-desc">{marker.comment}</div>}
                </div>
                <div className="sound-marker-dot" style={{ background: tabColorSound }} />
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
  </div>
);

export default SoundTab;
