import React, { useEffect, useState } from 'react';
import Header from '../Header/Header';
import './Settings.css';
import { useToast } from '../../context/ToastContext';

interface Preferences {
  notifications: boolean;
  autosave: boolean;
  compactMode: boolean;
}

const defaultPrefs: Preferences = {
  notifications: true,
  autosave: true,
  compactMode: false
};

const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);

  useEffect(() => {
    const saved = localStorage.getItem('synchub_prefs');
    if (saved) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(saved) });
      } catch {
        setPrefs(defaultPrefs);
      }
    }
  }, []);

  const updatePrefs = (next: Partial<Preferences>) => {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    localStorage.setItem('synchub_prefs', JSON.stringify(updated));
  };

  const clearPrefs = () => {
    localStorage.removeItem('synchub_prefs');
    setPrefs(defaultPrefs);
    showToast('Локальные настройки очищены', 'success');
  };

  return (
    <div className="settings-page">
      <Header
        title="Настройки"
        showBackButton={true}
        backButtonText="Назад"
        backButtonPath="/home"
        showHomeButton={true}
        showUserInfo={true}
        showLogoutButton={true}
      />

      <main className="settings-main">
        <div className="settings-card">
          <h2>Персональные предпочтения</h2>
          <div className="settings-list">
            <label className="settings-item">
              <span>Уведомления о событиях</span>
              <input
                type="checkbox"
                checked={prefs.notifications}
                onChange={(e) => updatePrefs({ notifications: e.target.checked })}
              />
            </label>
            <label className="settings-item">
              <span>Автосохранение изменений</span>
              <input
                type="checkbox"
                checked={prefs.autosave}
                onChange={(e) => updatePrefs({ autosave: e.target.checked })}
              />
            </label>
            <label className="settings-item">
              <span>Компактный режим карточек</span>
              <input
                type="checkbox"
                checked={prefs.compactMode}
                onChange={(e) => updatePrefs({ compactMode: e.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h2>Системная информация</h2>
          <div className="settings-meta">
            <div>
              <span className="meta-label">API URL</span>
              <span className="meta-value">{import.meta.env.VITE_API_URL || 'http://localhost:5000'}</span>
            </div>
            <div>
              <span className="meta-label">Версия клиента</span>
              <span className="meta-value">0.1.0</span>
            </div>
          </div>
          <button className="secondary-btn" onClick={clearPrefs}>
            Очистить локальные настройки
          </button>
        </div>
      </main>
    </div>
  );
};

export default Settings;
