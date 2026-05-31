import { useState, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, Film, Clock, FileText, Users, Pencil, X, MapPin, CalendarDays } from 'lucide-react';
import type { Scene, SceneStatus, ProductionStage } from '../../../types';

const STATUS_LABEL: Record<SceneStatus, string> = {
  draft:    'Черновик',
  locked:   'Заблокировано',
  shot:     'Снято',
  edited:   'Смонтировано',
  approved: 'Утверждено',
};
const STATUS_COLOR: Record<SceneStatus, string> = {
  draft:    '#6b7280',
  locked:   '#2196F3',
  shot:     '#FF9800',
  edited:   '#9C27B0',
  approved: '#22c55e',
};
const STATUS_ORDER: SceneStatus[] = ['draft', 'locked', 'shot', 'edited', 'approved'];
const IE_LABELS = { INT: 'ИНТ', EXT: 'НАТ' };
const DN_LABELS = { DAY: 'ДЕНЬ', NIGHT: 'НОЧЬ' };

interface SceneFormState {
  number: number;
  title: string;
  location: string;
  interiorExterior: 'INT' | 'EXT';
  dayNight: 'DAY' | 'NIGHT';
  characters: string[];
  description: string;
  estimatedMinutes: number;
  pageCount: number;
  status: SceneStatus;
  storyboardFrameCount: number;
}

const emptyForm = (nextNumber: number): SceneFormState => ({
  number: nextNumber,
  title: '',
  location: '',
  interiorExterior: 'INT',
  dayNight: 'DAY',
  characters: [''],
  description: '',
  estimatedMinutes: 30,
  pageCount: 1,
  status: 'draft',
  storyboardFrameCount: 0,
});

export interface SceneManagerHandle {
  openNew: () => void;
}

interface SceneManagerProps {
  t: (key: string) => string;
  scenes: Scene[];
  productionStage: ProductionStage;
  canEdit: boolean;
  onSave: (scenes: Scene[]) => Promise<void>;
}

const SceneManager = forwardRef<SceneManagerHandle, SceneManagerProps>(
  ({ t, scenes, productionStage, canEdit, onSave }, ref) => {
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<SceneFormState>(emptyForm(scenes.length + 1));
    const [busy, setBusy] = useState(false);

    const nextNumber = scenes.length > 0
      ? Math.max(...scenes.map(s => s.number)) + 1
      : 1;

    useImperativeHandle(ref, () => ({
      openNew: () => {
        setForm(emptyForm(nextNumber));
        setEditId(null);
        setShowForm(true);
      }
    }));

    const openNew = () => {
      setForm(emptyForm(nextNumber));
      setEditId(null);
      setShowForm(true);
    };

    const openEdit = (scene: Scene) => {
      setForm({
        number: scene.number,
        title: scene.title,
        location: scene.location,
        interiorExterior: scene.interiorExterior,
        dayNight: scene.dayNight,
        characters: scene.characters.length > 0 ? [...scene.characters] : [''],
        description: scene.description,
        estimatedMinutes: scene.estimatedMinutes,
        pageCount: scene.pageCount,
        status: scene.status,
        storyboardFrameCount: scene.storyboardFrameCount ?? 0,
      });
      setEditId(scene.id);
      setShowForm(true);
    };

    const handleSave = async () => {
      if (!form.title.trim()) return;
      setBusy(true);
      const chars = form.characters.map(c => c.trim()).filter(Boolean);
      if (editId) {
        const updated = scenes.map(s =>
          s.id === editId
            ? { ...s, ...form, characters: chars, storyboardFrameCount: form.storyboardFrameCount }
            : s
        );
        await onSave(updated);
      } else {
        const newScene: Scene = {
          id: `scene_${Date.now()}`,
          number: form.number,
          title: form.title.trim(),
          location: form.location.trim(),
          interiorExterior: form.interiorExterior,
          dayNight: form.dayNight,
          characters: chars,
          description: form.description.trim(),
          estimatedMinutes: form.estimatedMinutes,
          pageCount: form.pageCount,
          status: form.status,
          storyboardFrameCount: form.storyboardFrameCount,
          frames: [],
        };
        await onSave([...scenes, newScene].sort((a, b) => a.number - b.number));
      }
      setBusy(false);
      setShowForm(false);
      setEditId(null);
    };

    const handleDelete = async (id: string) => {
      await onSave(scenes.filter(s => s.id !== id));
    };

    const handleStatusChange = async (id: string, status: SceneStatus) => {
      await onSave(scenes.map(s => s.id === id ? { ...s, status } : s));
    };

    const addCharacter = () => setForm(p => ({ ...p, characters: [...p.characters, ''] }));
    const removeCharacter = (i: number) =>
      setForm(p => ({ ...p, characters: p.characters.filter((_, ci) => ci !== i) }));
    const updateCharacter = (i: number, val: string) =>
      setForm(p => ({ ...p, characters: p.characters.map((c, ci) => ci === i ? val : c) }));

    const totalMinutes = scenes.reduce((s, sc) => s + sc.estimatedMinutes, 0);
    const totalPages = scenes.reduce((s, sc) => s + sc.pageCount, 0);

    const canModify = canEdit && (productionStage === 'development' || productionStage === 'pre_production');

    return (
      <div className="scene-manager">
        <div className="scene-manager-head">
          <div className="scene-manager-title">
            <Film size={16} />
            <span>{t('Список сцен')}</span>
            <span className="scene-count-badge">{scenes.length}</span>
          </div>
          <div className="scene-manager-stats">
            {totalPages > 0 && <span><FileText size={12} /> {totalPages} стр.</span>}
            {totalMinutes > 0 && <span><Clock size={12} /> ~{totalMinutes} мин</span>}
          </div>
          {canModify && (
            <button className="scene-add-btn" onClick={openNew}>
              <Plus size={14} /> {t('Добавить сцену')}
            </button>
          )}
        </div>

        {scenes.length === 0 ? (
          <div className="scene-empty">
            <Film size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
            <div className="scene-empty-title">{t('Сцен пока нет')}</div>
            <div className="scene-empty-hint">{t('Создайте сцены — они станут основой съёмочного плана и свяжут все отделы')}</div>
            {canModify && (
              <button className="scene-add-btn" style={{ marginTop: 14 }} onClick={openNew}>
                <Plus size={14} /> {t('Создать первую сцену')}
              </button>
            )}
          </div>
        ) : (
          <div className="scene-list">
            {[...scenes].sort((a, b) => a.number - b.number).map(scene => (
              <div key={scene.id} className={`scene-card scene-card--${scene.status}`}>
                <div className="scene-card-head">
                  <div className="scene-card-head-main">
                    <span className="scene-number">{scene.number}</span>
                    <span className="scene-ie-dn">
                      {IE_LABELS[scene.interiorExterior]} · {DN_LABELS[scene.dayNight]}
                    </span>
                    <span className="scene-title">{scene.title || t('Без названия')}</span>
                    {scene.shootingDayId && (
                      <span className="scene-day-badge">
                        <CalendarDays size={10} /> {t('День')} {scene.shootingDayId}
                      </span>
                    )}
                  </div>
                  <div className="scene-card-actions">
                    {canEdit && (
                      <>
                        <select
                          className="scene-status-select"
                          value={scene.status}
                          style={{ color: STATUS_COLOR[scene.status], borderColor: STATUS_COLOR[scene.status] }}
                          onChange={e => handleStatusChange(scene.id, e.target.value as SceneStatus)}
                          onClick={e => e.stopPropagation()}
                        >
                          {STATUS_ORDER.map(s => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                        <button className="scene-edit-btn" onClick={() => openEdit(scene)} title={t('Редактировать')}>
                          <Pencil size={12} />
                        </button>
                        {canModify && (
                          <button className="scene-delete-btn" onClick={() => handleDelete(scene.id)} title={t('Удалить')}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </>
                    )}
                    {!canEdit && (
                      <span className="scene-status-badge" style={{ color: STATUS_COLOR[scene.status] }}>
                        {STATUS_LABEL[scene.status]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="scene-card-body">
                  {scene.location && (
                    <span className="scene-meta-chip"><MapPin size={11} /> {scene.location}</span>
                  )}
                  {scene.characters.length > 0 && (
                    <span className="scene-meta-chip scene-meta-chip--characters">
                      <Users size={11} /> {scene.characters.join(', ')}
                    </span>
                  )}
                  {scene.estimatedMinutes > 0 && (
                    <span className="scene-meta-chip"><Clock size={11} /> {scene.estimatedMinutes} {t('мин')}</span>
                  )}
                  {scene.pageCount > 0 && (
                    <span className="scene-meta-chip"><FileText size={11} /> {scene.pageCount} {t('стр.')}</span>
                  )}
                  {(scene.storyboardFrameCount ?? 0) > 0 && (
                    <span className="scene-meta-chip"><Film size={11} /> {scene.storyboardFrameCount} {t('кадров')}</span>
                  )}
                </div>

                {scene.description && (
                  <div className="scene-description">{scene.description}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="scene-form-overlay" onClick={() => setShowForm(false)}>
            <div className="scene-form-modal" onClick={e => e.stopPropagation()}>
              <div className="scene-form-title">
                {editId ? t('Редактировать сцену') : t('Новая сцена')}
              </div>

              <div className="scene-form-row">
                <div className="scene-form-group scene-form-group--sm">
                  <label>№ Сцены</label>
                  <input type="number" min={1} className="form-input"
                    value={form.number} onChange={e => setForm(p => ({ ...p, number: Math.max(1, parseInt(e.target.value) || 1) }))} />
                </div>
                <div className="scene-form-group scene-form-group--ie">
                  <label>Тип</label>
                  <div className="scene-toggle-group">
                    {(['INT', 'EXT'] as const).map(v => (
                      <button key={v} type="button"
                        className={`scene-toggle${form.interiorExterior === v ? ' active' : ''}`}
                        onClick={() => setForm(p => ({ ...p, interiorExterior: v }))}>
                        {IE_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="scene-form-group scene-form-group--dn">
                  <label>Время суток</label>
                  <div className="scene-toggle-group">
                    {(['DAY', 'NIGHT'] as const).map(v => (
                      <button key={v} type="button"
                        className={`scene-toggle${form.dayNight === v ? ' active' : ''}`}
                        onClick={() => setForm(p => ({ ...p, dayNight: v }))}>
                        {DN_LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <input className="form-input" placeholder="Название: ИНТ. КВАРТИРА — ДЕНЬ"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />

              <div className="scene-form-row">
                <div className="scene-form-group scene-form-group--flex">
                  <label>Локация</label>
                  <input className="form-input" placeholder="Квартира Алекса, улица..."
                    value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="scene-form-group">
                  <label>Мин. съёмки</label>
                  <input type="number" min={0} className="form-input"
                    value={form.estimatedMinutes} onChange={e => setForm(p => ({ ...p, estimatedMinutes: Math.max(0, parseInt(e.target.value) || 0) }))} />
                </div>
                <div className="scene-form-group">
                  <label>Страниц</label>
                  <input type="number" min={0} step={0.125} className="form-input"
                    value={form.pageCount} onChange={e => setForm(p => ({ ...p, pageCount: Math.max(0, parseFloat(e.target.value) || 0) }))} />
                </div>
              </div>

              {/* Characters — separate fields with + button */}
              <div className="scene-form-group">
                <label>Персонажи</label>
                <div className="char-list">
                  {form.characters.map((char, ci) => (
                    <div key={ci} className="char-row">
                      <input className="form-input" placeholder={`Персонаж ${ci + 1}`}
                        value={char} onChange={e => updateCharacter(ci, e.target.value)} />
                      {form.characters.length > 1 && (
                        <button type="button" className="char-remove-btn" onClick={() => removeCharacter(ci)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="char-add-btn" onClick={addCharacter}>
                    <Plus size={12} /> Добавить персонажа
                  </button>
                </div>
              </div>

              {/* Optional frame count */}
              <div className="scene-form-group">
                <label>Кадров раскадровки (0 = задаст режиссёр)</label>
                <input type="number" min={0} max={100} className="form-input"
                  value={form.storyboardFrameCount}
                  onChange={e => setForm(p => ({ ...p, storyboardFrameCount: Math.max(0, parseInt(e.target.value) || 0) }))} />
              </div>

              <textarea className="form-input" rows={3}
                placeholder="Краткое описание действия сцены..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

              <div className="scene-form-row">
                <div className="scene-form-group">
                  <label>Статус</label>
                  <select className="form-input" value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as SceneStatus }))}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>

              <div className="scene-form-footer">
                <button className="secondary-btn" onClick={() => setShowForm(false)}>Отмена</button>
                <button className="primary-btn" onClick={handleSave} disabled={busy || !form.title.trim()}>
                  {busy ? '...' : editId ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SceneManager.displayName = 'SceneManager';
export default SceneManager;
