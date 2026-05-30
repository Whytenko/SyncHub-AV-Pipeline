import React, { useRef, useState } from 'react';
import { FileText, Film, Settings, Plus, ChevronDown, ChevronUp, Users, MapPin, Shirt, Zap, Truck, Camera, Music, Star, AlertTriangle, BookOpen } from 'lucide-react';
import type { ScriptParams, ProjectMarker, Task, TaskStatus, ProjectComment, TabType, Scene, ProductionStage } from '../../../types';
import TabMarkersPanel from '../components/TabMarkersPanel';
import TabTasksPanel from '../components/TabTasksPanel';
import TabCommentsPanel from '../components/TabCommentsPanel';
import SceneManager, { type SceneManagerHandle } from '../components/SceneManager';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

export interface ScriptTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  scriptParams: ScriptParams;
  scriptFileInputRef: React.RefObject<HTMLInputElement>;
  handleScriptFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveScriptFile: () => void;
  updateScriptParam: <K extends keyof ScriptParams>(key: K, value: ScriptParams[K]) => void;
  setScriptParamsDraft: React.Dispatch<React.SetStateAction<ScriptParams>>;
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
  productionStage: ProductionStage;
  onSaveScenes: (scenes: Scene[]) => Promise<void>;
}

const ScriptTab: React.FC<ScriptTabProps> = ({
  t, scriptParams, scriptFileInputRef,
  handleScriptFileUpload, handleRemoveScriptFile,
  updateScriptParam, setScriptParamsDraft,
  canEdit, userRole, markers, onDeleteMarker, onMarkerSeek, onAddMarker,
  deptTasks, onTaskStatusChange,
  tabComments, onToggleResolved, onAddComment,
  scenes, productionStage, onSaveScenes
}) => {
  const [showFullSettings, setShowFullSettings] = useState(false);
  const sceneManagerRef = useRef<SceneManagerHandle>(null);

  const canModify = canEdit && (productionStage === 'development' || productionStage === 'pre_production');

  return (
    <div className="tab-content script-tab">
      {!canEdit && <ReadOnlyBanner t={t} role={userRole} />}
      <input
        ref={scriptFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={handleScriptFileUpload}
        disabled={!canEdit}
      />

      {/* ── Top 3-column action row ── */}
      <div className="script-top-row">

        {/* Card 1: Upload Script */}
        <div
          className="script-action-card"
          onClick={() => canEdit && scriptFileInputRef.current?.click()}
          style={canEdit ? { cursor: 'pointer' } : {}}
        >
          <div className="script-action-card-head">
            <FileText size={16} className="script-action-card-icon" />
            <span className="script-action-card-title">{t('Загрузка сценария')}</span>
          </div>
          {scriptParams.scriptFile ? (
            <>
              <span className="script-action-card-file">{scriptParams.scriptFile.name}</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {canEdit && (
                  <button
                    className="script-action-card-cta"
                    onClick={e => { e.stopPropagation(); scriptFileInputRef.current?.click(); }}
                  >
                    Заменить
                  </button>
                )}
                {canEdit && (
                  <button
                    className="script-action-card-cta"
                    style={{ color: 'var(--error)' }}
                    onClick={e => { e.stopPropagation(); handleRemoveScriptFile(); }}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </>
          ) : (
            <span className="script-action-card-body">
              {canEdit ? 'PDF, Word, PNG, JPG — нажмите или перетащите' : 'Файл не загружен'}
            </span>
          )}
        </div>

        {/* Card 2: Create Scenes */}
        <div className="script-action-card">
          <div className="script-action-card-head">
            <Film size={16} className="script-action-card-icon" />
            <span className="script-action-card-title">{t('Сцены')}</span>
            <span style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-muted)',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 7px',
              color: 'var(--text-secondary)'
            }}>{scenes.length}</span>
          </div>
          <span className="script-action-card-body">
            {scenes.length === 0
              ? 'Создайте сцены — основа всего проекта'
              : `${scenes.filter(s => s.status === 'approved').length} утверждено · ${scenes.filter(s => s.status === 'draft').length} черновик`
            }
          </span>
          {canModify && (
            <button
              className="script-action-card-cta"
              onClick={() => sceneManagerRef.current?.openNew()}
            >
              <Plus size={12} /> Добавить сцену
            </button>
          )}
        </div>

        {/* Card 3: Full Settings */}
        <div
          className={`script-action-card${showFullSettings ? ' script-action-card--active' : ''}`}
          onClick={() => setShowFullSettings(v => !v)}
          style={{ cursor: 'pointer' }}
        >
          <div className="script-action-card-head">
            <Settings size={16} className="script-action-card-icon" />
            <span className="script-action-card-title">{t('Полные настройки')}</span>
            <span className="script-action-card-required">обязательно</span>
          </div>
          <span className="script-action-card-body">
            Параметры съёмки, актёры, формат, звук, риски
          </span>
          <span className="script-action-card-cta" style={{ marginTop: 4 }}>
            {showFullSettings ? <><ChevronUp size={12} /> Свернуть</> : <><ChevronDown size={12} /> Развернуть</>}
          </span>
        </div>

      </div>

      {/* ── Scene file preview (when file is loaded) ── */}
      {scriptParams.scriptFile?.dataUrl && (
        <div style={{ marginBottom: 16 }}>
          <img
            src={scriptParams.scriptFile.dataUrl}
            className="script-file-thumb"
            alt={scriptParams.scriptFile.name}
            style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain', display: 'block' }}
          />
        </div>
      )}

      {/* ── Scene Manager (always visible) ── */}
      <SceneManager
        ref={sceneManagerRef}
        t={t}
        scenes={scenes}
        productionStage={productionStage}
        canEdit={canEdit}
        onSave={onSaveScenes}
      />

      {/* ── Full settings panel (collapsible) ── */}
      {showFullSettings && (
        <div className="script-settings-panel">
          <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div className="sp-grid">

              <div className="sp-section">
                <div className="sp-section-header">
                  <Users size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Актёрский состав')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field sp-field--accent">
                    <label className="sp-label">{t('Главных актёров')}</label>
                    <input type="number" min={0} max={500} className="sp-num" value={scriptParams.actorsCount} onChange={(e) => updateScriptParam('actorsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    <span className="sp-hint">{t('→ Костюмер и Визажист')}</span>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Массовка / экстра')}</label>
                    <input type="number" min={0} max={10000} className="sp-num" value={scriptParams.extraActorsCount} onChange={(e) => updateScriptParam('extraActorsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Дети-актёры')}</label>
                    <input type="number" min={0} max={200} className="sp-num" value={scriptParams.childActorsCount} onChange={(e) => updateScriptParam('childActorsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Животные')}</label>
                    <input type="number" min={0} max={200} className="sp-num" value={scriptParams.animalsCount} onChange={(e) => updateScriptParam('animalsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <MapPin size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Масштаб производства')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field sp-field--accent">
                    <label className="sp-label">{t('Количество локаций')}</label>
                    <input type="number" min={0} max={200} className="sp-num" value={scriptParams.locationsCount} onChange={(e) => updateScriptParam('locationsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Наружных сцен')}</label>
                    <input type="number" min={0} max={5000} className="sp-num" value={scriptParams.exteriorScenesCount} onChange={(e) => updateScriptParam('exteriorScenesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Внутренних сцен')}</label>
                    <input type="number" min={0} max={5000} className="sp-num" value={scriptParams.interiorScenesCount} onChange={(e) => updateScriptParam('interiorScenesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Ночных сцен')}</label>
                    <input type="number" min={0} max={5000} className="sp-num" value={scriptParams.nightScenesCount} onChange={(e) => updateScriptParam('nightScenesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Дней съёмок')}</label>
                    <input type="number" min={0} max={1000} className="sp-num" value={scriptParams.shootingDaysCount} onChange={(e) => updateScriptParam('shootingDaysCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Хронометраж (мин)')}</label>
                    <input type="number" min={0} max={600} className="sp-num" value={scriptParams.totalDurationMin} onChange={(e) => updateScriptParam('totalDurationMin', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <Shirt size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Реквизит и образы')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('Единиц реквизита')}</label>
                    <input type="number" min={0} max={10000} className="sp-num" value={scriptParams.propsCount} onChange={(e) => updateScriptParam('propsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Комплектов костюмов')}</label>
                    <input type="number" min={0} max={2000} className="sp-num" value={scriptParams.costumeSetsCount} onChange={(e) => updateScriptParam('costumeSetsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Образов грима')}</label>
                    <input type="number" min={0} max={2000} className="sp-num" value={scriptParams.makeupLooksCount} onChange={(e) => updateScriptParam('makeupLooksCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.wigs} onChange={(e) => updateScriptParam('wigs', e.target.checked)} /><span>{t('Парики / накладные волосы')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.prosthetics} onChange={(e) => updateScriptParam('prosthetics', e.target.checked)} /><span>{t('Грим-протезы / трансформации')}</span></label></div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <Zap size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Эффекты и трюки')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('VFX-кадров (цифровые эффекты)')}</label>
                    <input type="number" min={0} max={10000} className="sp-num" value={scriptParams.vfxShotsCount} onChange={(e) => updateScriptParam('vfxShotsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Реальных эффектов (пиро/огонь/вода)')}</label>
                    <input type="number" min={0} max={1000} className="sp-num" value={scriptParams.practicalEffectsCount} onChange={(e) => updateScriptParam('practicalEffectsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Трюков (каскадёры)')}</label>
                    <input type="number" min={0} max={500} className="sp-num" value={scriptParams.stuntsCount} onChange={(e) => updateScriptParam('stuntsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.weaponProps} onChange={(e) => updateScriptParam('weaponProps', e.target.checked)} /><span>{t('Оружие / имитация оружия')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.pyrotechnics} onChange={(e) => updateScriptParam('pyrotechnics', e.target.checked)} /><span>{t('Пиротехника')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.rainScenes} onChange={(e) => updateScriptParam('rainScenes', e.target.checked)} /><span>{t('Сцены с дождём')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.snowScenes} onChange={(e) => updateScriptParam('snowScenes', e.target.checked)} /><span>{t('Сцены со снегом')}</span></label></div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <Truck size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Транспорт и оборудование')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('Транспортных средств')}</label>
                    <input type="number" min={0} max={1000} className="sp-num" value={scriptParams.vehiclesCount} onChange={(e) => updateScriptParam('vehiclesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.vehicleChases} onChange={(e) => updateScriptParam('vehicleChases', e.target.checked)} /><span>{t('Автомобильные погони')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.droneShots} onChange={(e) => updateScriptParam('droneShots', e.target.checked)} /><span>{t('Дрон-съёмка')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.underwaterShots} onChange={(e) => updateScriptParam('underwaterShots', e.target.checked)} /><span>{t('Подводные съёмки')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.aerialShots} onChange={(e) => updateScriptParam('aerialShots', e.target.checked)} /><span>{t('Авиасъёмка (вертолёт)')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.craneShots} onChange={(e) => updateScriptParam('craneShots', e.target.checked)} /><span>{t('Кран / рельсовые тележки')}</span></label></div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <Camera size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Камера и формат')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('Формат съёмки')}</label>
                    <select className="sp-select" value={scriptParams.productionFormat} onChange={(e) => updateScriptParam('productionFormat', e.target.value)}>
                      {['4K','6K','8K','HD 1080p','Film 35mm','Film 16mm','Цифровой RAW'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Соотношение сторон')}</label>
                    <select className="sp-select" value={scriptParams.aspectRatio} onChange={(e) => updateScriptParam('aspectRatio', e.target.value)}>
                      {['16:9','2.35:1','1.85:1','4:3','2.39:1','1:1'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.handheldStyle} onChange={(e) => updateScriptParam('handheldStyle', e.target.checked)} /><span>{t('Ручная камера')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.steadicam} onChange={(e) => updateScriptParam('steadicam', e.target.checked)} /><span>{t('Стедикам')}</span></label></div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <Music size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Звук и музыка')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('Оригинальных треков')}</label>
                    <input type="number" min={0} max={500} className="sp-num" value={scriptParams.originalMusicTracks} onChange={(e) => updateScriptParam('originalMusicTracks', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Жанр музыки')}</label>
                    <input type="text" className="sp-text" value={scriptParams.musicGenre} placeholder={t('Оркестр, Электроника...')}
                      onChange={(e) => setScriptParamsDraft(prev => ({ ...prev, musicGenre: e.target.value }))}
                      onBlur={(e) => updateScriptParam('musicGenre', e.target.value)} />
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.voiceOverPresent} onChange={(e) => updateScriptParam('voiceOverPresent', e.target.checked)} /><span>{t('Закадровый голос (VO)')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.silentScenes} onChange={(e) => updateScriptParam('silentScenes', e.target.checked)} /><span>{t('Сцены без диалогов')}</span></label></div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <Star size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Жанр и аудитория')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('Жанр')}</label>
                    <select className="sp-select" value={scriptParams.genre} onChange={(e) => updateScriptParam('genre', e.target.value)}>
                      <option value="">{t('Выбрать...')}</option>
                      {['Драма','Комедия','Триллер','Экшн','Мелодрама','Ужасы','Фантастика','Фэнтези','Документальный','Анимация','Биографический','Музыкальный','Криминал','Вестерн','Исторический'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Возрастной рейтинг')}</label>
                    <select className="sp-select" value={scriptParams.ageRating} onChange={(e) => updateScriptParam('ageRating', e.target.value)}>
                      {['0+','6+','12+','16+','18+'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Целевая аудитория')}</label>
                    <input type="text" className="sp-text" value={scriptParams.targetAudience} placeholder={t('18–35, семейная...')}
                      onChange={(e) => setScriptParamsDraft(prev => ({ ...prev, targetAudience: e.target.value }))}
                      onBlur={(e) => updateScriptParam('targetAudience', e.target.value)} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Язык диалогов')}</label>
                    <select className="sp-select" value={scriptParams.dialogLanguage} onChange={(e) => updateScriptParam('dialogLanguage', e.target.value)}>
                      {['Русский','Английский','Китайский','Французский','Немецкий','Испанский','Несколько языков'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.subtitlesNeeded} onChange={(e) => updateScriptParam('subtitlesNeeded', e.target.checked)} /><span>{t('Необходимы субтитры')}</span></label></div>
                </div>
              </div>

              <div className="sp-section">
                <div className="sp-section-header">
                  <AlertTriangle size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Риски и условия')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field">
                    <label className="sp-label">{t('Погодозависимых дней')}</label>
                    <input type="number" min={0} max={365} className="sp-num" value={scriptParams.weatherDependentDays} onChange={(e) => updateScriptParam('weatherDependentDays', Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.hazardousConditions} onChange={(e) => updateScriptParam('hazardousConditions', e.target.checked)} /><span>{t('Опасные условия (огонь, высота, вода)')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.internationalShoot} onChange={(e) => updateScriptParam('internationalShoot', e.target.checked)} /><span>{t('Международные съёмки')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.remoteLocations} onChange={(e) => updateScriptParam('remoteLocations', e.target.checked)} /><span>{t('Труднодоступные локации')}</span></label></div>
                  <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.militaryEquipment} onChange={(e) => updateScriptParam('militaryEquipment', e.target.checked)} /><span>{t('Военная техника / спецсредства')}</span></label></div>
                </div>
              </div>

              <div className="sp-section sp-section--wide">
                <div className="sp-section-header">
                  <BookOpen size={14} className="sp-section-icon" />
                  <div className="sp-section-title">{t('Концепция')}</div>
                </div>
                <div className="sp-fields">
                  <div className="sp-field sp-field--full">
                    <label className="sp-label">{t('Логлайн (1–2 предложения)')}</label>
                    <textarea className="sp-textarea" value={scriptParams.logline} placeholder={t('Краткое описание сюжета...')} rows={3}
                      onChange={(e) => setScriptParamsDraft(prev => ({ ...prev, logline: e.target.value }))}
                      onBlur={(e) => updateScriptParam('logline', e.target.value)} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Уровень бюджета')}</label>
                    <select className="sp-select" value={scriptParams.budgetTier} onChange={(e) => updateScriptParam('budgetTier', e.target.value)}>
                      <option value="micro">{t('Микро (< 1 млн)')}</option>
                      <option value="low">{t('Малый (1–10 млн)')}</option>
                      <option value="mid">{t('Средний (10–100 млн)')}</option>
                      <option value="high">{t('Высокий (> 100 млн)')}</option>
                      <option value="blockbuster">{t('Блокбастер (500+ млн)')}</option>
                    </select>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">{t('Цветовая гамма')}</label>
                    <select className="sp-select" value={scriptParams.colorGrading} onChange={(e) => updateScriptParam('colorGrading', e.target.value)}>
                      {['Нейтральная','Тёплая','Холодная','Монохром','Высококонтрастная','Пастельная','Мрачная / тёмная'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </fieldset>
        </div>
      )}

      <TabCommentsPanel t={t} comments={tabComments} tabId="script" canEdit={canEdit} onToggleResolved={onToggleResolved} onAddComment={onAddComment} />
      <TabTasksPanel t={t} tasks={deptTasks} canEdit={canEdit} onStatusChange={onTaskStatusChange} />
      <TabMarkersPanel
        t={t} markers={markers} tabId="script"
        canEdit={canEdit} onDelete={onDeleteMarker} onSeek={onMarkerSeek} onAddMarker={onAddMarker}
      />
    </div>
  );
};

export default ScriptTab;
