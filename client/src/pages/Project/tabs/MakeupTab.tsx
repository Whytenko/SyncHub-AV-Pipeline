import React from 'react';
import { Plus, Trash2, ChevronRight, Palette, Clock, AlertCircle, Upload, User2, Sparkles, Pencil as Pencil2 } from 'lucide-react';
import type { MakeupLook, MakeupZone, LookStatus, ProjectMarker, Task, TaskStatus, ProjectComment, TabType, Scene } from '../../../types';
import TabMarkersPanel from '../components/TabMarkersPanel';
import TabTasksPanel from '../components/TabTasksPanel';
import TabCommentsPanel from '../components/TabCommentsPanel';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

type LookDraft = { name: string; characterName: string; sceneRefs: string; applyTimeMin: number; skinNotes: string; status: LookStatus };
type ProductDraft = { zone: MakeupZone; productName: string; colorHex: string; technique: string };

export interface MakeupTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  makeupLooks: MakeupLook[];
  setMakeupLooks: (looks: MakeupLook[]) => void;
  selectedLookId: number | null;
  setSelectedLookId: (id: number) => void;
  setLookDraft: (draft: LookDraft) => void;
  setLookEditId: (id: number | null) => void;
  setShowLookModal: (show: boolean) => void;
  setProductDraft: (draft: ProductDraft) => void;
  setProductEditId: (id: number | null) => void;
  setProductTargetLookId: (id: number | null) => void;
  setShowProductModal: (show: boolean) => void;
  handleLookStatusChange: (id: number, status: LookStatus) => void;
  handleDeleteLook: (id: number) => void;
  handleDeleteProduct: (lookId: number, productId: number) => void;
  saveMakeupLooks: (looks: MakeupLook[]) => Promise<void>;
  handleLookRefImage: (id: number) => void;
  canEdit: boolean;
  userRole?: string;
  markers: ProjectMarker[];
  onDeleteMarker: (id: number) => void;
  onMarkerSeek: (time: number) => void;
  onAddMarker?: () => void;
  deptTasks: Task[];
  onTaskStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  tabComments: ProjectComment[];
  onToggleResolved: (id: number) => void;
  onAddComment: (tabId: TabType) => void;
  scenes: Scene[];
}

const ZONE_LABELS: Record<string, string> = {
  skin: 'Кожа', eyes: 'Глаза', brows: 'Брови', lips: 'Губы',
  cheeks: 'Скулы', contour: 'Контур', neck: 'Шея', other: 'Другое'
};
const STATUS_LABELS: Record<string, string> = {
  todo: 'Не начато', in_progress: 'В работе', ready: 'Готово', approved: 'Утверждено'
};
const STATUS_COLORS: Record<string, string> = {
  todo: '#6b7280', in_progress: '#2196F3', ready: '#FF9800', approved: '#22c55e'
};

const MakeupTab: React.FC<MakeupTabProps> = ({
  t, makeupLooks, setMakeupLooks, selectedLookId, setSelectedLookId,
  setLookDraft, setLookEditId, setShowLookModal,
  setProductDraft, setProductEditId, setProductTargetLookId, setShowProductModal,
  handleLookStatusChange, handleDeleteLook, handleDeleteProduct,
  saveMakeupLooks, handleLookRefImage,
  canEdit, userRole, markers, onDeleteMarker, onMarkerSeek, onAddMarker,
  deptTasks, onTaskStatusChange,
  tabComments, onToggleResolved, onAddComment,
  scenes
}) => {
  const selectedLook = makeupLooks.find(l => l.id === selectedLookId) ?? makeupLooks[0] ?? null;
  const activeLookId = selectedLook?.id ?? null;

  return (
    <div className="tab-content makeup-tab">
      {!canEdit && <ReadOnlyBanner t={t} role={userRole} />}
      <div className="craft-layout">
        {/* Left panel — list of looks */}
        <div className="craft-sidebar">
          <div className="craft-sidebar-head">
            <span className="craft-sidebar-title">{t('Образы')}</span>
            <button className="craft-add-btn" onClick={() => {
              setLookDraft({ name: '', characterName: '', sceneRefs: '', applyTimeMin: 30, skinNotes: '', status: 'todo' });
              setLookEditId(null);
              setShowLookModal(true);
            }}>
              <Plus size={14} /> {t('Добавить')}
            </button>
          </div>

          {makeupLooks.length === 0 && (
            <div className="craft-empty">
              <Sparkles size={28} style={{ opacity: 0.3 }} />
              <p>{t('Добавьте первый образ')}</p>
            </div>
          )}

          <div className="craft-list">
            {makeupLooks.map(look => (
              <div
                key={look.id}
                className={`craft-list-item${activeLookId === look.id ? ' craft-list-item--active' : ''}`}
                onClick={() => setSelectedLookId(look.id)}
              >
                <div className="craft-list-item-dot" style={{ background: STATUS_COLORS[look.status] }} />
                <div className="craft-list-item-body">
                  <div className="craft-list-item-name">{look.name}</div>
                  <div className="craft-list-item-meta">
                    {look.characterName && <span><User2 size={11} /> {look.characterName}</span>}
                    {look.sceneRefs && (() => {
                      const nums = look.sceneRefs.split(',').map(s => parseInt(s.replace(/[^\d]/g,''),10)).filter(Boolean);
                      return nums.length > 0 ? <span>{nums.length} {t('сцен')}</span> : null;
                    })()}
                  </div>
                </div>
                <ChevronRight size={14} className="craft-list-item-arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — selected look detail */}
        <div className="craft-detail">
          {!selectedLook ? (
            <div className="craft-detail-empty">
              <Sparkles size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <p>{t('Выберите или создайте образ визажа')}</p>
              <button className="craft-add-btn craft-add-btn--lg" onClick={() => {
                setLookDraft({ name: '', characterName: '', sceneRefs: '', applyTimeMin: 30, skinNotes: '', status: 'todo' });
                setLookEditId(null);
                setShowLookModal(true);
              }}>
                <Plus size={16} /> {t('Создать образ')}
              </button>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="craft-detail-header">
                <div className="craft-detail-title-row">
                  <h3 className="craft-detail-title">{selectedLook.name}</h3>
                  <div className="craft-detail-actions">
                    <select
                      className="craft-status-select"
                      value={selectedLook.status}
                      style={{ borderColor: STATUS_COLORS[selectedLook.status], color: STATUS_COLORS[selectedLook.status] }}
                      onChange={e => handleLookStatusChange(selectedLook.id, e.target.value as LookStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button className="craft-icon-btn" title={t('Редактировать')} onClick={() => {
                      setLookDraft({ name: selectedLook.name, characterName: selectedLook.characterName, sceneRefs: selectedLook.sceneRefs, applyTimeMin: selectedLook.applyTimeMin, skinNotes: selectedLook.skinNotes, status: selectedLook.status });
                      setLookEditId(selectedLook.id);
                      setShowLookModal(true);
                    }}><Pencil2 size={14} /></button>
                    <button className="craft-icon-btn craft-icon-btn--danger" title={t('Удалить образ')} onClick={() => handleDeleteLook(selectedLook.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="craft-detail-meta">
                  {selectedLook.characterName && (
                    <span className="craft-meta-chip"><User2 size={12} /> {selectedLook.characterName}</span>
                  )}
                  {selectedLook.sceneRefs && (() => {
                    const nums = selectedLook.sceneRefs.split(',').map(s => parseInt(s.replace(/[^\d]/g,''),10)).filter(Boolean);
                    if (!nums.length) return null;
                    const refs = scenes.filter(s => nums.includes(s.number)).sort((a,b)=>a.number-b.number);
                    return (
                      <div className="craft-scene-refs">
                        <span className="craft-scene-refs-label">{t('Сцены')}:</span>
                        {refs.length > 0
                          ? refs.map(s => <span key={s.id} className="craft-scene-badge" title={s.title}>Сц.{s.number}</span>)
                          : nums.map(n => <span key={n} className="craft-scene-badge">Сц.{n}</span>)
                        }
                      </div>
                    );
                  })()}
                  {selectedLook.applyTimeMin > 0 && (
                    <span className="craft-meta-chip"><Clock size={12} /> {selectedLook.applyTimeMin} мин</span>
                  )}
                  {scenes.length > 0 && selectedLook.characterName && (() => {
                    const picked = new Set(
                      (selectedLook.sceneRefs || '').split(',').map(s => parseInt(s.replace(/[^\d]/g,''),10)).filter(Boolean)
                    );
                    const matching = scenes.filter(s =>
                      !picked.has(s.number) &&
                      s.characters.some(c => c.toLowerCase().includes(selectedLook.characterName.toLowerCase()))
                    );
                    if (!matching.length) return null;
                    return (
                      <div className="craft-scene-refs">
                        <span className="craft-scene-refs-label">{t('Также с этим персонажем')}:</span>
                        {matching.map(sc => (
                          <span key={sc.id} className="craft-scene-badge craft-scene-badge--suggested" title={sc.title}>Сц.{sc.number}</span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Products table */}
              <div className="craft-section">
                <div className="craft-section-head">
                  <span className="craft-section-title"><Palette size={14} /> {t('Продукты')}</span>
                  <button className="craft-add-btn" onClick={() => {
                    setProductDraft({ zone: 'skin', productName: '', colorHex: '#F5D5C0', technique: '' });
                    setProductEditId(null);
                    setProductTargetLookId(selectedLook.id);
                    setShowProductModal(true);
                  }}>
                    <Plus size={12} /> {t('Добавить')}
                  </button>
                </div>
                {selectedLook.products.length === 0 ? (
                  <div className="craft-table-empty">{t('Добавьте продукты для этого образа')}</div>
                ) : (
                  <div className="craft-table">
                    <div className="craft-table-head">
                      <span>{t('Зона')}</span>
                      <span>{t('Продукт')}</span>
                      <span>{t('Цвет')}</span>
                      <span>{t('Техника')}</span>
                      <span></span>
                    </div>
                    {selectedLook.products.map(p => (
                      <div key={p.id} className="craft-table-row">
                        <span className="craft-zone-badge">{ZONE_LABELS[p.zone] || p.zone}</span>
                        <span className="craft-product-name">{p.productName}</span>
                        <span className="craft-color-cell">
                          <span className="craft-color-swatch" style={{ background: p.colorHex }} />
                          <span className="craft-color-hex">{p.colorHex}</span>
                        </span>
                        <span className="craft-technique">{p.technique || '—'}</span>
                        <span className="craft-row-actions">
                          <button className="craft-icon-btn" onClick={() => {
                            setProductDraft({ zone: p.zone, productName: p.productName, colorHex: p.colorHex, technique: p.technique });
                            setProductEditId(p.id);
                            setProductTargetLookId(selectedLook.id);
                            setShowProductModal(true);
                          }}><Pencil2 size={14} /></button>
                          <button className="craft-icon-btn craft-icon-btn--danger" onClick={() => handleDeleteProduct(selectedLook.id, p.id)}>
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skin notes */}
              <div className="craft-section">
                <div className="craft-section-title"><AlertCircle size={14} /> {t('Особенности кожи / аллергии')}</div>
                <textarea
                  className="craft-notes-input"
                  placeholder={t('Нет аллергий, тип кожи — комбинированная...')}
                  value={selectedLook.skinNotes}
                  rows={3}
                  onChange={e => {
                    const updated = makeupLooks.map(l => l.id === selectedLook.id ? { ...l, skinNotes: e.target.value } : l);
                    setMakeupLooks(updated);
                  }}
                  onBlur={async () => {
                    await saveMakeupLooks(makeupLooks);
                  }}
                />
              </div>

              {/* Reference image */}
              <div className="craft-section">
                <div className="craft-section-title"><Upload size={14} /> {t('Референс')}</div>
                {selectedLook.referenceImage ? (
                  <div className="craft-ref-img-wrap">
                    <img src={selectedLook.referenceImage} alt="reference" className="craft-ref-img" />
                    <button className="craft-ref-remove" onClick={async () => {
                      const updated = makeupLooks.map(l => l.id === selectedLook.id ? { ...l, referenceImage: '' } : l);
                      await saveMakeupLooks(updated);
                    }}>✕</button>
                  </div>
                ) : (
                  <button className="craft-upload-btn" onClick={() => handleLookRefImage(selectedLook.id)}>
                    <Upload size={16} /> {t('Загрузить фото')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <TabCommentsPanel t={t} comments={tabComments} tabId="makeup" canEdit={canEdit} onToggleResolved={onToggleResolved} onAddComment={onAddComment} />
      <TabTasksPanel t={t} tasks={deptTasks} canEdit={canEdit} onStatusChange={onTaskStatusChange} />
      <TabMarkersPanel
        t={t} markers={markers} tabId="makeup"
        canEdit={canEdit} onDelete={onDeleteMarker} onSeek={onMarkerSeek} onAddMarker={onAddMarker}
      />
    </div>
  );
};

export default MakeupTab;
