import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';
import logo from '../assets/logo.svg';
import { useAuth } from '../../context/AuthContext';

// Импорт иконок
import HomeIcon from '../assets/icons/home.svg';
import MembersIcon from '../assets/icons/members.svg';
import SettingsIcon from '../assets/icons/options.svg';
import ExportIcon from '../assets/icons/export.svg';
import ProfileIcon from '../assets/icons/profile.svg';
import LogoutIcon from '../assets/icons/logout.svg';

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
  showLogo = true,
  username,
  teamCount = 0,
  onExportClick,
  onSettingsClick,
  onLogoutClick
}) => {
  const navigate = useNavigate();
  const auth = useAuth();
  const displayName = username || auth.user?.nickname || 'Пользователь';

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

  return (
    <header className="sync-hub-header">
      {/* ЛЕВАЯ ЧАСТЬ: Навигация */}
      <div className="header-left">
        {showLogo && (
          <div className="header-logo" onClick={() => navigate('/home')}>
            <img src={logo} alt="SyncHub" className="logo-image" />
          </div>
        )}
        
        {showBackButton && (
          <button className="header-btn back-btn" onClick={handleBackClick}>
            {backButtonIcon ? (
              <img src={backButtonIcon} alt="Назад" className="back-icon" />
            ) : (
              <span className="back-arrow">←</span>
            )}
            <span>{backButtonText}</span>
          </button>
        )}
        
        {showHomeButton && (
          <button className="header-btn home-btn" onClick={handleHomeClick}>
            <img src={HomeIcon} alt="Главная" className="home-icon" />
            <span>Главная</span>
          </button>
        )}
      </div>

      {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: Заголовок и информация */}
      <div className="header-center">
        {title && <h1 className="header-title">{title}</h1>}
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      {/* ПРАВАЯ ЧАСТЬ: Пользователь и действия */}
      <div className="header-right">
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
