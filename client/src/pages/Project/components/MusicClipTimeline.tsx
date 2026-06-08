import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Plus, X, Music, MonitorPlay } from 'lucide-react';
import type { Scene, ClipFrame, MediaFile } from '../../../types';
import { resolveAssetUrl } from '../../../api/assets';

const DEFAULT_FRAME_DURATION = 2; // sec when frame.duration not set
const PIXELS_PER_SEC = 24;

// ── A single slide in the playback show ──
interface Slide {
  time: number;
  imageUrl?: string;
  sceneNumber: number;
  frameIdx: number;
  shotType?: string;
  description?: string;
}

const fmtShow = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Fullscreen slideshow: plays the audio track and switches the displayed
 * storyboard frame to whichever clip-frame's start time has been reached.
 */
const MusicSlideshow: React.FC<{
  t: (key: string) => string;
  audioSrc: string;
  trackName: string;
  slides: Slide[];
  onClose: () => void;
}> = ({ t, audioSrc, trackName, slides, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Active slide = last slide whose start time has been reached
  const activeIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].time <= currentTime + 0.001) idx = i; else break;
    }
    return idx;
  }, [slides, currentTime]);
  const active = activeIdx >= 0 ? slides[activeIdx] : null;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    // autoplay from the start
    el.currentTime = 0;
    el.play().catch(() => {});
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [audioSrc]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {}); else el.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration));
  };

  // Keyboard: Space toggles, Esc closes + lock body scroll while open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return createPortal(
    <div
      className="music-show-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="music-show-modal" onMouseDown={(e) => e.stopPropagation()}>
        <audio ref={audioRef} src={audioSrc} preload="auto" />

        <div className="music-show-header">
          <h3>
            <MonitorPlay size={15} style={{ color: '#06b6d4' }} />
            {t('Раскадровка под музыку')}
            <span className="music-show-header-track">— {trackName}</span>
          </h3>
          <button className="modal-close" onClick={onClose} aria-label={t('Закрыть')}>×</button>
        </div>

        <div className="music-show-stage" onClick={toggle}>
          {active ? (
            <div className="music-show-frame" key={activeIdx}>
              {active.imageUrl
                ? <img src={resolveAssetUrl(active.imageUrl)} alt="" className="music-show-img" />
                : <div className="music-show-img music-show-img--empty"><Music size={56} opacity={0.25} /></div>
              }
              <div className="music-show-caption">
                <span className="music-show-caption-num">Сц.{active.sceneNumber} · кадр {active.frameIdx + 1}</span>
                {active.shotType && <span className="music-show-caption-type">{active.shotType}</span>}
                {active.description && <span className="music-show-caption-desc">{active.description}</span>}
              </div>
            </div>
          ) : (
            <div className="music-show-intro">
              <MonitorPlay size={48} opacity={0.4} />
              <div className="music-show-intro-title">{trackName}</div>
              <div className="music-show-intro-sub">{t('Нажмите, чтобы воспроизвести')}</div>
            </div>
          )}
        </div>

        <div className="music-show-controls">
          <button className="music-show-play" onClick={toggle}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <span className="music-show-time">{fmtShow(currentTime)}</span>
          <div className="music-show-progress" onClick={seek}>
            <div className="music-show-progress-fill" style={{ width: `${progress}%` }} />
            {slides.map((sl, i) => (
              <span
                key={i}
                className="music-show-progress-marker"
                style={{ left: `${duration ? (sl.time / duration) * 100 : 0}%` }}
              />
            ))}
          </div>
          <span className="music-show-time">{fmtShow(duration)}</span>
          <span className="music-show-counter">
            {activeIdx >= 0 ? activeIdx + 1 : 0} / {slides.length}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface MusicClipTimelineProps {
  t: (key: string) => string;
  scenes: Scene[];
  audioFile: MediaFile;
  apiBase: string;
  timeline: ClipFrame[];
  onSave: (next: ClipFrame[]) => Promise<void>;
  canEdit: boolean;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const MusicClipTimeline: React.FC<MusicClipTimelineProps> = ({
  t, scenes, audioFile, apiBase, timeline, onSave, canEdit
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [picker, setPicker] = useState<{ open: boolean; insertAt: number } | null>(null);
  const [showShow, setShowShow] = useState(false);

  // Audio URL: prefer mediaFile.url, prepend apiBase if relative
  const audioSrc = useMemo(() => {
    if (!audioFile.url) return '';
    if (/^https?:/.test(audioFile.url)) return audioFile.url;
    return apiBase.replace(/\/$/, '') + audioFile.url;
  }, [audioFile.url, apiBase]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) { el.pause(); setIsPlaying(false); }
    else { el.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const seekTo = (sec: number) => {
    const el = audioRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(duration || sec, sec));
    el.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Resolve a placed clip-frame to its actual storyboard frame for preview
  const resolveFrame = (cf: ClipFrame) => {
    const scene = scenes.find(s => s.id === cf.sceneId);
    if (!scene) return null;
    const frame = (scene.frames ?? [])[cf.frameIdx];
    if (!frame) return null;
    return { scene, frame };
  };

  const getFrameDuration = (cf: ClipFrame) => {
    const resolved = resolveFrame(cf);
    return resolved?.frame.duration && resolved.frame.duration > 0
      ? resolved.frame.duration
      : DEFAULT_FRAME_DURATION;
  };

  // Sorted timeline by start time
  const sortedTimeline = useMemo(
    () => [...timeline].sort((a, b) => a.time - b.time),
    [timeline]
  );

  // Slides for the fullscreen show — resolved frames in playback order
  const showSlides = useMemo<Slide[]>(() => {
    return sortedTimeline
      .map(cf => {
        const resolved = resolveFrame(cf);
        if (!resolved) return null;
        return {
          time: cf.time,
          imageUrl: resolved.frame.imageUrl,
          sceneNumber: resolved.scene.number,
          frameIdx: cf.frameIdx,
          shotType: resolved.frame.shotType,
          description: resolved.frame.description,
        } as Slide;
      })
      .filter((s): s is Slide => s !== null);
  }, [sortedTimeline, scenes]);

  const handleAddFrameHere = () => {
    if (!canEdit) return;
    setPicker({ open: true, insertAt: currentTime });
  };

  const handlePickFrame = async (sceneId: string, frameIdx: number) => {
    if (!picker) return;
    const newClipFrame: ClipFrame = {
      id: `clip_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sceneId,
      frameIdx,
      time: Math.round(picker.insertAt * 100) / 100
    };
    await onSave([...timeline, newClipFrame]);
    setPicker(null);
  };

  const handleRemove = async (id: string) => {
    if (!canEdit) return;
    await onSave(timeline.filter(cf => cf.id !== id));
  };

  const handleShift = async (id: string, deltaSec: number) => {
    if (!canEdit) return;
    await onSave(timeline.map(cf =>
      cf.id === id ? { ...cf, time: Math.max(0, Math.round((cf.time + deltaSec) * 100) / 100) } : cf
    ));
  };

  // Picker — flat list of all frames that have an image or content
  const allFrames = useMemo(() => {
    const list: Array<{ sceneId: string; sceneNumber: number; sceneTitle: string; frameIdx: number; imageUrl?: string; shotType?: string; description?: string }> = [];
    for (const s of [...scenes].sort((a, b) => a.number - b.number)) {
      const frames = s.frames ?? [];
      frames.forEach((f, i) => {
        if (f?.imageUrl || f?.shotType || f?.description) {
          list.push({
            sceneId: s.id,
            sceneNumber: s.number,
            sceneTitle: s.title,
            frameIdx: i,
            imageUrl: f.imageUrl,
            shotType: f.shotType,
            description: f.description
          });
        }
      });
    }
    return list;
  }, [scenes]);

  const trackWidth = Math.max((duration || 60) * PIXELS_PER_SEC, 600);
  const playheadLeft = currentTime * PIXELS_PER_SEC;

  // Time ruler ticks every 5 seconds
  const ticks: number[] = [];
  for (let i = 0; i <= Math.ceil(duration); i += 5) ticks.push(i);

  return (
    <div className="music-clip-timeline">
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}

      <div className="music-clip-head">
        <div className="music-clip-head-title">
          <Music size={16} style={{ color: '#06b6d4' }} />
          <span>{t('Раскадровка под музыку')}</span>
          <span className="music-clip-head-track">— {audioFile.name}</span>
        </div>
        <div className="music-clip-head-stats">
          <span className="music-clip-counter">{timeline.length} {t('кадров')}</span>
          <button
            className="music-clip-show-btn"
            onClick={() => setShowShow(true)}
            disabled={showSlides.length === 0 || !audioSrc}
            title={t('Слайд-шоу раскадровки под музыку')}
          >
            <MonitorPlay size={13} /> {t('Показать')}
          </button>
          {canEdit && (
            <button className="music-clip-add-btn" onClick={handleAddFrameHere} disabled={!duration}>
              <Plus size={12} /> {t('Добавить кадр на')} {fmtTime(currentTime)}
            </button>
          )}
        </div>
      </div>

      <div className="music-clip-controls">
        <button className="music-clip-play-btn" onClick={togglePlay} disabled={!audioSrc}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span className="music-clip-time">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
        <div className="music-clip-progress" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seekTo(((e.clientX - rect.left) / rect.width) * duration);
        }}>
          <div className="music-clip-progress-fill" style={{ width: `${(duration ? currentTime / duration : 0) * 100}%` }} />
        </div>
      </div>

      <div className="music-clip-track-wrap">
        <div className="music-clip-track" ref={trackRef} style={{ width: trackWidth }}>
          {/* Ticks */}
          <div className="music-clip-ruler">
            {ticks.map(sec => (
              <div key={sec} className="music-clip-tick" style={{ left: sec * PIXELS_PER_SEC }}>
                <div className="music-clip-tick-line" />
                <span className="music-clip-tick-label">{fmtTime(sec)}</span>
              </div>
            ))}
          </div>

          {/* Placed frames */}
          <div className="music-clip-lane">
            {sortedTimeline.map(cf => {
              const resolved = resolveFrame(cf);
              if (!resolved) return null;
              const dur = getFrameDuration(cf);
              const left = cf.time * PIXELS_PER_SEC;
              const width = Math.max(dur * PIXELS_PER_SEC, 48);
              return (
                <div
                  key={cf.id}
                  className="music-clip-block"
                  style={{ left, width }}
                  title={`Сц.${resolved.scene.number} · кадр ${cf.frameIdx + 1} · ${fmtTime(cf.time)} (${dur}с)`}
                >
                  {resolved.frame.imageUrl
                    ? <img src={resolveAssetUrl(resolved.frame.imageUrl)} alt="" className="music-clip-block-img" />
                    : <div className="music-clip-block-placeholder" />
                  }
                  <div className="music-clip-block-meta">
                    <span className="music-clip-block-num">Сц.{resolved.scene.number}·{cf.frameIdx + 1}</span>
                    {resolved.frame.shotType && <span className="music-clip-block-type">{resolved.frame.shotType}</span>}
                    <span className="music-clip-block-time">{fmtTime(cf.time)}</span>
                  </div>
                  {canEdit && (
                    <div className="music-clip-block-actions">
                      <button onClick={() => handleShift(cf.id, -0.5)} title={t('Сдвинуть назад 0.5с')}>‹</button>
                      <button onClick={() => handleShift(cf.id, 0.5)}  title={t('Сдвинуть вперёд 0.5с')}>›</button>
                      <button onClick={() => handleRemove(cf.id)} title={t('Убрать кадр')}><X size={11} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div className="music-clip-playhead" style={{ left: playheadLeft }}>
            <div className="music-clip-playhead-line" />
            <div className="music-clip-playhead-head" />
          </div>
        </div>
      </div>

      {/* Frame picker modal */}
      {picker?.open && (
        <div className="music-clip-picker-overlay" onClick={() => setPicker(null)}>
          <div className="music-clip-picker" onClick={e => e.stopPropagation()}>
            <div className="music-clip-picker-head">
              <div>
                <div className="music-clip-picker-title">{t('Выберите кадр из раскадровки')}</div>
                <div className="music-clip-picker-sub">{t('Поставить на')} {fmtTime(picker.insertAt)}</div>
              </div>
              <button className="music-clip-picker-close" onClick={() => setPicker(null)} title={t('Закрыть')}>
                <X size={16} />
              </button>
            </div>

            {allFrames.length === 0 ? (
              <div className="music-clip-picker-empty">
                {t('Нет заполненных кадров. Создайте раскадровку в блоке выше.')}
              </div>
            ) : (
              <div className="music-clip-picker-grid">
                {allFrames.map(item => (
                  <button
                    key={`${item.sceneId}_${item.frameIdx}`}
                    type="button"
                    className="music-clip-picker-item"
                    onClick={() => handlePickFrame(item.sceneId, item.frameIdx)}
                  >
                    {item.imageUrl
                      ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="music-clip-picker-item-img" />
                      : <div className="music-clip-picker-item-placeholder" />
                    }
                    <div className="music-clip-picker-item-meta">
                      <span className="music-clip-picker-item-num">Сц.{item.sceneNumber}·{item.frameIdx + 1}</span>
                      {item.shotType && <span className="music-clip-picker-item-type">{item.shotType}</span>}
                    </div>
                    {item.description && (
                      <div className="music-clip-picker-item-desc">{item.description.slice(0, 60)}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen slideshow under music */}
      {showShow && (
        <MusicSlideshow
          t={t}
          audioSrc={audioSrc}
          trackName={audioFile.name}
          slides={showSlides}
          onClose={() => setShowShow(false)}
        />
      )}
    </div>
  );
};

export default MusicClipTimeline;
