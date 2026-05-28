import React from 'react';
import { MapPinPlus } from 'lucide-react';
import type { StoryboardGrid } from '../../../types';

const tabColorDirector = '#2196F3';

export interface DirectorTabProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  storyboardGrid: StoryboardGrid;
  timelineDuration: number;
  timelineDurationInput: string;
  setTimelineDurationInput: (v: string) => void;
  handleSaveTimelineDuration: () => void;
  handleAddStoryboardRow: () => void;
  handleRemoveStoryboardRow: () => void;
  handleAddStoryboardColumn: () => void;
  handleRemoveStoryboardColumn: () => void;
  renameStoryboardRow: (idx: number, name: string) => void;
  saveStoryboardGrid: (grid: StoryboardGrid) => Promise<void>;
  openCellEditor: (row: number, col: number) => void;
  directorNotes: string;
  setDirectorNotes: (v: string) => void;
  handleSaveNotes: () => void;
  handleShareNotes: () => void;
}

const DirectorTab: React.FC<DirectorTabProps> = ({
  t, storyboardGrid, timelineDuration,
  timelineDurationInput, setTimelineDurationInput, handleSaveTimelineDuration,
  handleAddStoryboardRow, handleRemoveStoryboardRow,
  handleAddStoryboardColumn, handleRemoveStoryboardColumn,
  renameStoryboardRow, saveStoryboardGrid, openCellEditor,
  directorNotes, setDirectorNotes, handleSaveNotes, handleShareNotes
}) => (
  <div className="tab-content director-tab">

    {/* Storyboard */}
    <div className="storyboard-section">
      <div className="storyboard-toolbar">
        <div className="storyboard-toolbar-left">
          <h3>{t('Раскадровка')}</h3>
          {storyboardGrid.locationNames.length > 0 && (
            <span className="storyboard-dims">{storyboardGrid.locationNames.length} × {storyboardGrid.columnCount}</span>
          )}
        </div>
        <div className="storyboard-toolbar-right">
          <div className="storyboard-rows-ctrl">
            <button className="storyboard-ctrl-btn" onClick={handleAddStoryboardRow}>+ {t('Локация')}</button>
            <button className="storyboard-ctrl-btn storyboard-ctrl-btn--minus" onClick={handleRemoveStoryboardRow} disabled={storyboardGrid.locationNames.length === 0}>− {t('Строку')}</button>
          </div>
          <div className="storyboard-cols-ctrl">
            <button className="storyboard-ctrl-btn storyboard-ctrl-btn--minus" onClick={handleRemoveStoryboardColumn} disabled={storyboardGrid.columnCount <= 1}>−</button>
            <span className="storyboard-col-count">{storyboardGrid.columnCount} {t('кадров')}</span>
            <button className="storyboard-ctrl-btn" onClick={handleAddStoryboardColumn}>+</button>
          </div>
        </div>
      </div>

      {storyboardGrid.locationNames.length === 0 ? (
        <div className="storyboard-empty">
          <div className="storyboard-empty-title">{t('Раскадровка пуста')}</div>
          <div className="storyboard-empty-hint">{t('Добавьте локации кнопкой выше или задайте количество локаций на вкладке Сценарий')}</div>
          <button className="add-marker-btn" style={{ marginTop: 16 }} onClick={handleAddStoryboardRow}>
            <MapPinPlus size={16} className="add-marker-icon" />
            {t('Добавить первую локацию')}
          </button>
        </div>
      ) : (
        <div className="storyboard-table-wrap">
          <table className="storyboard-table">
            <thead>
              <tr>
                <th className="storyboard-th-loc">{t('Локация')}</th>
                {Array.from({ length: storyboardGrid.columnCount }, (_, ci) => (
                  <th key={ci} className="storyboard-th-shot">{t('Кадр')} {ci + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {storyboardGrid.locationNames.map((locName, ri) => (
                <tr key={ri}>
                  <td className="storyboard-row-label">
                    <input
                      className="storyboard-loc-input"
                      value={locName}
                      placeholder={`${t('Локация')} ${ri + 1}`}
                      onChange={(e) => renameStoryboardRow(ri, e.target.value)}
                      onBlur={() => saveStoryboardGrid(storyboardGrid)}
                    />
                  </td>
                  {Array.from({ length: storyboardGrid.columnCount }, (_, ci) => {
                    const key = `${ri}_${ci}`;
                    const cell = storyboardGrid.cells[key];
                    return (
                      <td key={ci} className={`storyboard-cell${cell?.imageUrl || cell?.description ? ' storyboard-cell--filled' : ''}`} onClick={() => openCellEditor(ri, ci)}>
                        {cell?.imageUrl
                          ? <img src={cell.imageUrl} alt="" className="storyboard-cell-img" />
                          : <div className="storyboard-cell-add">+</div>}
                        {cell?.shotType && <div className="storyboard-cell-type">{cell.shotType}</div>}
                        {cell?.description && <div className="storyboard-cell-desc">{cell.description}</div>}
                        {cell?.duration != null && cell.duration > 0 && <div className="storyboard-cell-dur">{cell.duration}с</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {(() => {
            const allCells = Object.values(storyboardGrid.cells);
            const totalSec = allCells.reduce((s, c) => s + (c.duration || 0), 0);
            const filled = allCells.filter(c => c.duration && c.duration > 0).length;
            const totalCells = storyboardGrid.locationNames.length * storyboardGrid.columnCount;
            const overload = totalSec > timelineDuration;
            if (filled === 0) return null;
            return (
              <div className={`storyboard-timing-bar${overload ? ' storyboard-timing-bar--over' : ''}`}>
                <span className="storyboard-timing-label">{t('Хронометраж')}:</span>
                <span className="storyboard-timing-total" style={{ color: overload ? 'var(--error)' : tabColorDirector }}>
                  {Math.floor(totalSec / 60)}:{String(totalSec % 60).padStart(2, '0')}
                </span>
                <span className="storyboard-timing-sep">/</span>
                <span className="storyboard-timing-max">{Math.floor(timelineDuration / 60)}:{String(timelineDuration % 60).padStart(2, '0')}</span>
                {overload && <span className="storyboard-timing-warn">⚠ {t('Превышение')}</span>}
                <span className="storyboard-timing-coverage">{filled}/{totalCells} {t('кадров размечено')}</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>

    {/* Secondary row */}
    <div className="director-secondary-row">
      <div className="director-secondary-card">
        <div className="director-secondary-title">{t('Параметры таймлайна')}</div>
        <div className="timeline-duration-form">
          <input
            className="form-input timeline-duration-input"
            placeholder={t('Например 240 или 4:00')}
            value={timelineDurationInput}
            onChange={(e) => setTimelineDurationInput(e.target.value)}
          />
          <button className="save-notes-btn save-timeline-btn" onClick={handleSaveTimelineDuration}>
            {t('Применить')}
          </button>
        </div>
      </div>

      <div className="director-secondary-card director-secondary-card--notes">
        <div className="director-secondary-title">{t('Заметки режиссёра')}</div>
        <textarea
          className="director-notes-editor"
          placeholder={t('Ваши заметки и идеи по съемке...')}
          rows={5}
          value={directorNotes}
          onChange={(e) => setDirectorNotes(e.target.value)}
        />
        <div className="notes-actions">
          <button className="save-notes-btn" onClick={handleSaveNotes}>{t('Сохранить')}</button>
          <button className="share-notes-btn" onClick={handleShareNotes}>{t('Поделиться')}</button>
        </div>
      </div>
    </div>
  </div>
);

export default DirectorTab;
