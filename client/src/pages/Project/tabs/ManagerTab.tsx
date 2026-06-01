import React, { useState, useRef } from 'react';
import {
  Music, MapPinPlus, Clapperboard, ScrollText, Sparkles,
  Shirt, Zap, ClipboardList, LayoutGrid, List, CalendarDays, User2,
  Download, TrendingUp, AlertTriangle, MessageCircle, Plus, Pencil,
  Trash2, Ban, X,
  type LucideIcon
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TabType, ProjectComment, Scene, ShootingDay, ProductionStage } from '../../../types';
import ShootingCalendar from '../components/ShootingCalendar';

const tabColors: Record<TabType, string> = {
  script: '#9C27B0', director: '#2196F3', costumes: '#FF9800',
  makeup: '#E91E63', edit: '#FF391A', sound: '#06b6d4', manager: '#22c55e'
};

const tabLabels: Partial<Record<TabType, string>> = {
  script: 'Сценарий', director: 'Режиссёр', costumes: 'Костюмы',
  makeup: 'Визаж', edit: 'Монтаж', sound: 'Звук'
};

const iconMap: Record<string, LucideIcon> = {
  director: Clapperboard, script: ScrollText, makeup: Sparkles,
  costumes: Shirt, edit: Zap, sound: Music
};

const DEPT_TABS: TabType[] = ['script', 'director', 'costumes', 'makeup', 'edit', 'sound'];
const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'approved', 'changes', 'blocked'];

const statusColor: Record<TaskStatus, string> = {
  todo: '#6b7280', in_progress: '#2196F3', review: '#9C27B0',
  approved: '#22c55e', changes: '#FF9800', blocked: '#FF391A'
};

const priorityColor: Record<TaskPriority, string> = {
  low: '#6b7280', medium: '#2196F3', high: '#FF9800', critical: '#FF391A'
};

const isDueSoon = (d?: string) => {
  if (!d) return false;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= 3;
};
const isOverdue = (d?: string) => !!d && new Date(d).getTime() < Date.now();
const fmtDate = (d?: string) => d
  ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  : null;

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
  projectName?: string;
  deadline?: string;
  allComments?: ProjectComment[];
  onQuickAddTask: (title: string, dept: TabType, priority: TaskPriority) => Promise<void>;
  scenes: Scene[];
  shootingDays: ShootingDay[];
  productionStage: ProductionStage;
  onSaveShootingDays: (days: ShootingDay[]) => Promise<void>;
  onSaveScenes: (scenes: Scene[]) => Promise<void>;
  isOwner?: boolean;
  onAdvanceStage?: () => void;
}

const ManagerTab: React.FC<ManagerTabProps> = ({
  t, tasks,
  taskFilterStatus, setTaskFilterStatus,
  taskFilterDept, setTaskFilterDept,
  managerView, setManagerView,
  dragTaskId, setDragTaskId,
  kanbanDragOver, setKanbanDragOver,
  handleOpenNewTask, handleOpenEditTask, handleDeleteTask,
  handleTaskStatusChange, saveTasks,
  projectName, deadline, allComments = [],
  onQuickAddTask,
  scenes, shootingDays, productionStage,
  onSaveShootingDays, onSaveScenes,
  isOwner, onAdvanceStage
}) => {
  const [managerSection, setManagerSection] = useState<'tasks' | 'calendar'>('tasks');
  // ── Quick add state ─────────────────────────────────────────────────────────
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDept, setQuickDept] = useState<TabType>('edit');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickBusy, setQuickBusy] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = async () => {
    const title = quickTitle.trim();
    if (!title || quickBusy) return;
    setQuickBusy(true);
    try {
      await onQuickAddTask(title, quickDept, quickPriority);
      setQuickTitle('');
      quickInputRef.current?.focus();
    } finally {
      setQuickBusy(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const statusLabel: Record<TaskStatus, string> = {
    todo: t('К выполнению'), in_progress: t('В работе'), review: t('На проверке'),
    approved: t('Утверждено'), changes: t('Правки'), blocked: t('Заблокировано')
  };
  const priorityLabel: Record<TaskPriority, string> = {
    low: t('Низкий'), medium: t('Средний'), high: t('Высокий'), critical: t('Критический')
  };
  const deptName = (dep: TabType) => t(tabLabels[dep] || dep);

  const totalTasks = tasks.length;
  const byStatus = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = tasks.filter(tk => tk.status === s).length; return acc;
  }, {});

  const now = Date.now();
  const completedAll = byStatus['approved'] || 0;
  const pct = totalTasks > 0 ? Math.round((completedAll / totalTasks) * 100) : 0;
  const overdueTasks = tasks.filter(tk =>
    tk.dueDate && new Date(tk.dueDate).getTime() < now && tk.status !== 'approved'
  );
  const blockedTasks = tasks.filter(tk => tk.status === 'blocked');
  const urgentTasks = tasks.filter(tk =>
    isDueSoon(tk.dueDate) && !isOverdue(tk.dueDate) && tk.status !== 'approved'
  );

  const daysLeft = deadline ? Math.ceil((new Date(deadline).getTime() - now) / 86400000) : null;
  const deadlineBadgeClass = daysLeft === null ? '' : daysLeft < 0
    ? 'manager-deadline-badge--over' : daysLeft <= 7
    ? 'manager-deadline-badge--soon' : 'manager-deadline-badge--ok';
  const deadlineLabel = daysLeft === null ? null : daysLeft < 0
    ? `Просрочен на ${Math.abs(daysLeft)} дн.` : daysLeft === 0
    ? '⏰ Сегодня' : `⏰ ${daysLeft} дн.`;

  const healthByDept = DEPT_TABS.map(dep => {
    const depTasks = tasks.filter(tk => tk.department === dep);
    const done = depTasks.filter(tk => tk.status === 'approved').length;
    const blocked = depTasks.filter(tk => tk.status === 'blocked').length;
    const pctDep = depTasks.length > 0 ? Math.round((done / depTasks.length) * 100) : 0;
    return { dep, total: depTasks.length, done, blocked, pct: pctDep };
  });

  const visibleTasks = tasks.filter(tk => {
    if (taskFilterStatus !== 'all' && tk.status !== taskFilterStatus) return false;
    if (taskFilterDept !== 'all' && tk.department !== taskFilterDept) return false;
    return true;
  });

  const unresolvedByTab = DEPT_TABS.reduce<Partial<Record<TabType, ProjectComment[]>>>((acc, dep) => {
    const list = allComments.filter(c => c.tabId === dep && !c.resolved);
    if (list.length > 0) acc[dep] = list;
    return acc;
  }, {});
  const hasUnresolved = Object.keys(unresolvedByTab).length > 0;

  // ── Download report ─────────────────────────────────────────────────────────
  const handleDownloadReport = () => {
    const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const lines: string[] = [
      `=== Отчёт по проекту ===`,
      projectName ? `Проект: ${projectName}` : '',
      deadline ? `Дедлайн: ${new Date(deadline).toLocaleDateString('ru-RU')}` : '',
      `Дата отчёта: ${dateStr}`,
      '',
      `--- Сводка ---`,
      `Всего задач: ${totalTasks}`,
      ...STATUS_ORDER.map(s => `  ${statusLabel[s]}: ${byStatus[s] || 0}`),
      '',
      `--- По отделам ---`,
      ...DEPT_TABS.flatMap(dep => {
        const depTasks = tasks.filter(tk => tk.department === dep);
        if (!depTasks.length) return [];
        const done = depTasks.filter(tk => tk.status === 'approved').length;
        const blocked = depTasks.filter(tk => tk.status === 'blocked').length;
        return [`${deptName(dep)}: ${done}/${depTasks.length} готово${blocked ? ` | ${blocked} заблок.` : ''}`];
      }),
      '',
      `--- Задачи ---`,
      ...tasks.map(tk => {
        const due = tk.dueDate ? ` [${new Date(tk.dueDate).toLocaleDateString('ru-RU')}]` : '';
        const who = tk.assignee ? ` @${tk.assignee}` : '';
        return `[${statusLabel[tk.status]}] ${tk.title}${who}${due}${tk.description ? `\n    ${tk.description}` : ''}`;
      }),
    ].filter(l => l !== '');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${(projectName || 'project').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Task card ───────────────────────────────────────────────────────────────
  const renderCard = (task: Task, compact = false) => (
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
        <div className="manager-task-actions">
          <button className="craft-icon-btn" onClick={() => handleOpenEditTask(task)} title={t('Редактировать')}><Pencil size={14} /></button>
          {!compact && (
            <button className="craft-icon-btn" style={{ color: 'var(--error)' }} onClick={() => handleDeleteTask(task.id)} title={t('Удалить')}><Trash2 size={14} /></button>
          )}
        </div>
      </div>
      {!compact && task.description && <div className="manager-task-desc">{task.description}</div>}
      <div className="manager-task-meta">
        <span className="manager-task-dept" style={{ color: tabColors[task.department] }}>
          {deptName(task.department)}
        </span>
        {task.assignee && <span className="manager-task-assignee"><User2 size={11} /> {task.assignee}</span>}
        {task.sceneRef && <span className="manager-task-assignee">{task.sceneRef}</span>}
        {task.dueDate && (
          <span className={`manager-task-due${isOverdue(task.dueDate) ? ' manager-task-due--overdue' : isDueSoon(task.dueDate) ? ' manager-task-due--soon' : ''}`}>
            <CalendarDays size={11} /> {fmtDate(task.dueDate)}
          </span>
        )}
        {!compact && (
          <select
            className={`manager-task-status-select manager-task-status--${task.status}`}
            value={task.status}
            onClick={e => e.stopPropagation()}
            onChange={e => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
            style={{ borderColor: statusColor[task.status], color: statusColor[task.status] }}
          >
            {STATUS_ORDER.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="tab-content manager-tab">
      <div className="manager-layout">

        {/* ── Section switcher: Tasks / Shooting Schedule ── */}
        <div className="manager-section-switcher">
          <button
            className={`manager-switcher-btn${managerSection === 'tasks' ? ' manager-switcher-btn--active' : ''}`}
            onClick={() => setManagerSection('tasks')}
          >
            <ClipboardList size={15} /> {t('Задачи')}
            {tasks.filter(tk => tk.status === 'blocked').length > 0 && (
              <span className="manager-switcher-badge"><Ban size={11} /></span>
            )}
          </button>
          <button
            className={`manager-switcher-btn${managerSection === 'calendar' ? ' manager-switcher-btn--active' : ''}`}
            onClick={() => setManagerSection('calendar')}
          >
            <CalendarDays size={15} /> {t('Съёмочный план')}
            {shootingDays.length > 0 && (
              <span className="manager-switcher-count">{shootingDays.length}</span>
            )}
          </button>
        </div>

        {/* ── Shooting Calendar ── */}
        {managerSection === 'calendar' && (
          <ShootingCalendar
            t={t}
            scenes={scenes}
            shootingDays={shootingDays}
            canEdit={true}
            onSave={onSaveShootingDays}
            onUpdateScenes={onSaveScenes}
            productionStage={productionStage}
            isOwner={isOwner}
            onAdvanceStage={onAdvanceStage}
          />
        )}

        {managerSection === 'tasks' && <>

        {/* ── 1. Alerts ─────────────────────────────────────────────────────── */}
        {(overdueTasks.length > 0 || blockedTasks.length > 0 || urgentTasks.length > 0) && (
          <div className="manager-alerts">
            {overdueTasks.length > 0 && (
              <div className="manager-alert manager-alert--overdue">
                <AlertTriangle size={14} />
                <span><strong>{overdueTasks.length}</strong> {t('просроченных задач')}:</span>
                <div className="manager-alert-tasks">
                  {overdueTasks.slice(0, 3).map(tk => (
                    <button key={tk.id} className="manager-alert-task-chip" onClick={() => handleOpenEditTask(tk)}>
                      {tk.title}
                    </button>
                  ))}
                  {overdueTasks.length > 3 && <span className="manager-alert-more">+{overdueTasks.length - 3}</span>}
                </div>
              </div>
            )}
            {blockedTasks.length > 0 && (
              <div className="manager-alert manager-alert--blocked">
                <span><Ban size={14} /></span>
                <span><strong>{blockedTasks.length}</strong> {t('заблокированных')}:</span>
                <div className="manager-alert-tasks">
                  {blockedTasks.slice(0, 3).map(tk => (
                    <button key={tk.id} className="manager-alert-task-chip" onClick={() => handleOpenEditTask(tk)}>
                      {tk.title}
                    </button>
                  ))}
                  {blockedTasks.length > 3 && <span className="manager-alert-more">+{blockedTasks.length - 3}</span>}
                </div>
              </div>
            )}
            {urgentTasks.length > 0 && (
              <div className="manager-alert manager-alert--urgent">
                <span>⏰</span>
                <span><strong>{urgentTasks.length}</strong> {t('задач горят (до 3 дней)')}:</span>
                <div className="manager-alert-tasks">
                  {urgentTasks.slice(0, 3).map(tk => (
                    <button key={tk.id} className="manager-alert-task-chip" onClick={() => handleOpenEditTask(tk)}>
                      {tk.title}
                      {fmtDate(tk.dueDate) && <span style={{ opacity: 0.7, marginLeft: 4 }}>{fmtDate(tk.dueDate)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. Report card ────────────────────────────────────────────────── */}
        <div className="manager-report-card">
          <div className="manager-report-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <TrendingUp size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <span className="manager-report-title">{projectName || t('Проект')}</span>
              {deadlineLabel && (
                <span className={`manager-deadline-badge ${deadlineBadgeClass}`}>{deadlineLabel}</span>
              )}
            </div>
            <button className="manager-report-download-btn" onClick={handleDownloadReport}>
              <Download size={13} /> {t('Скачать отчёт')}
            </button>
          </div>
          <div className="manager-report-stats">
            <div className="manager-report-stat">
              <span className="manager-report-stat-num">{totalTasks}</span>
              <span className="manager-report-stat-label">{t('Всего')}</span>
            </div>
            <div className="manager-report-divider" />
            <div className="manager-report-stat">
              <span className="manager-report-stat-num" style={{ color: '#22c55e' }}>{completedAll}</span>
              <span className="manager-report-stat-label">{t('Готово')}</span>
            </div>
            <div className="manager-report-divider" />
            <div className="manager-report-stat">
              <span className="manager-report-stat-num" style={{ color: pct >= 80 ? '#22c55e' : pct >= 40 ? '#FF9800' : '#6b7280' }}>{pct}%</span>
              <span className="manager-report-stat-label">{t('Прогресс')}</span>
            </div>
            {byStatus['blocked'] > 0 && <>
              <div className="manager-report-divider" />
              <div className="manager-report-stat">
                <span className="manager-report-stat-num" style={{ color: '#FF391A' }}>{byStatus['blocked']}</span>
                <span className="manager-report-stat-label">{t('Блок')}</span>
              </div>
            </>}
            {overdueTasks.length > 0 && <>
              <div className="manager-report-divider" />
              <div className="manager-report-stat">
                <span className="manager-report-stat-num" style={{ color: '#FF9800' }}>{overdueTasks.length}</span>
                <span className="manager-report-stat-label">{t('Просроч.')}</span>
              </div>
            </>}
            {deadline && (
              <div className="manager-report-stat" style={{ marginLeft: 'auto' }}>
                <span className="manager-report-date">
                  {t('Дедлайн')}: {new Date(deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Health grid (clickable → dept filter) ───────────────────────── */}
        <div className="manager-health-section">
          <div className="manager-section-title">{t('Здоровье по отделам')}</div>
          <div className="manager-health-grid">
            {healthByDept.map(({ dep, total, done, blocked, pct: pctDep }) => {
              const isActive = taskFilterDept === dep;
              return (
                <div
                  key={dep}
                  className={`manager-health-card${blocked > 0 ? ' manager-health-card--blocked' : ''}${isActive ? ' manager-health-card--active' : ''}`}
                  onClick={() => setTaskFilterDept(isActive ? 'all' : dep)}
                  style={{ cursor: 'pointer' }}
                  title={isActive ? t('Снять фильтр') : t('Показать задачи отдела')}
                >
                  <div className="manager-health-card-head">
                    {(() => { const HIcon = iconMap[dep]; return HIcon ? <HIcon size={18} className="manager-health-icon" style={{ color: tabColors[dep] }} /> : null; })()}
                    <span className="manager-health-dept" style={{ color: tabColors[dep] }}>{deptName(dep)}</span>
                    {blocked > 0 && <span className="manager-health-blocked-badge"><Ban size={11} /> {blocked}</span>}
                    {isActive && <span className="manager-health-active-dot" />}
                  </div>
                  <div className="manager-health-bar-wrap">
                    <div className="manager-health-bar" style={{ width: `${pctDep}%`, background: blocked > 0 ? '#FF391A' : tabColors[dep] }} />
                  </div>
                  <div className="manager-health-stats">
                    <span>{done}/{total} {t('готово')}</span>
                    <span>{pctDep}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Quick task creator ─────────────────────────────────────────── */}
        <div className="manager-quick-add">
          <div className="manager-quick-add-label">
            <Plus size={14} /> {t('Быстрое добавление задачи')}
          </div>
          <div className="manager-quick-add-row">
            <input
              ref={quickInputRef}
              className="manager-quick-input"
              placeholder={t('Название задачи...')}
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
              disabled={quickBusy}
            />
            <select
              className="manager-quick-select"
              value={quickDept}
              onChange={e => setQuickDept(e.target.value as TabType)}
              style={{ borderColor: tabColors[quickDept], color: tabColors[quickDept] }}
            >
              {DEPT_TABS.map(dep => (
                <option key={dep} value={dep}>{deptName(dep)}</option>
              ))}
            </select>
            <select
              className="manager-quick-select"
              value={quickPriority}
              onChange={e => setQuickPriority(e.target.value as TaskPriority)}
              style={{ borderColor: priorityColor[quickPriority], color: priorityColor[quickPriority] }}
            >
              <option value="low">{t('Низкий')}</option>
              <option value="medium">{t('Средний')}</option>
              <option value="high">{t('Высокий')}</option>
              <option value="critical">{t('Критический')}</option>
            </select>
            <button
              className="manager-quick-btn"
              onClick={handleQuickAdd}
              disabled={!quickTitle.trim() || quickBusy}
            >
              {quickBusy ? '...' : t('Добавить')}
            </button>
            <button className="manager-quick-btn manager-quick-btn--secondary" onClick={handleOpenNewTask} title={t('Полная форма')}>
              ⋯
            </button>
          </div>
        </div>

        {/* ── 5. Status summary ─────────────────────────────────────────────── */}
        <div className="manager-status-row">
          {STATUS_ORDER.map(s => (
            <div
              key={s}
              className={`manager-status-pill${taskFilterStatus === s ? ' manager-status-pill--active' : ''}`}
              style={{ borderColor: statusColor[s], cursor: 'pointer' }}
              onClick={() => setTaskFilterStatus(taskFilterStatus === s ? 'all' : s)}
              title={t('Фильтровать по статусу')}
            >
              <span className="manager-status-count" style={{ color: statusColor[s] }}>{byStatus[s] || 0}</span>
              <span className="manager-status-name">{statusLabel[s]}</span>
            </div>
          ))}
        </div>

        {/* ── 6. Task board ─────────────────────────────────────────────────── */}
        <div className="manager-task-head">
          <div className="manager-section-title">
            {t('Задачи')}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
              ({visibleTasks.length}/{totalTasks})
            </span>
            {(taskFilterStatus !== 'all' || taskFilterDept !== 'all') && (
              <button
                className="manager-filter-clear"
                onClick={() => { setTaskFilterStatus('all'); setTaskFilterDept('all'); }}
              ><X size={12} /> {t('Сбросить')}</button>
            )}
          </div>
          <div className="manager-view-toggle">
            <button className={`manager-view-btn${managerView === 'list' ? ' manager-view-btn--active' : ''}`} onClick={() => setManagerView('list')} title={t('Список')}><List size={15} /></button>
            <button className={`manager-view-btn${managerView === 'kanban' ? ' manager-view-btn--active' : ''}`} onClick={() => setManagerView('kanban')} title={t('Канбан')}><LayoutGrid size={15} /></button>
          </div>
          <button className="add-marker-btn" onClick={handleOpenNewTask}>
            <MapPinPlus size={16} className="add-marker-icon" />{t('Полная задача')}
          </button>
        </div>

        {/* Dept filter chips */}
        <div className="manager-filters">
          <div className="manager-filter-group">
            <button className={`manager-filter-chip${taskFilterDept === 'all' ? ' manager-filter-chip--active' : ''}`} onClick={() => setTaskFilterDept('all')}>{t('Все отделы')}</button>
            {DEPT_TABS.map(dep => (
              <button key={dep}
                className={`manager-filter-chip${taskFilterDept === dep ? ' manager-filter-chip--active' : ''}`}
                style={taskFilterDept === dep ? { borderColor: tabColors[dep], color: tabColors[dep] } : {}}
                onClick={() => setTaskFilterDept(taskFilterDept === dep ? 'all' : dep)}
              >
                {deptName(dep)}
                {byStatus && tasks.filter(tk => tk.department === dep).length > 0 && (
                  <span className="manager-filter-count">{tasks.filter(tk => tk.department === dep).length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="manager-empty-state">
            <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t('Задач пока нет')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 340, textAlign: 'center' }}>
              {t('Используйте быстрое добавление выше или создайте задачу с полным описанием')}
            </div>
            <button className="add-marker-btn" onClick={handleOpenNewTask}>
              <MapPinPlus size={15} style={{ marginRight: 6 }} />{t('Создать задачу')}
            </button>
          </div>
        ) : managerView === 'kanban' ? (
          <div className="kanban-board">
            {STATUS_ORDER.map(colStatus => {
              const colTasks = tasks.filter(tk =>
                tk.status === colStatus && (taskFilterDept === 'all' || tk.department === taskFilterDept)
              );
              return (
                <div
                  key={colStatus}
                  className={`kanban-column${kanbanDragOver === colStatus ? ' kanban-column--drop-target' : ''}`}
                  onDragOver={e => { e.preventDefault(); setKanbanDragOver(colStatus); }}
                  onDragLeave={() => setKanbanDragOver(null)}
                  onDrop={async () => {
                    if (!dragTaskId) return;
                    const task = tasks.find(tk => tk.id === dragTaskId);
                    if (task && task.status !== colStatus) await handleTaskStatusChange(dragTaskId, colStatus);
                    setDragTaskId(null); setKanbanDragOver(null);
                  }}
                >
                  <div className="kanban-col-head" style={{ borderTopColor: statusColor[colStatus] }}>
                    <span className="kanban-col-title" style={{ color: statusColor[colStatus] }}>{statusLabel[colStatus]}</span>
                    <span className="kanban-col-count">{colTasks.length}</span>
                  </div>
                  <div className="kanban-col-cards">
                    {colTasks.map(task => renderCard(task, true))}
                    {colTasks.length === 0 && <div className="kanban-col-empty">{t('Нет задач')}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="empty-state">{t('Нет задач по выбранным фильтрам')}</div>
        ) : (
          <div className="manager-task-list">
            {visibleTasks.map(task => renderCard(task, false))}
          </div>
        )}

        {/* ── 7. Unresolved comments from all tabs ──────────────────────────── */}
        {hasUnresolved && (
          <div className="manager-comments-section">
            <div className="manager-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={16} />
              {t('Нерешённые комментарии')}
              <span className="tab-markers-count">
                {Object.values(unresolvedByTab).reduce((s, arr) => s + (arr?.length ?? 0), 0)}
              </span>
            </div>
            <div className="manager-comments-grid">
              {(Object.entries(unresolvedByTab) as [TabType, ProjectComment[]][]).map(([dep, cmts]) => (
                <div key={dep} className="manager-comment-group">
                  <div className="manager-comment-group-head" style={{ color: tabColors[dep] }}>
                    {(() => { const I = iconMap[dep]; return I ? <I size={13} /> : null; })()}
                    {deptName(dep)}
                    <span className="manager-comment-count">{cmts.length}</span>
                  </div>
                  {cmts.slice(0, 2).map(c => (
                    <div key={c.id} className="manager-comment-row">
                      <span className="manager-comment-user">{c.user}</span>
                      <span className="manager-comment-text">{c.text}</span>
                    </div>
                  ))}
                  {cmts.length > 2 && (
                    <div className="manager-comment-more">+{cmts.length - 2} {t('ещё')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        </> /* end tasks section */}

      </div>
    </div>
  );
};

export default ManagerTab;
