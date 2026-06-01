import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, caption, onClose }) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="image-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="image-lightbox-close" onClick={onClose} aria-label="Закрыть">×</button>
      <img
        src={src}
        alt={alt || ''}
        className="image-lightbox-img"
        onClick={e => e.stopPropagation()}
      />
      {caption && <div className="image-lightbox-caption">{caption}</div>}
    </div>,
    document.body
  );
};

export default ImageLightbox;
