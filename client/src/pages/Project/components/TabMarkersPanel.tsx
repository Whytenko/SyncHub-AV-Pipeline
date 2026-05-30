import React from 'react';
import { Trash2, MapPin, MapPinPlus } from 'lucide-react';
import type { ProjectMarker, TabType } from '../../../types';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

interface TabMarkersPanelProps {
  t: (key: string) => string;
  markers: ProjectMarker[];
  tabId: TabType;
  canEdit: boolean;
  onDelete: (id: number) => void;
  onSeek: (time: number) => void;
  onAddMarker?: () => void;
}

const TabMarkersPanel: React.FC<TabMarkersPanelProps> = ({
  t, markers, tabId, canEdit, onDelete, onSeek, onAddMarker
}) => {
  const tabMarkers = markers
    .filter(m => m.tabId === tabId)
    .sort((a, b) => a.time - b.time);

  return (
    <div className="tab-markers-panel">
      <div className="tab-markers-header">
        <MapPin size={14} />
        <span>{t('Метки таймлайна')}</span>
        {tabMarkers.length > 0 && (
          <span className="tab-markers-count">{tabMarkers.length}</span>
        )}
        {canEdit && onAddMarker && (
          <button
            className="tab-markers-add-btn"
            onClick={onAddMarker}
            title={t('Добавить метку')}
          >
            <MapPinPlus size={13} />
            {t('Добавить метку')}
          </button>
        )}
      </div>

      {tabMarkers.length === 0 ? (
        <div className="tab-markers-empty">
          {canEdit
            ? t('Нет меток — добавьте первую кнопкой выше или через таймлайн (⌘M)')
            : t('Меток для этого раздела пока нет')}
        </div>
      ) : (
        <div className="tab-markers-list">
          {tabMarkers.map(marker => (
            <div
              key={marker.id}
              className="tab-marker-row"
              onClick={() => onSeek(marker.time)}
              title={t('Перейти к позиции')}
            >
              <span className="tab-marker-dot" style={{ background: marker.color }} />
              <span className="tab-marker-time" style={{ color: marker.color }}>
                {fmt(marker.time)}
              </span>
              <span className="tab-marker-title">{marker.title}</span>
              {marker.comment && marker.comment !== marker.title && (
                <span className="tab-marker-comment">{marker.comment}</span>
              )}
              <span className="tab-marker-user">— {marker.user}</span>
              {canEdit && (
                <button
                  className="tab-marker-delete"
                  title={t('Удалить метку')}
                  onClick={e => { e.stopPropagation(); onDelete(marker.id); }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TabMarkersPanel;
