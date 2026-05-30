import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../assets/logo.svg';
import { useAuth } from '../../context/AuthContext';
import { useHint } from '../../context/HintContext';
import { useI18n } from '../../context/I18nContext';
import {
  Home, Users, Settings2, Download, User, LogOut,
  FolderPlus, LayoutDashboard, ArrowLeft, ChevronUp, ChevronDown,
  type LucideIcon
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  backButtonText?: string;
  backButtonPath?: string;
  backButtonIcon?: LucideIcon;
  showHomeButton?: boolean;
  showUserInfo?: boolean;
  showExportButton?: boolean;
  showSettingsButton?: boolean;
  showLogoutButton?: boolean;
  username?: string;
  teamCount?: number;
  onExportClick?: () => void;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
}

const navAccentStyle = (color: string) =>
  ({ ['--nav-accent' as const]: color } as React.CSSProperties);

const Header: React.FC<HeaderProps> = ({
  title = '',
  subtitle,
  showBackButton = false,
  backButtonText = 'Назад',
  backButtonPath = '/dashboard',
  backButtonIcon: BackIcon,
  showHomeButton = false,
  showUserInfo = true,
  showExportButton = false,
  showSettingsButton = false,
  showLogoutButton = true,
  showLogo = false,
  username,
  teamCount = 0,
  onExportClick,
  onSettingsClick,
  onLogoutClick
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { hint } = useHint();
  const { t } = useI18n();
  const displayName = username || auth.user?.nickname || t('Пользователь');
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('synchub-header-collapsed') === '1'
  );
  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('synchub-header-collapsed', next ? '1' : '0');
      document.documentElement.style.setProperty('--header-height', next ? '32px' : '80px');
      return next;
    });
  };
  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', collapsed ? '32px' : '80px');
    return () => { document.documentElement.style.removeProperty('--header-height'); };
  }, [collapsed]);
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 992px)').matches;
  });
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const isProjectPage = location.pathname.startsWith('/project');
  const isCollapsibleMobileNav = isProjectPage;
  const isMobileNavOpen = isCollapsibleMobileNav ? mobileNavExpanded : true;
  const isCreateActive = location.pathname === '/dashboard' && location.search.includes('create=1');
  const isHomeActive = location.pathname === '/home';
  const isSettingsActive = location.pathname === '/settings';
  const isProjectsActive =
    (location.pathname === '/dashboard' && !location.search.includes('create=1')) ||
    location.pathname.startsWith('/project');
  const isProfileActive = location.pathname === '/profile';
  const shouldShowCompactMobileHeader =
    location.pathname === '/home' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/settings' ||
    location.pathname === '/profile';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 992px)');
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches);

    updateLayout();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateLayout);
      return () => mediaQuery.removeEventListener('change', updateLayout);
    }

    mediaQuery.addListener(updateLayout);
    return () => mediaQuery.removeListener(updateLayout);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      document.documentElement.style.removeProperty('--mobile-primary-nav-height');
      document.documentElement.style.removeProperty('--mobile-primary-nav-content-offset');
      document.documentElement.style.removeProperty('--mobile-compact-header-height');
      document.documentElement.style.removeProperty('--mobile-compact-header-content-offset');
      return;
    }

    const primaryNavHeight = isCollapsibleMobileNav
      ? (isMobileNavOpen ? '136px' : '46px')
      : '102px';
    const contentOffset = isCollapsibleMobileNav
      ? (isMobileNavOpen ? '154px' : '84px')
      : '112px';
    const compactHeaderHeight = `calc(${primaryNavHeight} / 3)`;
    const compactHeaderContentOffset = `calc(${compactHeaderHeight} + env(safe-area-inset-top) + 12px)`;
    document.documentElement.style.setProperty('--mobile-primary-nav-height', primaryNavHeight);
    document.documentElement.style.setProperty('--mobile-primary-nav-content-offset', contentOffset);
    document.documentElement.style.setProperty('--mobile-compact-header-height', compactHeaderHeight);
    document.documentElement.style.setProperty('--mobile-compact-header-content-offset', compactHeaderContentOffset);
  }, [isCollapsibleMobileNav, isMobileLayout, isMobileNavOpen]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--mobile-primary-nav-height');
      document.documentElement.style.removeProperty('--mobile-primary-nav-content-offset');
      document.documentElement.style.removeProperty('--mobile-compact-header-height');
      document.documentElement.style.removeProperty('--mobile-compact-header-content-offset');
    };
  }, []);

  const handleBackClick = () => {
    if (backButtonPath) {
      navigate(backButtonPath);
    }
  };

  const handleHomeClick = () => {
    navigate('/home');
  };

  const translatedBackText = t(backButtonText);

  const handleLogoutClick = () => {
    if (onLogoutClick) {
      onLogoutClick();
      return;
    }
    auth.logout().finally(() => navigate('/'));
  };

  if (isMobileLayout) {
    return (
      <>
        {shouldShowCompactMobileHeader && (
          <header className="mobile-compact-header" aria-label={t('Главная')}>
            <div className="mobile-compact-header-row">
              <button
                className="mobile-compact-logo-btn"
                onClick={() => navigate('/home')}
                title={t('Домой')}
                aria-label={t('Главная')}
              >
                <img src={logo} alt="SyncHub" className="mobile-compact-logo" />
              </button>
            </div>
          </header>
        )}

        <div
          className={`mobile-nav-shell ${
            isCollapsibleMobileNav ? (isMobileNavOpen ? 'expanded' : 'collapsed') : 'static'
          }`}
        >
          {isCollapsibleMobileNav && (
            <button
              className="mobile-nav-toggle"
              onClick={() => setMobileNavExpanded((prev) => !prev)}
              aria-expanded={isMobileNavOpen}
              aria-label={isMobileNavOpen ? t('Свернуть нижнюю панель') : t('Развернуть нижнюю панель')}
              title={isMobileNavOpen ? t('Свернуть нижнюю панель') : t('Развернуть нижнюю панель')}
            >
              {isMobileNavOpen ? '↓' : '↑'}
            </button>
          )}
          <nav className="mobile-bottom-nav" aria-label={t('Навигация')}>
            <button
              className={`mobile-nav-btn ${isSettingsActive ? 'active' : ''}`}
              onClick={onSettingsClick || (() => navigate('/settings'))}
              title={t('Настройки')}
              style={navAccentStyle('#34d399')}
            >
              <Settings2 size={22} />
              <span>{t('Настройки')}</span>
            </button>
            <button
              className={`mobile-nav-btn ${isProjectsActive ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
              title={t('Проекты')}
              style={navAccentStyle('#3b82f6')}
            >
              <LayoutDashboard size={22} />
              <span>{t('Проекты')}</span>
            </button>
            <button
              className={`mobile-nav-btn ${isHomeActive ? 'active' : ''}`}
              onClick={() => navigate('/home')}
              title={t('Главная')}
              style={navAccentStyle('#f59e0b')}
            >
              <Home size={22} />
              <span>{t('Главная')}</span>
            </button>
            <button
              className={`mobile-nav-btn ${isCreateActive ? 'active' : ''}`}
              onClick={() => navigate('/dashboard?create=1')}
              title={t('Создать')}
              style={navAccentStyle('#ff391a')}
            >
              <FolderPlus size={22} />
              <span>{t('Создать')}</span>
            </button>
            <button
              className={`mobile-nav-btn ${isProfileActive ? 'active' : ''}`}
              onClick={() => navigate('/profile')}
              title={t('Профиль')}
              style={navAccentStyle('#22d3ee')}
            >
              <User size={22} />
              <span>{t('Профиль')}</span>
            </button>
          </nav>
        </div>
      </>
    );
  }

  return (
    <header className={`sync-hub-header${collapsed ? ' sync-hub-header--collapsed' : ''}`}>

      {/* Collapsed strip — only title + expand button */}
      {collapsed && (
        <div className="header-collapsed-strip">
          {showBackButton && (
            <button className="header-btn back-btn header-collapsed-back" onClick={handleBackClick} title={translatedBackText}>
              {BackIcon ? <BackIcon size={15} /> : <ArrowLeft size={15} />}
            </button>
          )}
          <span className="header-collapsed-title">{title}</span>
          <button className="header-collapse-btn" onClick={toggleCollapse} title={t('Развернуть')}>
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      {/* Full header content */}
      {!collapsed && (
        <>
          <div className="header-left">
            {showLogo && (
              <div className="header-logo" onClick={() => navigate('/home')}>
                <img src={logo} alt="SyncHub" className="logo-image" />
              </div>
            )}

            {showBackButton && (
              <button className="header-btn back-btn" onClick={handleBackClick} title={translatedBackText}>
                {BackIcon ? (
                  <BackIcon size={18} className="back-icon" />
                ) : (
                  <ArrowLeft size={18} className="back-icon" />
                )}
              </button>
            )}

            {showHomeButton && (
              <button className="header-btn home-btn" onClick={handleHomeClick} title={t('Главная')}>
                <Home size={18} className="home-icon" />
              </button>
            )}
          </div>

          <div className="header-center">
            {title && <h1 className="header-title">{t(title)}</h1>}
            {subtitle && <div className="header-subtitle">{t(subtitle)}</div>}
          </div>

          <div className="header-right">
            <div className="header-hint">{hint || t('Подсказка: наведите на элемент')}</div>
            {teamCount > 0 && (
              <button className="header-btn team-btn" title={t('участника')}>
                <Users size={18} className="team-icon" />
                <span>{teamCount}</span>
              </button>
            )}

            {showSettingsButton && (
              <button
                className="header-btn settings-btn"
                onClick={onSettingsClick || (() => navigate('/settings'))}
                title={t('Настройки')}
              >
                <Settings2 size={18} className="settings-icon" />
              </button>
            )}

            {showExportButton && (
              <button
                className="header-btn export-btn"
                onClick={onExportClick}
                title={t('Экспорт')}
              >
                <Download size={18} className="export-icon" />
                <span>{t('Экспорт')}</span>
              </button>
            )}

            {showUserInfo && (
              <button
                className="profile-btn"
                onClick={() => navigate('/profile')}
                title={t('Профиль')}
              >
                <span className="user-avatar">
                  <User size={16} className="profile-icon" />
                </span>
                <span className="user-name">{displayName}</span>
              </button>
            )}

            {showLogoutButton && (
              <button
                className="header-btn logout-btn"
                onClick={handleLogoutClick}
                title={t('Выйти')}
              >
                <LogOut size={18} className="logout-icon" />
                <span>{t('Выйти')}</span>
              </button>
            )}

            {/* Collapse button — always at the far right */}
            <button className="header-collapse-btn" onClick={toggleCollapse} title={t('Свернуть')}>
              <ChevronUp size={14} />
            </button>
          </div>
        </>
      )}

    </header>
  );
};

export default Header;
