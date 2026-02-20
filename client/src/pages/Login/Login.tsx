import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Login.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../context/I18nContext'

const Login: React.FC = () => {
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()
  const { showToast } = useToast()
  const { t } = useI18n()

  useEffect(() => {
    if (auth.user && !auth.loading) {
      navigate('/home')
    }
  }, [auth.user, auth.loading, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await auth.login(nickname, password)
      showToast(t('С возвращением!'), 'success')
      navigate('/home')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось войти')
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Хедер с логотипом */}
          <div className="login-header">
            <img src={logo} alt="SyncHub" className="login-logo" />
          </div>

          <div className="login-content">
            {/* Левая часть - заголовки */}
            <div className="login-left">
              <h1 className="login-title">{t('Вход')}</h1>
              <p className="login-subtitle">{t('Введите никнейм и пароль')}</p>
            </div>

            {/* Правая часть - форма */}
            <div className="login-right">
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-fields">
                  <input
                    type="text"
                    placeholder={t('Никнейм (можно оставить пустым)')}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoFocus
                    className="login-input"
                  />
                  <input
                    type="password"
                    placeholder={t('Пароль (необязательно)')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                  />
                </div>
                <div className="form-helper">{t('Демо-доступ: demo / demo1234')}</div>
                {error && <div className="form-error">{error}</div>}

                <div className="login-button-group">
                  <button type="button" className="secondary-btn" onClick={() => navigate('/register')}>
                    {t('Зарегистрироваться')}
                  </button>
                  <button type="submit" className="primary-btn" disabled={submitting}>
                    {submitting ? t('Входим...') : t('Войти')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Футер вне карточки */}
        <div className="login-footer">
          <a href="#">{t('Справка')}</a>
          <a href="#">{t('Конфиденциальность')}</a>
          <a href="#">{t('Условия')}</a>
        </div>
      </div>
    </div>
  )
}

export default Login
