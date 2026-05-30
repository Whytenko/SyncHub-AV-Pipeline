import React from 'react';
import { MessageSquarePlus, MessageCircle, Reply, CheckCircle2, Circle } from 'lucide-react';
import type { ProjectComment, TabType } from '../../../types';

interface TabCommentsPanelProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  comments: ProjectComment[];
  tabId: TabType;
  canEdit: boolean;
  onToggleResolved: (id: number) => void;
  onAddComment: (tabId: TabType) => void;
}

const TabCommentsPanel: React.FC<TabCommentsPanelProps> = ({
  t, comments, tabId, canEdit, onToggleResolved, onAddComment
}) => {
  const tabComments = comments
    .filter(c => c.tabId === tabId)
    .sort((a, b) => (a.resolved ? 1 : 0) - (b.resolved ? 1 : 0));

  const unresolvedCount = tabComments.filter(c => !c.resolved).length;

  return (
    <div className="tab-comments-panel">
      <div className="tab-comments-header">
        <MessageCircle size={14} />
        <span>{t('Комментарии')}</span>
        {unresolvedCount > 0 && (
          <span className="tab-comments-badge">{unresolvedCount}</span>
        )}
        {canEdit && (
          <button
            className="tab-comments-add-btn"
            onClick={() => onAddComment(tabId)}
            title={t('Добавить комментарий')}
          >
            <MessageSquarePlus size={13} />
            {t('Добавить')}
          </button>
        )}
      </div>

      {tabComments.length === 0 ? (
        <div className="tab-comments-empty">
          {canEdit
            ? t('Нет комментариев — нажмите «Добавить» чтобы оставить заметку команде')
            : t('Комментариев пока нет')}
        </div>
      ) : (
        <div className="tab-comments-list">
          {tabComments.map(comment => (
            <div
              key={comment.id}
              className={`tab-comment-row${comment.resolved ? ' tab-comment-row--resolved' : ''}`}
            >
              <button
                className="tab-comment-resolve-btn"
                title={comment.resolved ? t('Снять отметку «Решено»') : t('Отметить как решено')}
                onClick={() => onToggleResolved(comment.id)}
              >
                {comment.resolved
                  ? <CheckCircle2 size={14} className="tab-comment-resolved-icon" />
                  : <Circle size={14} className="tab-comment-open-icon" />}
              </button>
              <div className="tab-comment-body">
                <div className="tab-comment-meta">
                  <span className="tab-comment-user">{comment.user}</span>
                  <span className="tab-comment-time">{comment.timestamp}</span>
                  {comment.resolved && (
                    <span className="tab-comment-resolved-badge">{t('Решено')}</span>
                  )}
                </div>
                <div className="tab-comment-text">{comment.text}</div>
              </div>
              {canEdit && (
                <button
                  className="tab-comment-reply-btn"
                  onClick={() => onAddComment(tabId)}
                  title={t('Ответить')}
                >
                  <Reply size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TabCommentsPanel;
