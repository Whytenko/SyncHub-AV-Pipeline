import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../assets/logo.svg';
import { useAuth } from '../../context/AuthContext';
import { useHint } from '../../context/HintContext';

// Импорт иконок
import HomeIcon from '../assets/icons/home.svg';
import MembersIcon from '../assets/icons/members.svg';
import SettingsIcon from '../assets/icons/options.svg';
import ExportIcon from '../assets/icons/export.svg';
import ProfileIcon from '../assets/icons/profile.svg';
import LogoutIcon from '../assets/icons/logout.svg';
import NewProjectIcon from '../assets/icons/newproject.svg';
import ProjectsIcon from '../assets/icons/projects.svg';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  backButtonText?: string;
  backButtonPath?: string;
  backButtonIcon?: string; // Новое свойство
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
  backButtonIcon, // Новое свойство
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
  const displayName = username || auth.user?.nickname || 'Пользователь';
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
      return;
    }

    const primaryNavHeight = isCollapsibleMobileNav
      ? (isMobileNavOpen ? '136px' : '46px')
      : '102px';
    const contentOffset = isCollapsibleMobileNav
      ? (isMobileNavOpen ? '154px' : '84px')
      : '112px';
    document.documentElement.style.setProperty('--mobile-primary-nav-height', primaryNavHeight);
    document.documentElement.style.setProperty('--mobile-primary-nav-content-offset', contentOffset);
  }, [isCollapsibleMobileNav, isMobileLayout, isMobileNavOpen]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--mobile-primary-nav-height');
      document.documentElement.style.removeProperty('--mobile-primary-nav-content-offset');
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

  const handleLogoutClick = () => {
    if (onLogoutClick) {
      onLogoutClick();
      return;
    }
    auth.logout().finally(() => navigate('/'));
  };

  if (isMobileLayout) {
    return (
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
            aria-label={isMobileNavOpen ? 'Свернуть нижнюю панель' : 'Развернуть нижнюю панель'}
            title={isMobileNavOpen ? 'Свернуть' : 'Развернуть'}
          >
            {isMobileNavOpen ? '↓' : '↑'}
          </button>
        )}
        <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
          <button
            className={`mobile-nav-btn ${isSettingsActive ? 'active' : ''}`}
            onClick={onSettingsClick || (() => navigate('/settings'))}
            title="Настройки"
            style={navAccentStyle('#34d399')}
          >
            <img src={SettingsIcon} alt="Настройки" />
            <span>Настройки</span>
          </button>
          <button
            className={`mobile-nav-btn ${isProjectsActive ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
            title="Проекты"
            style={navAccentStyle('#3b82f6')}
          >
            <img src={ProjectsIcon} alt="Проекты" />
            <span>Проекты</span>
          </button>
          <button
            className={`mobile-nav-btn ${isHomeActive ? 'active' : ''}`}
            onClick={() => navigate('/home')}
            title="Домой"
            style={navAccentStyle('#f59e0b')}
          >
            <img src={HomeIcon} alt="Домой" />
            <span>Домой</span>
          </button>
          <button
            className={`mobile-nav-btn ${isCreateActive ? 'active' : ''}`}
            onClick={() => navigate('/dashboard?create=1')}
            title="Создать"
            style={navAccentStyle('#ff391a')}
          >
            <img src={NewProjectIcon} alt="Создать" />
            <span>Создать</span>
          </button>
          <button
            className={`mobile-nav-btn ${isProfileActive ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
            title="Профиль"
            style={navAccentStyle('#22d3ee')}
          >
            <img src={ProfileIcon} alt="Профиль" />
            <span>Профиль</span>
          </button>
        </nav>
      </div>
    );
  }

  return (
    <header className="sync-hub-header">
      <div className="header-left">
        {showLogo && (
          <div className="header-logo" onClick={() => navigate('/home')}>
            <img src={logo} alt="SyncHub" className="logo-image" />
          </div>
        )}

        {showBackButton && (
          <button className="header-btn back-btn" onClick={handleBackClick} title={backButtonText}>
            {backButtonIcon ? (
              <img src={backButtonIcon} alt={backButtonText} className="back-icon" />
            ) : (
              <span className="back-arrow">←</span>
            )}
          </button>
        )}

        {showHomeButton && (
          <button className="header-btn home-btn" onClick={handleHomeClick} title="Главная">
            <img src={HomeIcon} alt="Главная" className="home-icon" />
          </button>
        )}
      </div>

      <div className="header-center">
        {title && <h1 className="header-title">{title}</h1>}
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      <div className="header-right">
        <div className="header-hint">{hint || 'Подсказка: наведите на элемент'}</div>
        {teamCount > 0 && (
          <button className="header-btn team-btn" title="Участники команды">
            <img src={MembersIcon} alt="Участники" className="team-icon" />
            <span>{teamCount}</span>
          </button>
        )}

        {showSettingsButton && (
          <button
            className="header-btn settings-btn"
            onClick={onSettingsClick || (() => navigate('/settings'))}
            title="Настройки"
          >
            <img src={SettingsIcon} alt="Настройки" className="settings-icon" />
          </button>
        )}

        {showExportButton && (
          <button
            className="header-btn export-btn"
            onClick={onExportClick}
            title="Экспорт проекта"
          >
            <img src={ExportIcon} alt="Экспорт" className="export-icon" />
            <span>Экспорт</span>
          </button>
        )}

        {showUserInfo && (
          <button
            className="profile-btn"
            onClick={() => navigate('/profile')}
            title="Профиль"
          >
            <span className="user-avatar">
              <img src={ProfileIcon} alt="Профиль" className="profile-icon" />
            </span>
            <span className="user-name">{displayName}</span>
          </button>
        )}

        {showLogoutButton && (
          <button
            className="header-btn logout-btn"
            onClick={handleLogoutClick}
            title="Выйти из системы"
          >
            <img src={LogoutIcon} alt="Выйти" className="logout-icon" />
            <span>Выйти</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
