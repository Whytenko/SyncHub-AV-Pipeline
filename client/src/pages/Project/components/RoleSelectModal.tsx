import React, { useState } from 'react';
import { ScrollText, Clapperboard, Shirt, Sparkles, Zap, Music, ClipboardList, type LucideIcon } from 'lucide-react';
import { PROJECT_ROLES, type ProjectRole } from '../../../types';

interface RoleSelectModalProps {
  t: (key: string) => string;
  projectName: string;
  isOpen: boolean;
  onSelect: (role: ProjectRole) => Promise<void>;
}

const ROLE_META: Record<ProjectRole, { Icon: LucideIcon; color: string; desc: string }> = {
  'Сценарист':      { Icon: ScrollText,    color: '#9C27B0', desc: 'Создаёт сцены, персонажей, параметры производства' },
  'Режиссёр':       { Icon: Clapperboard,  color: '#2196F3', desc: 'Раскадровка по сценам, тип планов, заметки' },
  'Костюмер':       { Icon: Shirt,         color: '#FF9800', desc: 'Образы персонажей, гардероб, бюджет костюмов' },
  'Визажист':       { Icon: Sparkles,      color: '#E91E63', desc: 'Грим-карты по персонажам и сценам' },
  'Монтажёр':       { Icon: Zap,           color: '#FF391A', desc: 'Медиатека, монтаж, документы' },
  'Звукорежиссёр':  { Icon: Music,         color: '#06b6d4', desc: 'Звуковые метки на таймлайне' },
  'Менеджер':       { Icon: ClipboardList, color: '#22c55e', desc: 'Задачи, съёмочный календарь, контроль фаз' },
};

const RoleSelectModal: React.FC<RoleSelectModalProps> = ({ t, projectName, isOpen, onSelect }) => {
  const [picked, setPicked] = useState<ProjectRole | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await onSelect(picked);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="role-select-overlay" role="dialog" aria-modal="true">
      <div className="role-select-modal">
        <div className="role-select-head">
          <div className="role-select-title">{t('Выберите вашу роль в проекте')}</div>
          <div className="role-select-subtitle">
            {t('Проект')}: <strong>{projectName}</strong> · {t('Выбор сохранится навсегда — обратитесь к владельцу, чтобы изменить')}
          </div>
        </div>

        <div className="role-select-grid">
          {PROJECT_ROLES.map(role => {
            const meta = ROLE_META[role];
            const Icon = meta.Icon;
            const isPicked = picked === role;
            return (
              <button
                key={role}
                type="button"
                className={`role-select-card${isPicked ? ' role-select-card--picked' : ''}`}
                onClick={() => setPicked(role)}
                style={{ ['--role-color' as const]: meta.color } as React.CSSProperties}
              >
                <Icon size={20} className="role-select-card-icon" style={{ color: meta.color }} />
                <div className="role-select-card-name">{role}</div>
                <div className="role-select-card-desc">{meta.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="role-select-footer">
          <button
            className="primary-btn"
            onClick={handleConfirm}
            disabled={!picked || busy}
          >
            {busy ? t('Сохранение...') : picked ? `${t('Войти как')} ${picked}` : t('Выберите роль')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectModal;
