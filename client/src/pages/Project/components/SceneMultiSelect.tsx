import React from 'react';
import { Check, Film } from 'lucide-react';
import type { Scene } from '../../../types';

interface SceneMultiSelectProps {
  t: (key: string) => string;
  scenes: Scene[];
  value: string;                       // comma-separated scene numbers, e.g. "1, 3, 7"
  onChange: (next: string) => void;
  characterFilter?: string;            // if set, scenes are pre-sorted (those with this character first)
}

const parseRefs = (raw: string): number[] =>
  raw
    .split(',')
    .map(s => parseInt(s.replace(/[^\d]/g, ''), 10))
    .filter(n => Number.isFinite(n) && n > 0);

const formatRefs = (nums: number[]): string =>
  [...new Set(nums)].sort((a, b) => a - b).join(', ');

const SceneMultiSelect: React.FC<SceneMultiSelectProps> = ({
  t, scenes, value, onChange, characterFilter
}) => {
  const selected = new Set(parseRefs(value));

  const sorted = React.useMemo(() => {
    const list = [...scenes].sort((a, b) => a.number - b.number);
    if (!characterFilter) return list;
    const target = characterFilter.trim().toLowerCase();
    if (!target) return list;
    return [...list].sort((a, b) => {
      const aHas = a.characters.some(c => c.toLowerCase() === target) ? 0 : 1;
      const bHas = b.characters.some(c => c.toLowerCase() === target) ? 0 : 1;
      return aHas - bHas || a.number - b.number;
    });
  }, [scenes, characterFilter]);

  const toggle = (num: number) => {
    const next = new Set(selected);
    if (next.has(num)) next.delete(num); else next.add(num);
    onChange(formatRefs([...next]));
  };

  const selectAllSuggested = () => {
    if (!characterFilter) return;
    const target = characterFilter.trim().toLowerCase();
    const suggested = sorted.filter(s => s.characters.some(c => c.toLowerCase() === target)).map(s => s.number);
    onChange(formatRefs([...selected, ...suggested]));
  };

  const clearAll = () => onChange('');

  if (scenes.length === 0) {
    return (
      <div className="scene-ms-empty">
        <Film size={16} style={{ opacity: 0.4 }} />
        <span>{t('Сцен пока нет — сначала их создаёт сценарист')}</span>
      </div>
    );
  }

  const suggestedCount = characterFilter
    ? sorted.filter(s => s.characters.some(c => c.toLowerCase() === characterFilter.trim().toLowerCase())).length
    : 0;

  return (
    <div className="scene-ms">
      <div className="scene-ms-toolbar">
        <span className="scene-ms-summary">
          {selected.size > 0
            ? t('Выбрано: {n}').replace('{n}', String(selected.size))
            : t('Не выбрано ни одной сцены')
          }
        </span>
        <div className="scene-ms-toolbar-actions">
          {suggestedCount > 0 && (
            <button type="button" className="scene-ms-action-btn" onClick={selectAllSuggested}>
              {t('Все с этим персонажем')} ({suggestedCount})
            </button>
          )}
          {selected.size > 0 && (
            <button type="button" className="scene-ms-action-btn scene-ms-action-btn--clear" onClick={clearAll}>
              {t('Очистить')}
            </button>
          )}
        </div>
      </div>

      <div className="scene-ms-list">
        {sorted.map(scene => {
          const isSelected = selected.has(scene.number);
          const isSuggested = characterFilter
            ? scene.characters.some(c => c.toLowerCase() === characterFilter.trim().toLowerCase())
            : false;
          return (
            <button
              key={scene.id}
              type="button"
              className={`scene-ms-chip${isSelected ? ' scene-ms-chip--selected' : ''}${isSuggested && !isSelected ? ' scene-ms-chip--suggested' : ''}`}
              onClick={() => toggle(scene.number)}
              title={scene.title}
            >
              <span className="scene-ms-chip-check">
                {isSelected && <Check size={11} />}
              </span>
              <span className="scene-ms-chip-num">Сц.{scene.number}</span>
              <span className="scene-ms-chip-ie">
                {scene.interiorExterior === 'INT' ? 'ИНТ' : 'НАТ'}·{scene.dayNight === 'DAY' ? 'ДН' : 'НЧ'}
              </span>
              <span className="scene-ms-chip-title">{scene.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SceneMultiSelect;
