import React, { useEffect, useState } from 'react';
import Header from '../Header/Header';
import './Settings.css';
import { useToast } from '../../context/ToastContext';
import { useI18n, type AppLanguage } from '../../context/I18nContext';

interface Preferences {
  notifications: boolean;
  autosave: boolean;
}

const defaultPrefs: Preferences = {
  notifications: true,
  autosave: true
};

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('synchub_prefs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Preferences>;
        setPrefs({
          notifications: parsed.notifications ?? defaultPrefs.notifications,
          autosave: parsed.autosave ?? defaultPrefs.autosave
        });
      } catch {
        setPrefs(defaultPrefs);
      }
    }
  }, []);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('synchub_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const updatePrefs = (next: Partial<Preferences>) => {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    localStorage.setItem('synchub_prefs', JSON.stringify(updated));
  };

  const clearPrefs = () => {
    localStorage.removeItem('synchub_prefs');
    setPrefs(defaultPrefs);
    showToast(t('Локальные настройки очищены'), 'success');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('synchub_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    showToast(`${t('Светлая тема')}: ${next === 'dark' ? t('Тёмная') : t('Светлая')}`, 'success');
  };

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
  };

  return (
    <div className="settings-page">
      <Header
        title={t('Настройки')}
        showBackButton={true}
        backButtonText={t('Назад')}
        backButtonPath="/home"
        showHomeButton={true}
        showUserInfo={false}
        showLogoutButton={false}
      />

      <main className="settings-main">
        <section className="settings-shell">
          <div className="settings-section">
            <div className="settings-section-title">{t('Персональные предпочтения')}</div>

            <div className="settings-row">
              <div className="settings-row-main">
                <div className="settings-row-label">{t('Светлая тема')}</div>
              </div>
              <button
                type="button"
                className={`settings-switch ${theme === 'light' ? 'active' : ''}`}
                onClick={toggleTheme}
                role="switch"
                aria-checked={theme === 'light'}
                aria-label={t('Светлая тема')}
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-main">
                <div className="settings-row-label">{t('Уведомления о событиях')}</div>
              </div>
              <button
                type="button"
                className={`settings-switch ${prefs.notifications ? 'active' : ''}`}
                onClick={() => updatePrefs({ notifications: !prefs.notifications })}
                role="switch"
                aria-checked={prefs.notifications}
                aria-label={t('Уведомления о событиях')}
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-main">
                <div className="settings-row-label">{t('Автосохранение изменений')}</div>
              </div>
              <button
                type="button"
                className={`settings-switch ${prefs.autosave ? 'active' : ''}`}
                onClick={() => updatePrefs({ autosave: !prefs.autosave })}
                role="switch"
                aria-checked={prefs.autosave}
                aria-label={t('Автосохранение изменений')}
              >
                <span className="settings-switch-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-main">
                <div className="settings-row-label">{t('Язык интерфейса')}</div>
              </div>
              <div className="settings-language-wrap">
                <select
                  className="settings-language-select"
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as AppLanguage)}
                >
                  <option value="ru">{t('Русский')}</option>
                  <option value="zh">{t('Китайский')}</option>
                  <option value="en">{t('Английский')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">{t('Системная информация')}</div>
            <div className="settings-row settings-info-row">
              <div className="settings-row-main">
                <div className="settings-row-label">{t('API URL')}</div>
                <div className="settings-row-value">{import.meta.env.VITE_API_URL || 'http://localhost:5000'}</div>
              </div>
            </div>
            <div className="settings-row settings-info-row">
              <div className="settings-row-main">
                <div className="settings-row-label">{t('Версия клиента')}</div>
                <div className="settings-row-value">0.1.0</div>
              </div>
            </div>

            <button className="secondary-btn settings-clear-btn" onClick={clearPrefs}>
              {t('Очистить локальные настройки')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
