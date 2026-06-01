import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Scene, StoryboardFrame } from '../../../types';
import { resolveAssetUrl } from '../../../api/assets';

export interface FramePair {
  sceneId: string;
  sceneNumber: number;
  sceneTitle: string;
  frameIdx: number;
  frame: StoryboardFrame;
}

interface FramePairViewerProps {
  scenes: Scene[];
  initial: { sceneId: string; frameIdx: number };
  onClose: () => void;
  t: (k: string) => string;
}

const FramePairViewer: React.FC<FramePairViewerProps> = ({ scenes, initial, onClose, t }) => {
  // Build a flat ordered list of all pairs (one per frame in storyboard)
  const pairs = useMemo<FramePair[]>(() => {
    const list: FramePair[] = [];
    const sorted = [...scenes].sort((a, b) => a.number - b.number);
    for (const s of sorted) {
      const count = s.storyboardFrameCount || 0;
      const frames = s.frames || [];
      for (let i = 0; i < count; i++) {
        const fr = frames[i];
        if (!fr) continue;
        list.push({
          sceneId: s.id,
          sceneNumber: s.number,
          sceneTitle: s.title,
          frameIdx: i,
          frame: fr
        });
      }
    }
    return list;
  }, [scenes]);

  const startIdx = Math.max(0, pairs.findIndex(p => p.sceneId === initial.sceneId && p.frameIdx === initial.frameIdx));
  const [idx, setIdx] = useState(startIdx);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(pairs.length - 1, i + 1));

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  if (pairs.length === 0) return null;
  const pair = pairs[idx];
  const sb   = pair.frame.imageUrl ? resolveAssetUrl(pair.frame.imageUrl) : '';
  const shot = pair.frame.editorShotUrl ? resolveAssetUrl(pair.frame.editorShotUrl) : '';

  return createPortal(
    <div className="pair-viewer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pair-viewer" onMouseDown={e => e.stopPropagation()}>
        <div className="pair-viewer-head">
          <div className="pair-viewer-head-info">
            <div className="pair-viewer-title">
              Сц. {pair.sceneNumber} · {t('Кадр')} {pair.frameIdx + 1}
            </div>
            <div className="pair-viewer-subtitle">{pair.sceneTitle}</div>
          </div>
          <div className="pair-viewer-counter">{idx + 1} / {pairs.length}</div>
          <button className="pair-viewer-close" onClick={onClose} aria-label={t('Закрыть')}>
            <X size={18} />
          </button>
        </div>

        <div className="pair-viewer-body">
          <div className="pair-viewer-pane">
            <div className="pair-viewer-pane-label">{t('Раскадровка')}</div>
            <div className="pair-viewer-image">
              {sb
                ? <img src={sb} alt="" />
                : <div className="pair-viewer-empty">{t('Нет изображения раскадровки')}</div>
              }
            </div>
            {(pair.frame.shotType || pair.frame.description || pair.frame.duration) && (
              <div className="pair-viewer-meta">
                {pair.frame.shotType && <span className="pair-viewer-chip">{pair.frame.shotType}</span>}
                {pair.frame.duration ? <span className="pair-viewer-chip">{pair.frame.duration}с</span> : null}
                {pair.frame.description && <p className="pair-viewer-desc">{pair.frame.description}</p>}
              </div>
            )}
          </div>

          <div className="pair-viewer-pane">
            <div className="pair-viewer-pane-label pair-viewer-pane-label--shot">{t('Финальный шот')}</div>
            <div className="pair-viewer-image">
              {shot
                ? <img src={shot} alt="" />
                : <div className="pair-viewer-empty">{t('Монтажёр ещё не загрузил шот')}</div>
              }
            </div>
            {pair.frame.editorNote && (
              <div className="pair-viewer-meta">
                <p className="pair-viewer-desc">{pair.frame.editorNote}</p>
              </div>
            )}
          </div>
        </div>

        <div className="pair-viewer-nav">
          <button className="pair-viewer-nav-btn" onClick={prev} disabled={idx === 0} aria-label={t('Предыдущая пара')}>
            <ChevronLeft size={16} /> {t('Назад')}
          </button>
          <div className="pair-viewer-nav-hint">← → {t('или свайп')}</div>
          <button className="pair-viewer-nav-btn" onClick={next} disabled={idx === pairs.length - 1} aria-label={t('Следующая пара')}>
            {t('Вперёд')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FramePairViewer;
