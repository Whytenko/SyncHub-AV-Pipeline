import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Header/Header'
import './Profile.css'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usersApi } from '../../api/users'
import { projectsApi } from '../../api/projects'
import Modal from '../../components/Modal'
import type { ProjectSummary } from '../../types'

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const { showToast } = useToast()
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    avatar: '👤',
    nickname: ''
  })
  const [originalProfile, setOriginalProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    avatar: '👤',
    nickname: ''
  })
  const [heroEditable, setHeroEditable] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createData, setCreateData] = useState({ name: '', description: '', deadline: '' })
  const [creating, setCreating] = useState(false)
  const roles = ['Режиссёр', 'Сценарист', 'Монтажёр', 'Композитор', 'Костюмер', 'Визажист', 'Оператор']
  
  useEffect(() => {
    if (user) {
      const nextProfile = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '👤',
        nickname: user.nickname
      }
      setProfile(nextProfile)
      setOriginalProfile(nextProfile)
    }
  }, [user])

  const loadProjects = async () => {
    try {
      const response = await projectsApi.list()
      setProjects(response.projects)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить проекты'
      showToast(message, 'error')
    }
  }

  useEffect(() => {
    loadProjects()
  }, [showToast])

  const handleSaveProfile = async () => {
    try {
      const response = await usersApi.updateMe({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar
      })
      setUser(response.user)
      setOriginalProfile({
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        email: response.user.email,
        role: response.user.role,
        avatar: response.user.avatar || '👤',
        nickname: response.user.nickname
      })
      showToast('Профиль обновлен', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось обновить профиль'
      showToast(message, 'error')
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Заполните оба поля')
      return
    }
    try {
      await usersApi.changePassword(passwordForm)
      showToast('Пароль обновлен', 'success')
      setPasswordForm({ currentPassword: '', newPassword: '' })
      setShowPasswordModal(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось обновить пароль'
      setPasswordError(message)
    }
  }

  const handleSaveAvatar = async () => {
    try {
      const response = await usersApi.updateMe({ avatar: profile.avatar })
      setUser(response.user)
      showToast('Аватар обновлен', 'success')
      setShowAvatarModal(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось обновить аватар'
      showToast(message, 'error')
    }
  }

  const joinDate = user?.createdAt
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(user.createdAt))
    : '—'

  const activeProjects = projects.slice(0, 3)

  const isDirty =
    profile.firstName !== originalProfile.firstName ||
    profile.lastName !== originalProfile.lastName ||
    profile.email !== originalProfile.email ||
    profile.role !== originalProfile.role ||
    profile.avatar !== originalProfile.avatar

  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || profile.nickname || 'Пользователь'

  const handleCreateProject = async () => {
    if (!createData.name.trim()) {
      showToast('Введите название проекта', 'error')
      return
    }
    setCreating(true)
    try {
      await projectsApi.create({
        name: createData.name.trim(),
        description: createData.description.trim(),
        deadline: createData.deadline
      })
      showToast('Проект создан', 'success')
      setCreateData({ name: '', description: '', deadline: '' })
      setShowCreateModal(false)
      await loadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось создать проект'
      showToast(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="profile-page">
      <Header
        title="Профиль"
        showBackButton={true}
        backButtonText="К проектам"
        backButtonPath="/dashboard"
        showHomeButton={true}
        showUserInfo={false}
        showLogoutButton={false}
      />

      <main className="profile-main">
          <section className="profile-content">
            <div className="profile-section profile-hero">
              <div
                className={`profile-photo ${heroEditable ? 'editable' : ''}`}
                onClick={() => heroEditable && setShowAvatarModal(true)}
              >
                {profile.avatar}
              </div>
              <div className="profile-hero-info">
                {heroEditable ? (
                  <div className="profile-hero-inputs">
                    <input
                      className="profile-input"
                      placeholder="Имя"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                    <input
                      className="profile-input"
                      placeholder="Фамилия"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="profile-name">{displayName}</div>
                )}
                <div className="profile-role">{profile.role || 'Участник'}</div>
              </div>
              <div className="profile-hero-actions">
                <button
                  className="secondary-btn"
                  onClick={() => setHeroEditable((prev) => !prev)}
                >
                  {heroEditable ? 'Готово' : 'Изменить'}
                </button>
              </div>
            </div>

            <div className="profile-section">
              <div className="section-title">Профиль</div>
              <div className="profile-grid">
                <div className="profile-field">
                  <span className="profile-label">Имя</span>
                  <input
                    className="profile-input"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="profile-field">
                  <span className="profile-label">Фамилия</span>
                  <input
                    className="profile-input"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
                <div className="profile-field">
                  <span className="profile-label">Email</span>
                  <input
                    className="profile-input"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="profile-field">
                  <span className="profile-label">В системе с</span>
                  <div className="profile-value">{joinDate}</div>
                </div>
                <div className="profile-field">
                  <span className="profile-label">Роль</span>
                  <select
                    className="profile-input"
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {isDirty && (
                <div className="profile-save">
                  <button className="primary-btn" onClick={handleSaveProfile}>
                    Сохранить
                  </button>
                </div>
              )}
            </div>

            <div className="profile-section">
              <div className="section-title">Конфиденциальность</div>
              <div className="privacy-row">
                <div className="profile-value">Пароль: ••••••••</div>
                <button className="secondary-btn" onClick={() => setShowPasswordModal(true)}>
                  Изменить пароль
                </button>
              </div>
            </div>

            <div className="profile-section">
              <div className="section-title">Активные проекты</div>
              <div className="section-actions">
                <button className="secondary-btn" onClick={() => setShowCreateModal(true)}>
                  + Новый
                </button>
              </div>
              <div className="projects-list">
                {activeProjects.length === 0 && (
                  <div className="empty-state">Пока нет активных проектов.</div>
                )}
                {activeProjects.map(project => (
                  <div key={project.id} className="project-row">
                    <div>
                      <div className="project-name">{project.name}</div>
                      <div className="project-meta">{project.members.length} участников</div>
                    </div>
                    <button
                      className="secondary-btn"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
      </main>

      <Modal
        title="Смена пароля"
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordError('')
        }}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowPasswordModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleChangePassword}>
              Сохранить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          type="password"
          placeholder="Текущий пароль"
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
        />
        <input
          className="form-input"
          type="password"
          placeholder="Новый пароль"
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
        />
        {passwordError && <div className="form-error">{passwordError}</div>}
      </Modal>

      <Modal
        title="Выберите аватар"
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowAvatarModal(false)}>
              Отмена
            </button>
            <button
              className="primary-btn"
              onClick={handleSaveAvatar}
            >
              Готово
            </button>
          </>
        }
      >
        <div className="avatar-grid">
          {['🎬', '🎥', '🎧', '🎨', '🧑‍💻', '🧑‍🎤', '🧑‍🎨', '🧑‍🔧'].map((emoji) => (
            <button
              key={emoji}
              className={`avatar-choice ${profile.avatar === emoji ? 'active' : ''}`}
              onClick={() => setProfile({ ...profile, avatar: emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        title="Новый проект"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowCreateModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleCreateProject} disabled={creating}>
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
          rows={3}
          value={createData.description}
          onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
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

export default Profile
