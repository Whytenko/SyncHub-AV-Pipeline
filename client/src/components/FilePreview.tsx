import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { resolveAssetUrl } from '../api/assets';

export interface PreviewableFile {
  name: string;
  type?: string;          // ext like 'pdf', 'docx', 'txt' or mime
  size?: string;
  url?: string;           // /uploads/... or http(s)://...
  dataUrl?: string;       // data:... (preferred when present)
}

interface FilePreviewProps {
  file: PreviewableFile;
  onClose: () => void;
}

const detectType = (file: PreviewableFile): { kind: 'pdf' | 'image' | 'text' | 'office' | 'other'; ext: string } => {
  const ext = (file.type || file.name.split('.').pop() || '').toLowerCase().replace(/^application\/|^image\/|^text\//, '');
  if (ext.includes('pdf'))                               return { kind: 'pdf',    ext };
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return { kind: 'image',  ext };
  if (['txt','md','log','json','csv'].includes(ext))     return { kind: 'text',   ext };
  if (['doc','docx','xls','xlsx','ppt','pptx','odt','rtf'].includes(ext)) return { kind: 'office', ext };
  return { kind: 'other', ext: ext || 'file' };
};

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const src   = file.dataUrl || resolveAssetUrl(file.url);
  const info  = detectType(file);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    if (info.kind !== 'text' || !src) return;
    setLoadingText(true);
    fetch(src)
      .then(r => r.text())
      .then(t => setTextContent(t))
      .catch(() => setTextContent('Не удалось загрузить файл.'))
      .finally(() => setLoadingText(false));
  }, [info.kind, src]);

  return createPortal(
    <div className="file-preview-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="file-preview-window" onMouseDown={e => e.stopPropagation()}>
        <div className="file-preview-head">
          <div className="file-preview-meta">
            <div className="file-preview-name" title={file.name}>{file.name}</div>
            <div className="file-preview-sub">
              {info.ext.toUpperCase()}{file.size ? ` · ${file.size}` : ''}
            </div>
          </div>
          {src && (
            <a className="file-preview-download" href={src} download={file.name}>
              Скачать
            </a>
          )}
          <button className="file-preview-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <div className="file-preview-body">
          {!src ? (
            <div className="file-preview-fallback">URL файла недоступен.</div>
          ) : info.kind === 'pdf' ? (
            <iframe src={src} className="file-preview-frame" title={file.name} />
          ) : info.kind === 'image' ? (
            <img src={src} alt={file.name} className="file-preview-image" />
          ) : info.kind === 'text' ? (
            loadingText
              ? <div className="file-preview-fallback">Загрузка...</div>
              : <pre className="file-preview-text">{textContent}</pre>
          ) : info.kind === 'office' ? (
            // Office Online viewer — работает только с публичными URL,
            // поэтому показываем понятный fallback.
            <div className="file-preview-fallback">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                Предпросмотр в браузере не поддерживается для {info.ext.toUpperCase()}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
                Нажмите «Скачать», чтобы открыть файл в Word / Excel / Pages.
              </div>
            </div>
          ) : (
            <div className="file-preview-fallback">
              Этот формат нельзя посмотреть в браузере. Используйте «Скачать».
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FilePreview;
