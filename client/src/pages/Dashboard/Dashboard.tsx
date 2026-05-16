import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../Header/Header'
import './Dashboard.css'
import { projectsApi } from '../../api/projects'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../context/I18nContext'
import type { ProjectSummary } from '../../types'
import Modal from '../../components/Modal'

// Импорт иконок
import MembersIcon from '../assets/icons/members.svg'
import VideoIcon from '../assets/icons/video.svg'
import EditsIcon from '../assets/icons/edits.svg'
import DeadlineIcon from '../assets/icons/deadline.svg'
import NewProjectIcon from '../assets/icons/newproject.svg'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const { t, language } = useI18n()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createData, setCreateData] = useState({ name: '', description: '', deadline: '' })
  const [creating, setCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updatedAt' | 'deadline' | 'name'>('updatedAt')

  const loadProjects = async () => {
    try {
      const response = await projectsApi.list()
      setProjects(response.projects)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось загрузить проекты')
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [showToast, t])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('create') === '1') {
      setShowCreate(true)
      navigate('/dashboard', { replace: true })
    }
  }, [location.search, navigate])

  const formatRelative = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return t('{count} дн. назад', { count: days })
    if (hours > 0) return t('{count} ч. назад', { count: hours })
    return t('только что')
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return t('Без срока')
    const locale = language === 'en' ? 'en-US' : language === 'zh' ? 'zh-CN' : 'ru-RU'
    return new Intl.DateTimeFormat(locale).format(new Date(deadline))
  }

  const daysUntilDeadline = (deadline: string | undefined): number | null => {
    if (!deadline) return null
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  }

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = projects.filter(p => {
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    })
    result = [...result].sort((a, b) => {
      if (sortBy === 'updatedAt') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }
      // deadline: ascending, nulls last
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity
      return da - db
    })
    return result
  }, [projects, searchQuery, sortBy])

  const stats = useMemo(() => {
    return {
      total: projects.length,
      media: projects.reduce((sum, project) => sum + project.mediaCount, 0),
      edits: projects.reduce((sum, project) => sum + project.editsCount, 0)
    }
  }, [projects])

  const handleCreate = async () => {
    if (!createData.name.trim()) {
      showToast(t('Введите название проекта'), 'error')
      return
    }
    setCreating(true)
    try {
      await projectsApi.create({
        name: createData.name.trim(),
        description: createData.description.trim(),
        deadline: createData.deadline
      })
      showToast(t('Проект создан'), 'success')
      setShowCreate(false)
      setCreateData({ name: '', description: '', deadline: '' })
      await loadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось создать проект')
      showToast(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!projectToDelete) return
    setDeleting(true)
    try {
      await projectsApi.remove(projectToDelete.id)
      showToast(t('Проект удален'), 'success')
      setProjects((prev) => prev.filter((project) => project.id !== projectToDelete.id))
      setShowDeleteConfirm(false)
      setProjectToDelete(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось удалить проект')
      showToast(message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteConfirm = (project: ProjectSummary) => {
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  return (
    <div className="dashboard">
     <Header
         title={t('Мои проекты')}
        showHomeButton={true}
       showUserInfo={false}
           showLogoutButton={false}
      />

      <main className="dashboard-main">
        <div className="dashboard-search-bar">
          <input
            className="dashboard-search-input"
            placeholder="Поиск по проекту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="dashboard-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'deadline' | 'name')}
          >
            <option value="updatedAt">По дате обновления</option>
            <option value="deadline">По дедлайну</option>
            <option value="name">По названию</option>
          </select>
        </div>

        <div className="projects-grid">
          {loading && <div className="empty-state">{t('Загрузка проектов...')}</div>}
          {!loading && projects.length === 0 && (
            <div className="empty-state">{t('Проектов пока нет. Создайте первый!')}</div>
          )}
          {!loading && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="empty-state">Ничего не найдено</div>
          )}
          {filteredProjects.map(project => {
            const days = daysUntilDeadline(project.deadline)
            const isOverdue = days !== null && days <= 0
            const isUrgent = days !== null && days > 0 && days <= 7
            const isWarning = days !== null && days > 7 && days <= 30
            const cardClass = [
              'project-card',
              isOverdue ? 'project-card--overdue' : '',
              isUrgent ? 'project-card--urgent' : ''
            ].filter(Boolean).join(' ')

            return (
              <div
                key={project.id}
                className={cardClass}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="project-header">
                  <h3 className="project-name">{project.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="project-badge">
                      {t('Обновлён {value}', { value: formatRelative(project.updatedAt) })}
                    </span>
                    {isOverdue && (
                      <span className="deadline-badge deadline-badge--overdue">&#9888; Просрочен</span>
                    )}
                    {isUrgent && (
                      <span className="deadline-badge deadline-badge--urgent">&#9888; Горит</span>
                    )}
                  </div>
                </div>

                <div className="project-stats">
                  <div className="stat-item">
                    <span className="stat-icon">
                      <img src={MembersIcon} alt={t('Участники')} />
                    </span>
                    <span className="stat-text" aria-label={t('Участники: {count}', { count: project.members.length })}>
                      <span className="stat-count">{project.members.length}</span>
                      <span className="stat-label">{t('участника')}</span>
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">
                      <img src={VideoIcon} alt={t('Медиафайлы')} />
                    </span>
                    <span className="stat-text" aria-label={t('Медиафайлы: {count}', { count: project.mediaCount })}>
                      <span className="stat-count">{project.mediaCount}</span>
                      <span className="stat-label">{t('медиафайлов')}</span>
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">
                      <img src={EditsIcon} alt={t('Правки')} />
                    </span>
                    <span className="stat-text" aria-label={t('Новые правки: {count}', { count: project.editsCount })}>
                      <span className="stat-count">{project.editsCount}</span>
                      <span className="stat-label">{t('новых правок')}</span>
                    </span>
                  </div>
                </div>

                <div className="project-deadline">
                  <span className="deadline-icon">
                    <img src={DeadlineIcon} alt={t('Дедлайн')} />
                  </span>
                  <strong>{t('Дедлайн:')}</strong> {formatDeadline(project.deadline)}
                  {isOverdue && (
                    <span className="deadline-badge deadline-badge--overdue">Просрочен</span>
                  )}
                  {isUrgent && days !== null && (
                    <span className="deadline-badge deadline-badge--urgent">Осталось {days} дн.</span>
                  )}
                  {isWarning && days !== null && (
                    <span className="deadline-badge deadline-badge--normal">Осталось {days} дн.</span>
                  )}
                </div>

                <div className="project-actions">
                  <button
                    className="open-project-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/project/${project.id}`)
                    }}
                  >
                    {t('Открыть проект')}
                  </button>
                  <button
                    className="delete-project-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      openDeleteConfirm(project)
                    }}
                  >
                    {t('Удалить')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="dashboard-actions">
          <button className="create-project-btn" onClick={() => setShowCreate(true)}>
            <img src={NewProjectIcon} alt={t('Создать проект')} className="create-icon" />
            {t('Создать новый проект')}
          </button>
        </div>

        <div className="dashboard-stats">
          <div>{t('Всего проектов:')} {stats.total}</div>
          <div>{t('Медиафайлов:')} {stats.media}</div>
          <div>{t('Правок:')} {stats.edits}</div>
        </div>
      </main>

      <Modal
        title={t('Новый проект')}
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowCreate(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleCreate} disabled={creating}>
              {creating ? t('Создаем...') : t('Создать')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название проекта')}
          value={createData.name}
          onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder={t('Описание (необязательно)')}
          value={createData.description}
          onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
          rows={3}
        />
        <div className="form-label">{t('Дедлайн')}</div>
        <input
          className="form-input"
          type="date"
          value={createData.deadline}
          onChange={(e) => setCreateData({ ...createData, deadline: e.target.value })}
        />
      </Modal>

      <Modal
        title={t('Удалить проект?')}
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (deleting) return
          setShowDeleteConfirm(false)
          setProjectToDelete(null)
        }}
        actions={
          <>
            <button
              className="secondary-btn"
              onClick={() => {
                setShowDeleteConfirm(false)
                setProjectToDelete(null)
              }}
              disabled={deleting}
            >
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('Удаляем...') : t('Удалить')}
            </button>
          </>
        }
      >
        <div>
          {projectToDelete
            ? t('Проект «{name}» будет удален без возможности восстановления.', { name: projectToDelete.name })
            : t('Проект будет удален без возможности восстановления.')}
        </div>
      </Modal>
    </div>
  )
}

export default Dashboard
