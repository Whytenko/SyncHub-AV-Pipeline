import React from 'react';
import { Plus, Trash2, ChevronRight, Palette, Upload, User2, Shirt, ScrollText } from 'lucide-react';
import type { CostumeOutfit, GarmentCategory, GarmentAcquisition, LookStatus } from '../../../types';

type OutfitDraft = { name: string; characterName: string; sceneRefs: string; outfitNotes: string; status: LookStatus };
type GarmentDraft = {
  category: GarmentCategory;
  name: string;
  colorHex: string;
  material: string;
  brand: string;
  acquisition: GarmentAcquisition;
  price: number;
  notes: string;
};

export interface CostumesTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  costumeOutfits: CostumeOutfit[];
  setCostumeOutfits: (outfits: CostumeOutfit[]) => void;
  selectedOutfitId: number | null;
  setSelectedOutfitId: (id: number) => void;
  setOutfitDraft: (draft: OutfitDraft) => void;
  setOutfitEditId: (id: number | null) => void;
  setShowOutfitModal: (show: boolean) => void;
  setGarmentDraft: (draft: GarmentDraft) => void;
  setGarmentEditId: (id: number | null) => void;
  setGarmentTargetOutfitId: (id: number | null) => void;
  setShowGarmentModal: (show: boolean) => void;
  handleOutfitStatusChange: (id: number, status: LookStatus) => void;
  handleDeleteOutfit: (id: number) => void;
  handleDeleteGarment: (outfitId: number, garmentId: number) => void;
  saveCostumeOutfits: (outfits: CostumeOutfit[]) => Promise<void>;
  handleOutfitRefImage: (id: number) => void;
}

const GARMENT_LABELS: Record<string, string> = {
  top: 'Верх', bottom: 'Низ', outerwear: 'Верхняя одежда',
  shoes: 'Обувь', accessories: 'Аксессуары', headwear: 'Головной убор', underwear: 'Бельё'
};
const GARMENT_ICONS: Record<string, string> = {
  top: '👕', bottom: '👖', outerwear: '🧥',
  shoes: '👟', accessories: '💍', headwear: '🎩', underwear: '🩲'
};
const ACQ_LABELS: Record<string, string> = {
  owned: 'Есть', rented: 'Аренда', to_buy: 'Купить', to_make: 'Сшить'
};
const ACQ_COLORS: Record<string, string> = {
  owned: '#22c55e', rented: '#2196F3', to_buy: '#FF9800', to_make: '#9C27B0'
};
const STATUS_LABELS: Record<string, string> = {
  todo: 'Не начато', in_progress: 'В работе', ready: 'Готово', approved: 'Утверждено'
};
const STATUS_COLORS: Record<string, string> = {
  todo: '#6b7280', in_progress: '#2196F3', ready: '#FF9800', approved: '#22c55e'
};

const CostumesTab: React.FC<CostumesTabProps> = ({
  t, costumeOutfits, setCostumeOutfits, selectedOutfitId, setSelectedOutfitId,
  setOutfitDraft, setOutfitEditId, setShowOutfitModal,
  setGarmentDraft, setGarmentEditId, setGarmentTargetOutfitId, setShowGarmentModal,
  handleOutfitStatusChange, handleDeleteOutfit, handleDeleteGarment,
  saveCostumeOutfits, handleOutfitRefImage
}) => {
  const selectedOutfit = costumeOutfits.find(o => o.id === selectedOutfitId) ?? costumeOutfits[0] ?? null;
  const activeOutfitId = selectedOutfit?.id ?? null;
  const totalPrice = selectedOutfit ? selectedOutfit.garments.reduce((s, g) => s + (g.price || 0), 0) : 0;

  return (
    <div className="tab-content costumes-tab">
      <div className="craft-layout">
        {/* Left panel — outfits list */}
        <div className="craft-sidebar">
          <div className="craft-sidebar-head">
            <span className="craft-sidebar-title">{t('Образы')}</span>
            <button className="craft-add-btn" onClick={() => {
              setOutfitDraft({ name: '', characterName: '', sceneRefs: '', outfitNotes: '', status: 'todo' });
              setOutfitEditId(null);
              setShowOutfitModal(true);
            }}>
              <Plus size={14} /> {t('Добавить')}
            </button>
          </div>

          {costumeOutfits.length === 0 && (
            <div className="craft-empty">
              <Shirt size={28} style={{ opacity: 0.3 }} />
              <p>{t('Добавьте первый образ')}</p>
            </div>
          )}

          <div className="craft-list">
            {costumeOutfits.map(outfit => (
              <div
                key={outfit.id}
                className={`craft-list-item${activeOutfitId === outfit.id ? ' craft-list-item--active' : ''}`}
                onClick={() => setSelectedOutfitId(outfit.id)}
              >
                <div className="craft-list-item-dot" style={{ background: STATUS_COLORS[outfit.status] }} />
                <div className="craft-list-item-body">
                  <div className="craft-list-item-name">{outfit.name}</div>
                  <div className="craft-list-item-meta">
                    {outfit.characterName && <span><User2 size={11} /> {outfit.characterName}</span>}
                    {outfit.sceneRefs && <span>{outfit.sceneRefs}</span>}
                    {outfit.garments.length > 0 && <span>{outfit.garments.length} эл.</span>}
                  </div>
                </div>
                <ChevronRight size={14} className="craft-list-item-arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — outfit detail */}
        <div className="craft-detail">
          {!selectedOutfit ? (
            <div className="craft-detail-empty">
              <Shirt size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <p>{t('Выберите или создайте образ костюма')}</p>
              <button className="craft-add-btn craft-add-btn--lg" onClick={() => {
                setOutfitDraft({ name: '', characterName: '', sceneRefs: '', outfitNotes: '', status: 'todo' });
                setOutfitEditId(null);
                setShowOutfitModal(true);
              }}>
                <Plus size={16} /> {t('Создать образ')}
              </button>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="craft-detail-header">
                <div className="craft-detail-title-row">
                  <h3 className="craft-detail-title">{selectedOutfit.name}</h3>
                  <div className="craft-detail-actions">
                    <select
                      className="craft-status-select"
                      value={selectedOutfit.status}
                      style={{ borderColor: STATUS_COLORS[selectedOutfit.status], color: STATUS_COLORS[selectedOutfit.status] }}
                      onChange={e => handleOutfitStatusChange(selectedOutfit.id, e.target.value as LookStatus)}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button className="craft-icon-btn" title={t('Редактировать')} onClick={() => {
                      setOutfitDraft({ name: selectedOutfit.name, characterName: selectedOutfit.characterName, sceneRefs: selectedOutfit.sceneRefs, outfitNotes: selectedOutfit.outfitNotes, status: selectedOutfit.status });
                      setOutfitEditId(selectedOutfit.id);
                      setShowOutfitModal(true);
                    }}>✏️</button>
                    <button className="craft-icon-btn craft-icon-btn--danger" title={t('Удалить образ')} onClick={() => handleDeleteOutfit(selectedOutfit.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="craft-detail-meta">
                  {selectedOutfit.characterName && (
                    <span className="craft-meta-chip"><User2 size={12} /> {selectedOutfit.characterName}</span>
                  )}
                  {selectedOutfit.sceneRefs && (
                    <span className="craft-meta-chip">{selectedOutfit.sceneRefs}</span>
                  )}
                  {totalPrice > 0 && (
                    <span className="craft-meta-chip craft-meta-chip--price">
                      💰 {totalPrice.toLocaleString('ru-RU')} ₽
                    </span>
                  )}
                </div>
              </div>

              {/* Garments table */}
              <div className="craft-section">
                <div className="craft-section-head">
                  <span className="craft-section-title"><Shirt size={14} /> {t('Гардероб')}</span>
                  <button className="craft-add-btn" onClick={() => {
                    setGarmentDraft({ category: 'top', name: '', colorHex: '#333333', material: '', brand: '', acquisition: 'to_buy', price: 0, notes: '' });
                    setGarmentEditId(null);
                    setGarmentTargetOutfitId(selectedOutfit.id);
                    setShowGarmentModal(true);
                  }}>
                    <Plus size={12} /> {t('Добавить')}
                  </button>
                </div>
                {selectedOutfit.garments.length === 0 ? (
                  <div className="craft-table-empty">{t('Добавьте элементы гардероба')}</div>
                ) : (
                  <div className="craft-table craft-table--costumes">
                    <div className="craft-table-head">
                      <span>{t('Элемент')}</span>
                      <span>{t('Цвет / материал')}</span>
                      <span>{t('Статус')}</span>
                      <span>{t('Цена')}</span>
                      <span></span>
                    </div>
                    {selectedOutfit.garments.map(g => (
                      <div key={g.id} className="craft-table-row">
                        <span className="craft-garment-name">
                          <span className="craft-garment-icon">{GARMENT_ICONS[g.category] || '🧴'}</span>
                          <span>{g.name || GARMENT_LABELS[g.category]}</span>
                        </span>
                        <span className="craft-color-cell">
                          <span className="craft-color-swatch" style={{ background: g.colorHex }} />
                          <span className="craft-material">{g.material || '—'}</span>
                        </span>
                        <span>
                          <span className="craft-acq-badge" style={{ color: ACQ_COLORS[g.acquisition], borderColor: ACQ_COLORS[g.acquisition] }}>
                            {ACQ_LABELS[g.acquisition]}
                          </span>
                        </span>
                        <span className="craft-price">
                          {g.price > 0 ? `${g.price.toLocaleString('ru-RU')} ₽` : '—'}
                        </span>
                        <span className="craft-row-actions">
                          <button className="craft-icon-btn" onClick={() => {
                            setGarmentDraft({ category: g.category, name: g.name, colorHex: g.colorHex, material: g.material, brand: g.brand, acquisition: g.acquisition, price: g.price, notes: g.notes });
                            setGarmentEditId(g.id);
                            setGarmentTargetOutfitId(selectedOutfit.id);
                            setShowGarmentModal(true);
                          }}>✏️</button>
                          <button className="craft-icon-btn craft-icon-btn--danger" onClick={() => handleDeleteGarment(selectedOutfit.id, g.id)}>
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>
                    ))}
                    {totalPrice > 0 && (
                      <div className="craft-table-total">
                        <span>{t('Итого')}:</span>
                        <span className="craft-table-total-price">{totalPrice.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Color strip */}
              {selectedOutfit.garments.some(g => g.colorHex) && (
                <div className="craft-section">
                  <div className="craft-section-title"><Palette size={14} /> {t('Цветовая палитра образа')}</div>
                  <div className="craft-color-strip">
                    {selectedOutfit.garments.filter(g => g.colorHex).map(g => (
                      <div
                        key={g.id}
                        className="craft-strip-swatch"
                        style={{ background: g.colorHex }}
                        title={`${GARMENT_LABELS[g.category]}: ${g.colorHex}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="craft-section">
                <div className="craft-section-title"><ScrollText size={14} /> {t('Заметки к образу')}</div>
                <textarea
                  className="craft-notes-input"
                  placeholder={t('Примерка 15 мая, пиджак взять у костюмера...')}
                  value={selectedOutfit.outfitNotes}
                  rows={3}
                  onChange={e => {
                    const updated = costumeOutfits.map(o => o.id === selectedOutfit.id ? { ...o, outfitNotes: e.target.value } : o);
                    setCostumeOutfits(updated);
                  }}
                  onBlur={async () => { await saveCostumeOutfits(costumeOutfits); }}
                />
              </div>

              {/* Reference image */}
              <div className="craft-section">
                <div className="craft-section-title"><Upload size={14} /> {t('Референс')}</div>
                {selectedOutfit.referenceImage ? (
                  <div className="craft-ref-img-wrap">
                    <img src={selectedOutfit.referenceImage} alt="reference" className="craft-ref-img" />
                    <button className="craft-ref-remove" onClick={async () => {
                      const updated = costumeOutfits.map(o => o.id === selectedOutfit.id ? { ...o, referenceImage: '' } : o);
                      await saveCostumeOutfits(updated);
                    }}>✕</button>
                  </div>
                ) : (
                  <button className="craft-upload-btn" onClick={() => handleOutfitRefImage(selectedOutfit.id)}>
                    <Upload size={16} /> {t('Загрузить фото')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostumesTab;
