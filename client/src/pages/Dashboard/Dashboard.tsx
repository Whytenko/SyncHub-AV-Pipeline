import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Header/Header'
import './Dashboard.css'
import { projectsApi } from '../../api/projects'
import { useToast } from '../../context/ToastContext'
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
  const { showToast } = useToast()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createData, setCreateData] = useState({ name: '', description: '', deadline: '' })
  const [creating, setCreating] = useState(false)

  const loadProjects = async () => {
    try {
      const response = await projectsApi.list()
      setProjects(response.projects)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить проекты'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const formatRelative = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days} дн. назад`
    if (hours > 0) return `${hours} ч. назад`
    return 'только что'
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return 'Без срока'
    return new Intl.DateTimeFormat('ru-RU').format(new Date(deadline))
  }

  const stats = useMemo(() => {
    return {
      total: projects.length,
      media: projects.reduce((sum, project) => sum + project.mediaCount, 0),
      edits: projects.reduce((sum, project) => sum + project.editsCount, 0)
    }
  }, [projects])

  const handleCreate = async () => {
    if (!createData.name.trim()) {
      showToast('Введите название проекта', 'error')
      return
    }
    setCreating(true)
    try {
      const response = await projectsApi.create({
        name: createData.name.trim(),
        description: createData.description.trim(),
        deadline: createData.deadline
      })
      showToast('Проект создан', 'success')
      setShowCreate(false)
      setCreateData({ name: '', description: '', deadline: '' })
      await loadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось создать проект'
      showToast(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    const confirmed = window.confirm('Удалить проект без возможности восстановления?')
    if (!confirmed) return
    try {
      await projectsApi.remove(projectId)
      showToast('Проект удален', 'success')
      setProjects((prev) => prev.filter((project) => project.id !== projectId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось удалить проект'
      showToast(message, 'error')
    }
  }

  return (
    <div className="dashboard">
     <Header
         title="Мои проекты"
        showHomeButton={true}
       showUserInfo={true}
           showLogoutButton={true}
      />

      <main className="dashboard-main">
        <div className="projects-grid">
          {loading && <div className="empty-state">Загрузка проектов...</div>}
          {!loading && projects.length === 0 && (
            <div className="empty-state">Проектов пока нет. Создайте первый!</div>
          )}
          {projects.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <div className="project-header">
                <h3 className="project-name">{project.name}</h3>
                <span className="project-badge">Обновлён {formatRelative(project.updatedAt)}</span>
              </div>
              
              <div className="project-stats">
                <div className="stat-item">
                  <span className="stat-icon">
                    <img src={MembersIcon} alt="Участники" />
                  </span>
                  <span className="stat-text">{project.members.length} участника</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">
                    <img src={VideoIcon} alt="Медиафайлы" />
                  </span>
                  <span className="stat-text">{project.mediaCount} медиафайлов</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">
                    <img src={EditsIcon} alt="Правки" />
                  </span>
                  <span className="stat-text">{project.editsCount} новых правок</span>
                </div>
              </div>

              <div className="project-deadline">
                <span className="deadline-icon">
                  <img src={DeadlineIcon} alt="Дедлайн" />
                </span>
                <strong>Дедлайн:</strong> {formatDeadline(project.deadline)}
              </div>

              <div className="project-actions">
                <button 
                  className="open-project-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/project/${project.id}`)
                  }}
                >
                  Открыть проект
                </button>
                <button 
                  className="delete-project-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(project.id)
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-actions">
          <button className="create-project-btn" onClick={() => setShowCreate(true)}>
            <img src={NewProjectIcon} alt="Создать проект" className="create-icon" />
            + Создать новый проект
          </button>
        </div>

        <div className="dashboard-stats">
          <div>Всего проектов: {stats.total}</div>
          <div>Медиафайлов: {stats.media}</div>
          <div>Правок: {stats.edits}</div>
        </div>
      </main>

      <Modal
        title="Новый проект"
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowCreate(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleCreate} disabled={creating}>
              {creating ? 'Создаем...' : 'Создать'}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название проекта"
          value={createData.name}
          onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder="Описание (необязательно)"
          value={createData.description}
          onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
          rows={3}
        />
        <div className="form-label">Дедлайн</div>
        <input
          className="form-input"
          type="date"
          value={createData.deadline}
          onChange={(e) => setCreateData({ ...createData, deadline: e.target.value })}
        />
      </Modal>
    </div>
  )
}

export default Dashboard
