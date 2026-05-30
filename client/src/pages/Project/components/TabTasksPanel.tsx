import React from 'react';
import { ClipboardList, CalendarDays, User2, AlertTriangle } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '../../../types';

const priorityColor: Record<TaskPriority, string> = {
  low: '#6b7280', medium: '#2196F3', high: '#FF9800', critical: '#FF391A'
};
const statusColor: Record<TaskStatus, string> = {
  todo: '#6b7280', in_progress: '#2196F3', review: '#9C27B0',
  approved: '#22c55e', changes: '#FF9800', blocked: '#FF391A'
};
const isOverdue = (d?: string) => !!d && new Date(d).getTime() < Date.now();
const isDueSoon = (d?: string) => {
  if (!d) return false;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= 3;
};
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : null;

interface TabTasksPanelProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  tasks: Task[];
  canEdit: boolean;
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
}

const TabTasksPanel: React.FC<TabTasksPanelProps> = ({ t, tasks, canEdit, onStatusChange }) => {
  const statusLabel: Record<TaskStatus, string> = {
    todo: t('К выполнению'), in_progress: t('В работе'), review: t('На проверке'),
    approved: t('Утверждено'), changes: t('Правки'), blocked: t('Заблокировано')
  };
  const priorityLabel: Record<TaskPriority, string> = {
    low: t('Низкий'), medium: t('Средний'), high: t('Высокий'), critical: t('Критический')
  };

  const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'approved', 'changes', 'blocked'];
  const active = tasks.filter(tk => tk.status !== 'approved');
  const done = tasks.filter(tk => tk.status === 'approved');

  return (
    <div className="tab-tasks-panel">
      <div className="tab-tasks-header">
        <ClipboardList size={14} />
        <span>{t('Задачи отдела')}</span>
        {tasks.length > 0 && (
          <span className="tab-tasks-count">{active.length > 0 ? active.length : `${done.length} ✓`}</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="tab-tasks-empty">{t('Менеджер ещё не назначил задач этому отделу')}</div>
      ) : (
        <div className="tab-tasks-list">
          {tasks.map(task => {
            const overdue = isOverdue(task.dueDate);
            const soon = isDueSoon(task.dueDate);
            return (
              <div
                key={task.id}
                className={`tab-task-row${task.status === 'blocked' ? ' tab-task-row--blocked' : ''}${task.status === 'approved' ? ' tab-task-row--done' : ''}`}
              >
                <span
                  className="tab-task-priority"
                  style={{ background: priorityColor[task.priority] }}
                  title={priorityLabel[task.priority]}
                />
                <div className="tab-task-body">
                  <span className="tab-task-title">{task.title}</span>
                  {task.description && (
                    <span className="tab-task-desc">{task.description}</span>
                  )}
                  <div className="tab-task-meta">
                    {task.assignee && (
                      <span className="tab-task-assignee"><User2 size={10} /> {task.assignee}</span>
                    )}
                    {task.sceneRef && (
                      <span className="tab-task-scene">{task.sceneRef}</span>
                    )}
                    {task.dueDate && (
                      <span className={`tab-task-due${overdue ? ' tab-task-due--overdue' : soon ? ' tab-task-due--soon' : ''}`}>
                        {overdue && <AlertTriangle size={10} />}
                        <CalendarDays size={10} /> {fmtDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <select
                    className="tab-task-status-select"
                    value={task.status}
                    style={{ borderColor: statusColor[task.status], color: statusColor[task.status] }}
                    onClick={e => e.stopPropagation()}
                    onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
                  >
                    {STATUS_ORDER.map(s => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                )}
                {!canEdit && (
                  <span className="tab-task-status-badge" style={{ color: statusColor[task.status] }}>
                    {statusLabel[task.status]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TabTasksPanel;
