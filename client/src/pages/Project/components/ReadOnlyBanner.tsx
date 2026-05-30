import React from 'react';
import { Lock } from 'lucide-react';

interface ReadOnlyBannerProps {
  t: (key: string) => string;
  role?: string;
}

const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ t, role }) => (
  <div className="readonly-banner">
    <Lock size={14} />
    <span>
      {t('Только просмотр')}
      {role ? ` — ${t('ваш отдел')}: ${role}` : ''}
    </span>
  </div>
);

export default ReadOnlyBanner;
