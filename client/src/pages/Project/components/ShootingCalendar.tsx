import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Clock, CheckCircle2, Film, ChevronLeft, ChevronRight, CalendarDays, MapPin, X } from 'lucide-react';
import type { Scene, ShootingDay, ShootingDayStatus } from '../../../types';

const STATUS_LABEL: Record<ShootingDayStatus, string> = {
  planned: 'Запланирован',
  shooting: 'Идут съёмки',
  wrapped: 'Завершён',
  postponed: 'Перенесён',
};
const STATUS_COLOR: Record<ShootingDayStatus, string> = {
  planned: '#2196F3',
  shooting: '#FF9800',
  wrapped: '#22c55e',
  postponed: '#6b7280',
};

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                     'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

interface DayFormState {
  date: string;
  callTime: string;
  wrapTime: string;
  location: string;
  notes: string;
  status: ShootingDayStatus;
}

const emptyDayForm = (date = ''): DayFormState => ({
  date,
  callTime: '08:00',
  wrapTime: '19:00',
  location: '',
  notes: '',
  status: 'planned',
});

interface ShootingCalendarProps {
  t: (key: string) => string;
  scenes: Scene[];
  shootingDays: ShootingDay[];
  canEdit: boolean;
  onSave: (days: ShootingDay[]) => Promise<void>;
  onUpdateScenes: (scenes: Scene[]) => Promise<void>;
  productionStage?: string;
  isOwner?: boolean;
  onAdvanceStage?: () => void;
}

const ShootingCalendar: React.FC<ShootingCalendarProps> = ({
  t, scenes, shootingDays, canEdit, onSave, onUpdateScenes,
  productionStage, isOwner, onAdvanceStage
}) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showNewDayForm, setShowNewDayForm] = useState(false);
  const [newDayForm, setNewDayForm] = useState<DayFormState>(emptyDayForm());
  const [busy, setBusy] = useState(false);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const daysByDate = useMemo(() => {
    const map: Record<string, ShootingDay[]> = {};
    for (const d of shootingDays) {
      if (!map[d.date]) map[d.date] = [];
      map[d.date].push(d);
    }
    return map;
  }, [shootingDays]);

  const selectedDay = selectedDayId ? shootingDays.find(d => d.id === selectedDayId) || null : null;
  const unscheduledScenes = scenes.filter(s => !s.shootingDayId && s.status !== 'approved');
  const dayScenes = selectedDay
    ? scenes.filter(s => selectedDay.sceneIds.includes(s.id)).sort((a, b) => a.number - b.number)
    : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const isoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const handleCreateDay = async () => {
    if (!newDayForm.date) return;
    setBusy(true);
    const nextNum = shootingDays.length > 0 ? Math.max(...shootingDays.map(d => d.dayNumber)) + 1 : 1;
    const newDay: ShootingDay = {
      id: `sday_${Date.now()}`,
      dayNumber: nextNum,
      date: newDayForm.date,
      callTime: newDayForm.callTime,
      wrapTime: newDayForm.wrapTime,
      location: newDayForm.location,
      sceneIds: [],
      status: newDayForm.status,
      notes: newDayForm.notes,
      totalMinutes: 0,
    };
    await onSave([...shootingDays, newDay].sort((a, b) => a.date.localeCompare(b.date)));
    setSelectedDayId(newDay.id);
    setShowNewDayForm(false);
    setNewDayForm(emptyDayForm());
    setBusy(false);
  };

  const handleDeleteDay = async (dayId: string) => {
    // Unschedule scenes from this day
    const updScenes = scenes.map(s =>
      s.shootingDayId === dayId ? { ...s, shootingDayId: undefined } : s
    );
    await onUpdateScenes(updScenes);
    await onSave(shootingDays.filter(d => d.id !== dayId));
    setSelectedDayId(null);
  };

  const handleDayStatusChange = async (dayId: string, status: ShootingDayStatus) => {
    await onSave(shootingDays.map(d => d.id === dayId ? { ...d, status } : d));
  };

  const handleAssignScene = async (sceneId: string, dayId: string) => {
    // Add scene to day
    const updDays = shootingDays.map(d => {
      if (d.id !== dayId) return d;
      const sceneIds = [...new Set([...d.sceneIds, sceneId])];
      const total = scenes.filter(s => sceneIds.includes(s.id)).reduce((s, sc) => s + sc.estimatedMinutes, 0);
      return { ...d, sceneIds, totalMinutes: total };
    });
    // Mark scene as scheduled
    const updScenes = scenes.map(s => s.id === sceneId ? { ...s, shootingDayId: dayId } : s);
    await onSave(updDays);
    await onUpdateScenes(updScenes);
  };

  const handleUnassignScene = async (sceneId: string, dayId: string) => {
    const updDays = shootingDays.map(d => {
      if (d.id !== dayId) return d;
      const sceneIds = d.sceneIds.filter(id => id !== sceneId);
      const total = scenes.filter(s => sceneIds.includes(s.id)).reduce((s, sc) => s + sc.estimatedMinutes, 0);
      return { ...d, sceneIds, totalMinutes: total };
    });
    const updScenes = scenes.map(s => s.id === sceneId ? { ...s, shootingDayId: undefined } : s);
    await onSave(updDays);
    await onUpdateScenes(updScenes);
  };

  const handleSceneStatusInDay = async (sceneId: string, status: 'shot' | 'needs_reshoot') => {
    const updScenes = scenes.map(s => s.id === sceneId ? { ...s, status: status === 'shot' ? 'shot' as const : 'locked' as const } : s);
    await onUpdateScenes(updScenes);
  };

  // ── Day counters & phase transition prompt ──
  const totalDays = shootingDays.length;
  const wrappedCount   = shootingDays.filter(d => d.status === 'wrapped').length;
  const shootingCount  = shootingDays.filter(d => d.status === 'shooting').length;
  const plannedCount   = shootingDays.filter(d => d.status === 'planned').length;
  const postponedCount = shootingDays.filter(d => d.status === 'postponed').length;
  const remainingCount = plannedCount + shootingCount;
  const allDone = totalDays > 0 && remainingCount === 0;
  const isProductionPhase = productionStage === 'production';
  const isPreProductionPhase = productionStage === 'pre_production';

  return (
    <div className="shooting-calendar">

      {/* ── Day summary + phase CTA ── */}
      {totalDays > 0 && (
        <div className="shooting-summary">
          <div className="shooting-summary-counts">
            <div className="shooting-summary-stat">
              <div className="shooting-summary-stat-value">{totalDays}</div>
              <div className="shooting-summary-stat-label">{t('Всего дней')}</div>
            </div>
            <div className="shooting-summary-divider" />
            <div className="shooting-summary-stat">
              <div className="shooting-summary-stat-value" style={{ color: '#22c55e' }}>{wrappedCount}</div>
              <div className="shooting-summary-stat-label">{t('Завершено')}</div>
            </div>
            <div className="shooting-summary-stat">
              <div className="shooting-summary-stat-value" style={{ color: '#FF9800' }}>{shootingCount}</div>
              <div className="shooting-summary-stat-label">{t('Идут')}</div>
            </div>
            <div className="shooting-summary-stat">
              <div className="shooting-summary-stat-value" style={{ color: '#2196F3' }}>{plannedCount}</div>
              <div className="shooting-summary-stat-label">{t('Осталось')}</div>
            </div>
            {postponedCount > 0 && (
              <div className="shooting-summary-stat">
                <div className="shooting-summary-stat-value" style={{ color: '#6b7280' }}>{postponedCount}</div>
                <div className="shooting-summary-stat-label">{t('Перенесено')}</div>
              </div>
            )}
            <div className="shooting-summary-progress">
              <div
                className="shooting-summary-progress-fill"
                style={{ width: `${totalDays > 0 ? (wrappedCount / totalDays) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* CTA: переход в production когда дни запланированы (на pre_production) */}
          {isPreProductionPhase && totalDays > 0 && isOwner && onAdvanceStage && (
            <div className="shooting-summary-cta shooting-summary-cta--start">
              <div className="shooting-summary-cta-text">
                <strong>{t('Готовы начать съёмки?')}</strong>
                <span>{t('Все сцены утверждены и дни запланированы')}: {totalDays}</span>
              </div>
              <button className="shooting-summary-cta-btn" onClick={onAdvanceStage}>
                {t('Перейти к этапу «Съёмки» →')}
              </button>
            </div>
          )}

          {/* CTA: переход в post-production когда все дни сняты */}
          {isProductionPhase && allDone && isOwner && onAdvanceStage && (
            <div className="shooting-summary-cta shooting-summary-cta--wrap">
              <div className="shooting-summary-cta-text">
                <strong>{t('Все съёмочные дни завершены')}</strong>
                <span>{wrappedCount + postponedCount} {t('из')} {totalDays} — {t('пора в монтаж')}</span>
              </div>
              <button className="shooting-summary-cta-btn shooting-summary-cta-btn--success" onClick={onAdvanceStage}>
                {t('Перейти к этапу «Пост-продакшн» →')}
              </button>
            </div>
          )}

          {/* Info: в production но дни ещё не закрыты */}
          {isProductionPhase && !allDone && (
            <div className="shooting-summary-info">
              {t('Закройте все дни (wrapped/postponed), чтобы открыть переход к пост-продакшну')}
            </div>
          )}
        </div>
      )}

      <div className="shooting-calendar-layout">

        {/* ── Left: calendar grid ── */}
        <div className="shooting-cal-main">
          <div className="shooting-cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span className="cal-month-label">{t(MONTH_NAMES[viewMonth])} {viewYear}</span>
            <button className="cal-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
            {canEdit && (
              <button className="scene-add-btn" onClick={() => setShowNewDayForm(true)}>
                <Plus size={14} /> Съёмочный день
              </button>
            )}
          </div>

          <div className="cal-grid-header">
            {DAY_NAMES.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
          </div>

          <div className="cal-grid">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="cal-cell cal-cell--empty" />;
              const iso = isoDate(day);
              const daysOnDate = daysByDate[iso] || [];
              const isToday = iso === isoDate(now);
              const isSelected = daysOnDate.some(d => d.id === selectedDayId);
              return (
                <div
                  key={iso}
                  className={`cal-cell${isToday ? ' cal-cell--today' : ''}${isSelected ? ' cal-cell--selected' : ''}${daysOnDate.length > 0 ? ' cal-cell--has-shooting' : ''}`}
                  onClick={() => {
                    if (daysOnDate.length > 0) setSelectedDayId(daysOnDate[0].id);
                    else if (canEdit) { setNewDayForm(emptyDayForm(iso)); setShowNewDayForm(true); }
                  }}
                >
                  <span className="cal-cell-date">{day.getDate()}</span>
                  {daysOnDate.map(sd => (
                    <div key={sd.id} className="cal-shooting-chip"
                      style={{ borderLeftColor: STATUS_COLOR[sd.status] }}
                      onClick={e => { e.stopPropagation(); setSelectedDayId(sd.id); }}
                    >
                      <span className="cal-chip-day">День {sd.dayNumber}</span>
                      {sd.sceneIds.length > 0 && <span className="cal-chip-scenes">{sd.sceneIds.length} сц.</span>}
                    </div>
                  ))}
                  {daysOnDate.length === 0 && canEdit && (
                    <div className="cal-cell-add-hint">+ день</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: day detail or unscheduled scenes ── */}
        <div className="shooting-cal-side">
          {selectedDay ? (
            <div className="shooting-day-detail">
              <div className="shooting-day-header">
                <div className="shooting-day-title">
                  <Film size={16} />
                  <span>Съёмочный день №{selectedDay.dayNumber}</span>
                </div>
                <button className="cal-nav-btn" onClick={() => setSelectedDayId(null)}><X size={14} /></button>
              </div>

              <div className="shooting-day-meta">
                <span><CalendarDays size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:3 }} />{formatDate(selectedDay.date)}</span>
                <span><Clock size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:3 }} />{selectedDay.callTime} — {selectedDay.wrapTime}</span>
                {selectedDay.location && <span><MapPin size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:3 }} />{selectedDay.location}</span>}
                {selectedDay.totalMinutes > 0 && <span>~{selectedDay.totalMinutes} мин</span>}
              </div>

              <select
                className="form-input shooting-day-status-select"
                value={selectedDay.status}
                style={{ borderColor: STATUS_COLOR[selectedDay.status], color: STATUS_COLOR[selectedDay.status] }}
                onChange={e => handleDayStatusChange(selectedDay.id, e.target.value as ShootingDayStatus)}
                disabled={!canEdit}
              >
                {(Object.keys(STATUS_LABEL) as ShootingDayStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>

              <div className="shooting-day-scenes">
                <div className="shooting-day-scenes-title">Сцены на этот день ({dayScenes.length})</div>
                {dayScenes.length === 0 && (
                  <div className="shooting-day-no-scenes">Добавьте сцены из списка ниже</div>
                )}
                {dayScenes.map(scene => (
                  <div key={scene.id} className="shooting-day-scene-row">
                    <span className="scene-number-sm">Сц.{scene.number}</span>
                    <div className="shooting-day-scene-info">
                      <span className="shooting-day-scene-title">{scene.title}</span>
                      <span className="shooting-day-scene-meta">{scene.estimatedMinutes} мин</span>
                    </div>
                    {canEdit && (
                      <div className="shooting-day-scene-actions">
                        {scene.status !== 'shot' && scene.status !== 'approved' && (
                          <button className="scene-shot-btn" title="Отметить как снято"
                            onClick={() => handleSceneStatusInDay(scene.id, 'shot')}>
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        {(scene.status === 'shot' || scene.status === 'approved') && (
                          <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                        )}
                        <button className="scene-delete-btn" onClick={() => handleUnassignScene(scene.id, selectedDay.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Unscheduled scenes for assignment */}
              {canEdit && unscheduledScenes.length > 0 && (
                <div className="shooting-day-assign">
                  <div className="shooting-day-scenes-title">Добавить сцену</div>
                  <div className="unscheduled-list">
                    {unscheduledScenes.map(scene => (
                      <button key={scene.id} className="unscheduled-scene-chip"
                        onClick={() => handleAssignScene(scene.id, selectedDay.id)}>
                        <span>Сц.{scene.number}</span>
                        <span>{scene.title.length > 20 ? scene.title.slice(0, 20) + '…' : scene.title}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{scene.estimatedMinutes} мин</span>
                        <Plus size={11} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {canEdit && (
                <button className="scene-delete-btn shooting-day-delete"
                  onClick={() => handleDeleteDay(selectedDay.id)}>
                  <Trash2 size={13} /> Удалить съёмочный день
                </button>
              )}
            </div>
          ) : (
            <div className="shooting-unscheduled">
              <div className="shooting-day-title" style={{ marginBottom: 12 }}>
                <Film size={15} />
                <span>Не запланировано ({unscheduledScenes.length})</span>
              </div>
              {unscheduledScenes.length === 0 ? (
                <div className="scene-empty" style={{ padding: '20px 0' }}>
                  <CheckCircle2 size={28} style={{ color: '#22c55e', opacity: 0.8, marginBottom: 8 }} />
                  <div>Все сцены распределены по дням</div>
                </div>
              ) : (
                <div className="unscheduled-list">
                  {unscheduledScenes.map(scene => (
                    <div key={scene.id} className="unscheduled-scene-info">
                      <span className="scene-number-sm">Сц.{scene.number}</span>
                      <div>
                        <div className="shooting-day-scene-title">{scene.title}</div>
                        <div className="shooting-day-scene-meta">
                          {scene.location && <span>{scene.location}</span>}
                          <span><Clock size={10} /> {scene.estimatedMinutes} мин</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New day form */}
      {showNewDayForm && (
        <div className="scene-form-overlay" onClick={() => setShowNewDayForm(false)}>
          <div className="scene-form-modal" onClick={e => e.stopPropagation()}>
            <div className="scene-form-title">Новый съёмочный день</div>
            <div className="scene-form-row">
              <div className="scene-form-group scene-form-group--flex">
                <label>Дата</label>
                <input type="date" className="form-input" value={newDayForm.date}
                  onChange={e => setNewDayForm(p => ({ ...p, date: e.target.value }))} autoFocus />
              </div>
              <div className="scene-form-group">
                <label>Начало</label>
                <input type="time" className="form-input" value={newDayForm.callTime}
                  onChange={e => setNewDayForm(p => ({ ...p, callTime: e.target.value }))} />
              </div>
              <div className="scene-form-group">
                <label>Конец</label>
                <input type="time" className="form-input" value={newDayForm.wrapTime}
                  onChange={e => setNewDayForm(p => ({ ...p, wrapTime: e.target.value }))} />
              </div>
            </div>
            <div className="scene-form-group">
              <label>Локация / Адрес</label>
              <input className="form-input" placeholder="Студия А, ул. Пушкина, 10..."
                value={newDayForm.location} onChange={e => setNewDayForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <textarea className="form-input" rows={2} placeholder="Заметки к дню..."
              value={newDayForm.notes} onChange={e => setNewDayForm(p => ({ ...p, notes: e.target.value }))} />
            <div className="scene-form-footer">
              <button className="secondary-btn" onClick={() => setShowNewDayForm(false)}>Отмена</button>
              <button className="primary-btn" onClick={handleCreateDay} disabled={busy || !newDayForm.date}>
                {busy ? '...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShootingCalendar;
