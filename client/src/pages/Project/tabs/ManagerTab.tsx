import React from 'react';
import {
  Music, MapPinPlus, Clapperboard, ScrollText, Sparkles,
  Shirt, Zap, ClipboardList, LayoutGrid, List, CalendarDays, User2,
  type LucideIcon
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TabType } from '../../../types';

const tabColors: Record<TabType, string> = {
  script: '#9C27B0',
  director: '#2196F3',
  costumes: '#FF9800',
  makeup: '#E91E63',
  edit: '#FF391A',
  sound: '#06b6d4',
  manager: '#22c55e'
};

const iconMap: Record<string, LucideIcon> = {
  director: Clapperboard,
  script: ScrollText,
  makeup: Sparkles,
  costumes: Shirt,
  edit: Zap,
  sound: Music
};

const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'approved', 'changes', 'blocked'];

const taskStatusColor: Record<TaskStatus, string> = {
  todo: '#6b7280',
  in_progress: '#2196F3',
  review: '#9C27B0',
  approved: '#22c55e',
  changes: '#FF9800',
  blocked: '#FF391A'
};

const priorityColor: Record<TaskPriority, string> = {
  low: '#6b7280',
  medium: '#2196F3',
  high: '#FF9800',
  critical: '#FF391A'
};

const isDueSoon = (dueDate?: string) => {
  if (!dueDate) return false;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= 3;
};
const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
};
const formatDue = (dueDate?: string) => {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export interface ManagerTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  tasks: Task[];
  taskFilterStatus: TaskStatus | 'all';
  setTaskFilterStatus: (s: TaskStatus | 'all') => void;
  taskFilterDept: TabType | 'all';
  setTaskFilterDept: (d: TabType | 'all') => void;
  managerView: 'list' | 'kanban';
  setManagerView: (v: 'list' | 'kanban') => void;
  dragTaskId: string | null;
  setDragTaskId: (id: string | null) => void;
  kanbanDragOver: TaskStatus | null;
  setKanbanDragOver: (s: TaskStatus | null) => void;
  handleOpenNewTask: () => void;
  handleOpenEditTask: (task: Task) => void;
  handleDeleteTask: (id: string) => void;
  handleTaskStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  saveTasks: (tasks: Task[]) => Promise<void>;
}

const ManagerTab: React.FC<ManagerTabProps> = ({
  t, tasks,
  taskFilterStatus, setTaskFilterStatus,
  taskFilterDept, setTaskFilterDept,
  managerView, setManagerView,
  dragTaskId, setDragTaskId,
  kanbanDragOver, setKanbanDragOver,
  handleOpenNewTask, handleOpenEditTask, handleDeleteTask,
  handleTaskStatusChange, saveTasks
}) => {
  const taskStatusLabel: Record<TaskStatus, string> = {
    todo: t('К выполнению'),
    in_progress: t('В работе'),
    review: t('На проверке'),
    approved: t('Утверждено'),
    changes: t('Правки'),
    blocked: t('Заблокировано')
  };
  const priorityLabel: Record<TaskPriority, string> = {
    low: t('Низкий'),
    medium: t('Средний'),
    high: t('Высокий'),
    critical: t('Критический')
  };
  const deptNames: Partial<Record<TabType, string>> = {
    script: t('Сценарий'),
    director: t('Режиссёр'),
    costumes: t('Костюмы'),
    makeup: t('Визаж'),
    edit: t('Монтаж'),
    sound: t('Звук')
  };

  const totalTasks = tasks.length;
  const byStatus = TASK_STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = tasks.filter(tk => tk.status === s).length;
    return acc;
  }, {});

  const visibleTasks = tasks.filter(task => {
    if (taskFilterStatus !== 'all' && task.status !== taskFilterStatus) return false;
    if (taskFilterDept !== 'all' && task.department !== taskFilterDept) return false;
    return true;
  });

  const deptTabs: TabType[] = ['script', 'director', 'costumes', 'makeup', 'edit', 'sound'];
  const healthByDept = deptTabs.map(dep => {
    const depTasks = tasks.filter(tk => tk.department === dep);
    const done = depTasks.filter(tk => tk.status === 'approved').length;
    const blocked = depTasks.filter(tk => tk.status === 'blocked').length;
    const pct = depTasks.length > 0 ? Math.round((done / depTasks.length) * 100) : 0;
    return { dep, total: depTasks.length, done, blocked, pct };
  });

  // ── Task card (shared between list and kanban) ──────────────────
  const renderTaskCard = (task: Task, compact = false) => (
    <div
      key={task.id}
      className={`manager-task-card${task.status === 'blocked' ? ' manager-task-card--blocked' : ''}${dragTaskId === task.id ? ' manager-task-card--dragging' : ''}`}
      draggable
      onDragStart={() => setDragTaskId(task.id)}
      onDragEnd={() => { setDragTaskId(null); setKanbanDragOver(null); }}
      onDragOver={e => e.preventDefault()}
      onDrop={async () => {
        if (!dragTaskId || dragTaskId === task.id) return;
        const from = tasks.findIndex(tk => tk.id === dragTaskId);
        const to = tasks.findIndex(tk => tk.id === task.id);
        if (from === -1 || to === -1) return;
        const reordered = [...tasks];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        await saveTasks(reordered);
        setDragTaskId(null);
      }}
    >
      <div className="manager-task-card-top">
        <span className="manager-task-priority-dot" style={{ background: priorityColor[task.priority] }} title={priorityLabel[task.priority]} />
        <span className="manager-task-title">{task.title}</span>
        {!compact && (
          <div className="manager-task-actions">
            <button className="edit-marker-btn" onClick={() => handleOpenEditTask(task)} title={t('Редактировать')}>✏️</button>
            <button className="edit-marker-btn" style={{ color: 'var(--error)' }} onClick={() => handleDeleteTask(task.id)} title={t('Удалить')}>🗑</button>
          </div>
        )}
        {compact && (
          <button className="craft-icon-btn" style={{ marginLeft: 'auto' }} onClick={() => handleOpenEditTask(task)}>✏️</button>
        )}
      </div>
      {!compact && task.description && <div className="manager-task-desc">{task.description}</div>}
      <div className="manager-task-meta">
        <span className="manager-task-dept" style={{ color: tabColors[task.department] || '#888' }}>
          {deptNames[task.department] || task.department}
        </span>
        {task.assignee && <span className="manager-task-assignee"><User2 size={11} /> {task.assignee}</span>}
        {task.dueDate && (
          <span className={`manager-task-due${isOverdue(task.dueDate) ? ' manager-task-due--overdue' : isDueSoon(task.dueDate) ? ' manager-task-due--soon' : ''}`}>
            <CalendarDays size={11} /> {formatDue(task.dueDate)}
          </span>
        )}
        {!compact && (
          <select
            className={`manager-task-status-select manager-task-status--${task.status}`}
            value={task.status}
            onClick={e => e.stopPropagation()}
            onChange={e => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
            style={{ borderColor: taskStatusColor[task.status], color: taskStatusColor[task.status] }}
          >
            {TASK_STATUS_ORDER.map(s => (
              <option key={s} value={s}>{taskStatusLabel[s]}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  return (
    <div className="tab-content manager-tab">
      <div className="manager-layout">
        {/* Health dashboard */}
        <div className="manager-health-section">
          <div className="manager-section-title">{t('Здоровье проекта')}</div>
          <div className="manager-health-grid">
            {healthByDept.map(({ dep, total, done, blocked, pct }) => (
              <div key={dep} className={`manager-health-card${blocked > 0 ? ' manager-health-card--blocked' : ''}`}>
                <div className="manager-health-card-head">
                  {(() => { const HIcon = iconMap[dep]; return HIcon ? <HIcon size={18} className="manager-health-icon" style={{ color: tabColors[dep] }} /> : null; })()}
                  <span className="manager-health-dept" style={{ color: tabColors[dep] }}>{deptNames[dep]}</span>
                  {blocked > 0 && <span className="manager-health-blocked-badge">⛔ {blocked}</span>}
                </div>
                <div className="manager-health-bar-wrap">
                  <div className="manager-health-bar" style={{ width: `${pct}%`, background: blocked > 0 ? '#FF391A' : tabColors[dep] }} />
                </div>
                <div className="manager-health-stats">
                  <span>{done}/{total} {t('готово')}</span>
                  <span>{pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status summary */}
        <div className="manager-status-row">
          {TASK_STATUS_ORDER.map(s => (
            <div key={s} className="manager-status-pill" style={{ borderColor: taskStatusColor[s] }}>
              <span className="manager-status-count" style={{ color: taskStatusColor[s] }}>{byStatus[s] || 0}</span>
              <span className="manager-status-name">{taskStatusLabel[s]}</span>
            </div>
          ))}
        </div>

        {/* Task board header */}
        <div className="manager-task-head">
          <div className="manager-section-title">{t('Задачи')} ({visibleTasks.length}/{totalTasks})</div>
          <div className="manager-view-toggle">
            <button
              className={`manager-view-btn${managerView === 'list' ? ' manager-view-btn--active' : ''}`}
              onClick={() => setManagerView('list')}
              title={t('Список')}
            >
              <List size={15} />
            </button>
            <button
              className={`manager-view-btn${managerView === 'kanban' ? ' manager-view-btn--active' : ''}`}
              onClick={() => setManagerView('kanban')}
              title={t('Канбан')}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
          <button className="add-marker-btn" onClick={handleOpenNewTask}>
            <MapPinPlus size={16} className="add-marker-icon" />
            {t('Новая задача')}
          </button>
        </div>

        {/* Filters */}
        <div className="manager-filters">
          <div className="manager-filter-group">
            <button className={`manager-filter-chip${taskFilterStatus === 'all' ? ' manager-filter-chip--active' : ''}`} onClick={() => setTaskFilterStatus('all')}>{t('Все')}</button>
            {TASK_STATUS_ORDER.map(s => (
              <button key={s} className={`manager-filter-chip${taskFilterStatus === s ? ' manager-filter-chip--active' : ''}`} style={taskFilterStatus === s ? { borderColor: taskStatusColor[s], color: taskStatusColor[s] } : {}} onClick={() => setTaskFilterStatus(taskFilterStatus === s ? 'all' : s)}>
                {taskStatusLabel[s]} {byStatus[s] > 0 && <span className="manager-filter-count">{byStatus[s]}</span>}
              </button>
            ))}
          </div>
          <div className="manager-filter-group">
            <button className={`manager-filter-chip${taskFilterDept === 'all' ? ' manager-filter-chip--active' : ''}`} onClick={() => setTaskFilterDept('all')}>{t('Все отделы')}</button>
            {(Object.keys(deptNames) as TabType[]).map(dep => (
              <button key={dep} className={`manager-filter-chip${taskFilterDept === dep ? ' manager-filter-chip--active' : ''}`} style={taskFilterDept === dep ? { borderColor: tabColors[dep], color: tabColors[dep] } : {}} onClick={() => setTaskFilterDept(taskFilterDept === dep ? 'all' : dep)}>
                {deptNames[dep]}
              </button>
            ))}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="manager-empty-state">
            <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>{t('Задач пока нет')}</div>
            <button className="add-marker-btn" onClick={handleOpenNewTask}>{t('Создать первую задачу')}</button>
          </div>
        ) : managerView === 'kanban' ? (
          /* ── KANBAN BOARD ── */
          <div className="kanban-board">
            {TASK_STATUS_ORDER.map(colStatus => {
              const colTasks = tasks.filter(tk =>
                tk.status === colStatus &&
                (taskFilterDept === 'all' || tk.department === taskFilterDept)
              );
              const isDropTarget = kanbanDragOver === colStatus;
              return (
                <div
                  key={colStatus}
                  className={`kanban-column${isDropTarget ? ' kanban-column--drop-target' : ''}`}
                  onDragOver={e => { e.preventDefault(); setKanbanDragOver(colStatus); }}
                  onDragLeave={() => setKanbanDragOver(null)}
                  onDrop={async () => {
                    if (!dragTaskId) return;
                    const task = tasks.find(tk => tk.id === dragTaskId);
                    if (task && task.status !== colStatus) {
                      await handleTaskStatusChange(dragTaskId, colStatus);
                    }
                    setDragTaskId(null);
                    setKanbanDragOver(null);
                  }}
                >
                  <div className="kanban-col-head" style={{ borderTopColor: taskStatusColor[colStatus] }}>
                    <span className="kanban-col-title" style={{ color: taskStatusColor[colStatus] }}>{taskStatusLabel[colStatus]}</span>
                    <span className="kanban-col-count">{colTasks.length}</span>
                  </div>
                  <div className="kanban-col-cards">
                    {colTasks.map(task => renderTaskCard(task, true))}
                    {colTasks.length === 0 && (
                      <div className="kanban-col-empty">{t('Нет задач')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="empty-state">{t('Нет задач по выбранным фильтрам')}</div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="manager-task-list">
            {visibleTasks.map(task => renderTaskCard(task, false))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerTab;
