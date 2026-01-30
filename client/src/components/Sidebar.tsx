import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Sidebar.css'
import { useAuth } from '../context/AuthContext'

import ProjectsIcon from '../pages/assets/icons/projects.svg'
import OptionsIcon from '../pages/assets/icons/options.svg'
import HelpIcon from '../pages/assets/icons/help.svg'
import ProfileIcon from '../pages/assets/icons/profile.svg'
import logo from '../pages/assets/logo.svg'

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const items = [
    { id: 'projects', title: 'Проекты', path: '/dashboard', icon: ProjectsIcon },
    { id: 'settings', title: 'Настройки', path: '/settings', icon: OptionsIcon },
    { id: 'help', title: 'Помощь', path: '/help', icon: HelpIcon }
  ]

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand" onClick={() => navigate('/home')}>
        <img src={logo} alt="SyncHub" />
      </div>
      <div className="sidebar-title">Навигация</div>
      <button className="sidebar-btn sidebar-cta" onClick={() => navigate('/dashboard')}>
        <span className="sidebar-icon">+</span>
        <span>Создать</span>
      </button>
      {items.map((item) => (
        <button
          key={item.id}
          className="sidebar-btn"
          onClick={() => navigate(item.path)}
        >
          <span className="sidebar-icon">
            <img src={item.icon} alt={item.title} />
          </span>
          <span>{item.title}</span>
        </button>
      ))}
      <div className="sidebar-profile" ref={menuRef}>
        {open && (
          <div className="sidebar-menu">
            <button
              className="sidebar-menu-btn"
              onClick={() => {
                setOpen(false)
                navigate('/profile')
              }}
            >
              Профиль
            </button>
            <button
              className="sidebar-menu-btn"
              onClick={() => {
                setOpen(false)
                logout().finally(() => navigate('/login'))
              }}
            >
              Выйти
            </button>
          </div>
        )}
        <button className="sidebar-btn sidebar-bottom" onClick={() => setOpen((prev) => !prev)}>
          <span className="sidebar-icon">
            <img src={ProfileIcon} alt="Профиль" />
          </span>
          <span>Профиль</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
