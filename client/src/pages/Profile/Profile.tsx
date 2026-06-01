import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Header/Header'
import './Profile.css'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { usersApi } from '../../api/users'
import { projectsApi } from '../../api/projects'
import Modal from '../../components/Modal'
import { useI18n } from '../../context/I18nContext'
import type { ProjectSummary } from '../../types'

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const { t, language } = useI18n()
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    avatar: '',
    nickname: '',
    birthdate: ''
  })
  const [originalProfile, setOriginalProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    avatar: '',
    nickname: '',
    birthdate: ''
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
        avatar: user.avatar || '',
        nickname: user.nickname,
        birthdate: user.birthdate || ''
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
      const message = err instanceof Error ? err.message : t('Не удалось загрузить проекты')
      showToast(message, 'error')
    }
  }

  useEffect(() => {
    loadProjects()
  }, [showToast, t])

  const handleSaveProfile = async () => {
    try {
      const response = await usersApi.updateMe({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar,
        birthdate: profile.birthdate
      })
      setUser(response.user)
      setOriginalProfile({
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        email: response.user.email,
        role: response.user.role,
        avatar: response.user.avatar || '',
        nickname: response.user.nickname,
        birthdate: response.user.birthdate || ''
      })
      showToast(t('Профиль обновлен'), 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось обновить профиль')
      showToast(message, 'error')
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError(t('Заполните оба поля'))
      return
    }
    try {
      await usersApi.changePassword(passwordForm)
      showToast(t('Пароль обновлен'), 'success')
      setPasswordForm({ currentPassword: '', newPassword: '' })
      setShowPasswordModal(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось обновить пароль')
      setPasswordError(message)
    }
  }

  const handleSaveAvatar = async () => {
    try {
      const response = await usersApi.updateMe({ avatar: profile.avatar })
      setUser(response.user)
      showToast(t('Аватар обновлен'), 'success')
      setShowAvatarModal(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось обновить аватар')
      showToast(message, 'error')
    }
  }

  const joinDate = user?.createdAt
    ? new Intl.DateTimeFormat(
        language === 'en' ? 'en-US' : language === 'zh' ? 'zh-CN' : 'ru-RU',
        { dateStyle: 'long' }
      ).format(new Date(user.createdAt))
    : '—'

  const activeProjects = projects.slice(0, 3)

  const isDirty =
    profile.firstName !== originalProfile.firstName ||
    profile.lastName !== originalProfile.lastName ||
    profile.email !== originalProfile.email ||
    profile.role !== originalProfile.role ||
    profile.avatar !== originalProfile.avatar ||
    profile.birthdate !== originalProfile.birthdate

  const displayName =
    `${profile.firstName} ${profile.lastName}`.trim() || profile.nickname || t('Пользователь')
  const username = profile.nickname ? `@${profile.nickname}` : '@user'
  const isAvatarImage =
    profile.avatar.startsWith('http://') ||
    profile.avatar.startsWith('https://') ||
    profile.avatar.startsWith('data:image')

  const formatBirthdate = (value: string) => {
    if (!value) return t('Не указано')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return t('Не указано')

    const locale = language === 'en' ? 'en-US' : language === 'zh' ? 'zh-CN' : 'ru-RU'
    const formatted = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)

    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()
    const dayDiff = today.getDate() - date.getDate()
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1

    return age > 0 ? t('{date} ({age} лет)', { date: formatted, age }) : formatted
  }

  const copyValue = async (value: string, label: string) => {
    if (!value.trim()) {
      showToast(t('Поле «{label}» пустое', { label }), 'info')
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      showToast(t('«{label}» скопировано', { label }), 'success')
    } catch {
      showToast(t('Не удалось скопировать'), 'error')
    }
  }

  const handleCreateProject = async () => {
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
      setCreateData({ name: '', description: '', deadline: '' })
      setShowCreateModal(false)
      await loadProjects()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось создать проект')
      showToast(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="profile-page">
      <Header
        title={t('Профиль')}
        showBackButton={false}
        showHomeButton={true}
        showUserInfo={false}
        showLogoutButton={false}
      />

      <main className="profile-main">
          <section className="profile-content">
            <section className="profile-shell">
              <div className="profile-cover">
                <div className="profile-cover-topbar">
                  <button
                    className="profile-cover-edit-btn"
                    onClick={() => setHeroEditable((prev) => !prev)}
                  >
                    {heroEditable ? t('Готово') : t('Изм.')}
                  </button>
                </div>

                <div
                  className={`profile-cover-avatar ${heroEditable ? 'editable' : ''}`}
                  onClick={() => heroEditable && setShowAvatarModal(true)}
                >
                  {isAvatarImage ? (
                    <img src={profile.avatar} alt={displayName} />
                  ) : (
                    <span>{profile.avatar}</span>
                  )}
                </div>
                <div className="profile-cover-name">{displayName}</div>
                <div className="profile-cover-status">{t('в сети')}</div>
                <div className="profile-cover-track">{t('SyncHub • AV Pipeline')}</div>
              </div>

              <div className="profile-info-card">
                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('Имя пользователя')}</div>
                    <div className="profile-info-value profile-info-value-accent">{username}</div>
                  </div>
                  <button
                    className="profile-copy-btn"
                    onClick={() => copyValue(username, t('Имя пользователя'))}
                    title={t('Скопировать имя пользователя')}
                  >
                    ⧉
                  </button>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('Имя')}</div>
                    {heroEditable ? (
                      <input
                        className="profile-inline-input"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    ) : (
                      <div className="profile-info-value">{profile.firstName || t('Не указано')}</div>
                    )}
                  </div>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('Фамилия')}</div>
                    {heroEditable ? (
                      <input
                        className="profile-inline-input"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    ) : (
                      <div className="profile-info-value">{profile.lastName || t('Не указано')}</div>
                    )}
                  </div>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('О себе')}</div>
                    <div className="profile-info-value profile-info-value-accent">
                      {profile.role ? t(profile.role) : t('Участник')}
                    </div>
                  </div>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('Email')}</div>
                    {heroEditable ? (
                      <input
                        className="profile-inline-input"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                    ) : (
                      <div className="profile-info-value">{profile.email || t('Не указан')}</div>
                    )}
                  </div>
                  <button
                    className="profile-copy-btn"
                    onClick={() => copyValue(profile.email, t('Email'))}
                    title={t('Скопировать email')}
                  >
                    ⧉
                  </button>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('Роль в команде')}</div>
                    {heroEditable ? (
                      <select
                        className="profile-inline-input profile-inline-select"
                        value={profile.role}
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {t(role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="profile-info-value">{profile.role ? t(profile.role) : t('Участник')}</div>
                    )}
                  </div>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('День рождения')}</div>
                    {heroEditable ? (
                      <input
                        className="profile-inline-input"
                        type="date"
                        value={profile.birthdate}
                        onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                      />
                    ) : (
                      <div className="profile-info-value">{formatBirthdate(profile.birthdate)}</div>
                    )}
                  </div>
                </div>

                <div className="profile-info-row">
                  <div className="profile-info-main">
                    <div className="profile-info-label">{t('В системе с')}</div>
                    <div className="profile-info-value">{joinDate}</div>
                  </div>
                </div>

                {heroEditable ? (
                  <div className="profile-card-actions">
                    <button
                      className="secondary-btn"
                      onClick={() => {
                        setProfile(originalProfile)
                        setHeroEditable(false)
                      }}
                    >
                      {t('Отмена')}
                    </button>
                    <button
                      className="primary-btn"
                      disabled={!isDirty}
                      onClick={async () => {
                        await handleSaveProfile()
                        setHeroEditable(false)
                      }}
                    >
                      {t('Сохранить')}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <div className="profile-section">
              <div className="section-title">{t('Конфиденциальность')}</div>
              <div className="privacy-row">
                <div className="profile-info-main">
                  <div className="profile-info-label">{t('Пароль')}</div>
                  <div className="profile-info-value">••••••••</div>
                </div>
                <button className="secondary-btn" onClick={() => setShowPasswordModal(true)}>
                  {t('Изменить пароль')}
                </button>
              </div>
            </div>

            <div className="profile-section">
              <div className="section-header">
                <div className="section-title">{t('Активные проекты')}</div>
                <button className="secondary-btn" onClick={() => setShowCreateModal(true)}>
                  {t('+ Новый')}
                </button>
              </div>
              <div className="projects-list">
                {activeProjects.length === 0 && (
                  <div className="empty-state">{t('Пока нет активных проектов.')}</div>
                )}
                {activeProjects.map(project => (
                  <div key={project.id} className="project-row">
                    <div className="project-main">
                      <div className="project-name">{project.name}</div>
                      <div className="project-meta">{t('{count} участников', { count: project.members.length })}</div>
                    </div>
                    <button
                      className="secondary-btn"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      {t('Открыть')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
      </main>

      <Modal
        title={t('Смена пароля')}
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordError('')
        }}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowPasswordModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleChangePassword}>
              {t('Сохранить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          type="password"
          placeholder={t('Текущий пароль')}
          value={passwordForm.currentPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
        />
        <input
          className="form-input"
          type="password"
          placeholder={t('Новый пароль')}
          value={passwordForm.newPassword}
          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
        />
        {passwordError && <div className="form-error">{passwordError}</div>}
      </Modal>

      <Modal
        title={t('Выберите аватар')}
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowAvatarModal(false)}>
              {t('Отмена')}
            </button>
            <button
              className="primary-btn"
              onClick={handleSaveAvatar}
            >
              {t('Готово')}
            </button>
          </>
        }
      >
        <div className="avatar-grid">
          {['A','B','C','D','E','F','G','H'].map((letter) => (
            <button
              key={letter}
              className={`avatar-choice ${profile.avatar === letter ? 'active' : ''}`}
              onClick={() => setProfile({ ...profile, avatar: letter })}
            >
              {letter}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        title={t('Новый проект')}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowCreateModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleCreateProject} disabled={creating}>
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
          rows={3}
          value={createData.description}
          onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
        />
        <div className="form-label">{t('Дедлайн')}</div>
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
