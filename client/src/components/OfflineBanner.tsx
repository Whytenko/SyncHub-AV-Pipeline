import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import './OfflineBanner.css';

const OfflineBanner: React.FC = () => {
  const { isOffline } = useAuth();
  const { t } = useI18n();

  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-dot" aria-hidden="true" />
      <span>{t('Офлайн-режим — изменения сохраняются локально')}</span>
    </div>
  );
};

export default OfflineBanner;
