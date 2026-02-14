import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Header/Header'
import './Home.css'
import { projectsApi } from '../../api/projects'
import type { ProjectSummary } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

import logo from '../assets/logo.svg'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const { showToast } = useToast()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showGreeting, setShowGreeting] = useState(true)

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setShowGreeting(false)
    }, 5000)

    return () => window.clearTimeout(timerId)
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadProjects = async () => {
      try {
        const response = await projectsApi.list()
        if (isMounted) setProjects(response.projects)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось загрузить проекты'
        showToast(message, 'error')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadProjects()
    return () => {
      isMounted = false
    }
  }, [showToast])

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3)
  }, [projects])

  const stats = useMemo(() => {
    const activeProjects = projects.length
    const members = new Set(projects.flatMap((project) => project.members.map((member) => member.id)))
    const comments = projects.reduce((sum, project) => sum + project.commentsCount, 0)
    const now = new Date()
    const weekAhead = new Date()
    weekAhead.setDate(now.getDate() + 7)
    const deadlines = projects.filter((project) => {
      if (!project.deadline) return false
      const date = new Date(project.deadline)
      return date >= now && date <= weekAhead
    }).length
    return { activeProjects, members: members.size, comments, deadlines }
  }, [projects])

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return 'Без срока'
    const date = new Date(deadline)
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
  }

  return (
    <div className="home-page">
      <Header
        title={showGreeting ? 'Добро пожаловать' : ''}
        subtitle={showGreeting ? (auth.user?.nickname || 'Пользователь') : undefined}
        showUserInfo={false}
        showLogoutButton={false}
      />

      <main className="home-main">
          <section className="hero">
            <div className="hero-logo">
              <img src={logo} alt="SyncHub" />
            </div>
            <div className="hero-copy">
              <h1>SyncHub</h1>
              <p>AV Production Pipeline</p>
            </div>
          </section>

          <section className="home-panels">
            <div className="panel recent-panel">
              <div className="panel-header">
                <h2>Недавние проекты</h2>
                <button className="ghost-btn" onClick={() => navigate('/dashboard')}>Все проекты →</button>
              </div>
              <div className="panel-body">
                {loading && <div className="empty-state">Загружаем проекты...</div>}
                {!loading && recentProjects.length === 0 && (
                  <div className="empty-state">Пока нет проектов. Создайте первый.</div>
                )}
                {recentProjects.map(project => (
                  <button
                    key={project.id}
                    className="recent-item"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <div className="recent-name">{project.name}</div>
                    <div className="recent-meta">
                      {project.members.length} участников · {formatDeadline(project.deadline)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel stats-panel">
              <h2>Сводка</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Проектов</div>
                  <div className="stat-value">{stats.activeProjects}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Команда</div>
                  <div className="stat-value">{stats.members}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Комментарии</div>
                  <div className="stat-value">{stats.comments}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Дедлайны/нед</div>
                  <div className="stat-value">{stats.deadlines}</div>
                </div>
              </div>
            </div>
          </section>
      </main>
    </div>
  )
}

export default Home
