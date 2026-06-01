import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Login.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../context/I18nContext'
import { Eye, EyeOff } from 'lucide-react'

const Login: React.FC = () => {
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()
  const { showToast } = useToast()
  const { t } = useI18n()

  useEffect(() => {
    if (auth.user && !auth.loading) navigate('/home')
  }, [auth.user, auth.loading, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) { setError(t('Введите никнейм')); return }
    if (!password) { setError(t('Введите пароль')); return }
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
          <div className="login-header">
            <img src={logo} alt="SyncHub" className="login-logo" />
          </div>

          <div className="login-content">
            <div className="login-left">
              <h1 className="login-title">{t('Вход')}</h1>
              <p className="login-subtitle">{t('Введите никнейм и пароль')}</p>

              <div className="login-demo-box">
                <div className="login-demo-label">{t('Демо-доступ')}</div>
                <div className="login-demo-row">
                  <span className="login-demo-key">{t('Никнейм')}</span>
                  <code className="login-demo-val">demo</code>
                </div>
                <div className="login-demo-row">
                  <span className="login-demo-key">{t('Пароль')}</span>
                  <code className="login-demo-val">demo1234</code>
                </div>
              </div>
            </div>

            <div className="login-right">
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-fields">
                  <input
                    type="text"
                    placeholder={t('Никнейм')}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoFocus
                    className="login-input"
                    autoComplete="username"
                  />
                  <div className="login-pass-wrap">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder={t('Пароль')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-input login-input-pass"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="login-pass-toggle"
                      onClick={() => setShowPass(v => !v)}
                      tabIndex={-1}
                      aria-label={showPass ? t('Скрыть пароль') : t('Показать пароль')}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

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

        <div className="login-footer">
          <Link to="/" className="login-back-link">← {t('На главную')}</Link>
          <a href="#">{t('Справка')}</a>
          <a href="#">{t('Конфиденциальность')}</a>
        </div>
      </div>
    </div>
  )
}

export default Login
