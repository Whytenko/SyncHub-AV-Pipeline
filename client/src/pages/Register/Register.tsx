import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Register.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../context/I18nContext'
import {
  Clapperboard, ScrollText, Scissors, Music, Shirt, Sparkles,
  ClipboardList, Camera, Briefcase, Drama, User as UserIcon,
  Eye, EyeOff, type LucideIcon
} from 'lucide-react'

function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['', 'Слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный']
  return { score, label: labels[score] || 'Отличный' }
}

const ROLES: { value: string; label: string; Icon: LucideIcon; desc: string }[] = [
  { value: 'Режиссёр',       label: 'Режиссёр',       Icon: Clapperboard,   desc: 'Раскадровка, монтаж, общее видение' },
  { value: 'Сценарист',      label: 'Сценарист',      Icon: ScrollText,     desc: 'Сценарий, диалоги, структура' },
  { value: 'Монтажёр',       label: 'Монтажёр',       Icon: Scissors,       desc: 'Монтаж видео, цветокоррекция' },
  { value: 'Звукорежиссёр',  label: 'Звукорежиссёр',  Icon: Music,          desc: 'Сведение звука, музыка, эффекты' },
  { value: 'Костюмер',       label: 'Костюмер',       Icon: Shirt,          desc: 'Костюмы, гардероб, образы' },
  { value: 'Визажист',       label: 'Визажист',       Icon: Sparkles,       desc: 'Грим, визаж, прически' },
  { value: 'Менеджер',       label: 'Менеджер',       Icon: ClipboardList,  desc: 'Планирование, задачи, дедлайны' },
  { value: 'Оператор',       label: 'Оператор',       Icon: Camera,         desc: 'Съемка, свет, ракурсы' },
  { value: 'Продюсер',       label: 'Продюсер',       Icon: Briefcase,      desc: 'Бюджет, логистика, координация' },
  { value: 'Актёр',          label: 'Актёр',          Icon: Drama,          desc: 'Роли, репетиции, выступления' },
  { value: 'Участник',       label: 'Участник',       Icon: UserIcon,       desc: 'Общий участник команды' },
]

const TOTAL_STEPS = 5

const Register: React.FC = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    day: '',
    month: '',
    year: '',
    gender: '',
    role: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()
  const { showToast } = useToast()
  const { t } = useI18n()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  useEffect(() => {
    if (auth.user && !auth.loading) navigate('/home')
  }, [auth.user, auth.loading, navigate])

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!formData.firstName.trim()) { setError(t('Введите имя')); return false }
    }
    if (step === 3) {
      const nick = formData.nickname.trim()
      if (!nick) { setError(t('Введите никнейм')); return false }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(nick)) {
        setError(t('Никнейм: только латиница, цифры и _, длина 3–30 символов'))
        return false
      }
    }
    if (step === TOTAL_STEPS) {
      if (!formData.password) { setError(t('Введите пароль')); return false }
      if (formData.password.length < 8) { setError(t('Пароль слишком короткий (минимум 8 символов)')); return false }
      if (formData.password !== formData.confirmPassword) { setError(t('Пароли не совпадают')); return false }
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep()) return
    setError('')
    setStep(s => s + 1)
  }

  const prevStep = () => {
    setError('')
    setStep(s => s - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step !== TOTAL_STEPS) return
    if (!validateStep()) return
    setSubmitting(true)
    try {
      const birthdate = formData.year && formData.month && formData.day
        ? `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`
        : ''
      await auth.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        nickname: formData.nickname.trim(),
        password: formData.password,
        gender: formData.gender,
        birthdate,
        role: formData.role || undefined
      })
      showToast(t('Аккаунт создан!'), 'success')
      navigate('/home')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось зарегистрироваться')
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const years = Array.from({ length: 2012 - 1925 + 1 }, (_, i) => 2012 - i)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    { value: '1', label: t('Январь') }, { value: '2', label: t('Февраль') },
    { value: '3', label: t('Март') }, { value: '4', label: t('Апрель') },
    { value: '5', label: t('Май') }, { value: '6', label: t('Июнь') },
    { value: '7', label: t('Июль') }, { value: '8', label: t('Август') },
    { value: '9', label: t('Сентябрь') }, { value: '10', label: t('Октябрь') },
    { value: '11', label: t('Ноябрь') }, { value: '12', label: t('Декабрь') }
  ]
  const genders = [
    { value: '', label: t('Не выбирать') },
    { value: 'male', label: t('Мужской') },
    { value: 'female', label: t('Женский') }
  ]

  const strength = passwordStrength(formData.password)
  const strengthColors = ['', '#ef4444', '#ef4444', '#fbbf24', '#4ade80', '#4ade80']

  const stepTitles: Record<number, string> = {
    1: t('Создать аккаунт SyncHub'),
    2: t('Общие сведения'),
    3: t('Создайте никнейм'),
    4: t('Ваша роль в команде'),
    5: t('Придумайте пароль'),
  }
  const stepSubtitles: Record<number, string> = {
    1: t('Введите своё имя'),
    2: t('Укажите дату рождения и пол'),
    3: t('Уникальное имя: только латиница, цифры и _'),
    4: t('Определяет, какие вкладки вы сможете редактировать'),
    5: t('Минимум 8 символов и хотя бы одна цифра'),
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <img src={logo} alt="SyncHub" className="register-logo" />
            <div className="register-steps-indicator">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
                <div
                  key={n}
                  className={`reg-step-dot${n === step ? ' active' : n < step ? ' done' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="register-content">
            <div className="register-left">
              <h1 className="register-title">{stepTitles[step]}</h1>
              <p className="register-subtitle">{stepSubtitles[step]}</p>
              <div className="register-step-label">{t('Шаг')} {step} {t('из')} {TOTAL_STEPS}</div>
            </div>

            <div className="register-right">
              <form onSubmit={handleSubmit} className="register-form">

                {/* Step 1 — Name */}
                {step === 1 && (
                  <div className="step-content">
                    <div className="input-group-vertical">
                      <input type="text" placeholder={t('Имя')} value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)} autoFocus className="form-input" />
                      <input type="text" placeholder={t('Фамилия (необязательно)')} value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)} className="form-input" />
                    </div>
                  </div>
                )}

                {/* Step 2 — Birth/gender */}
                {step === 2 && (
                  <div className="step-content">
                    <div className="date-row">
                      <select value={formData.day} onChange={(e) => handleChange('day', e.target.value)} className="form-input date-select">
                        <option value="">{t('День')}</option>
                        {days.map(day => <option key={day} value={day}>{day}</option>)}
                      </select>
                      <select value={formData.month} onChange={(e) => handleChange('month', e.target.value)} className="form-input date-select">
                        <option value="">{t('Месяц')}</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select value={formData.year} onChange={(e) => handleChange('year', e.target.value)} className="form-input date-select">
                        <option value="">{t('Год')}</option>
                        {years.map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </div>
                    <div className="gender-row">
                      <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="form-input gender-select">
                        {genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 3 — Nickname */}
                {step === 3 && (
                  <div className="step-content">
                    <input type="text" placeholder={t('Никнейм')} value={formData.nickname}
                      onChange={(e) => handleChange('nickname', e.target.value)}
                      className="form-input single-input" autoComplete="username" autoFocus />
                  </div>
                )}

                {/* Step 4 — Role */}
                {step === 4 && (
                  <div className="step-content">
                    <div className="role-grid">
                      {ROLES.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          className={`role-card${formData.role === r.value ? ' role-card--selected' : ''}`}
                          onClick={() => handleChange('role', r.value)}
                        >
                          <span className="role-card-icon"><r.Icon size={22} /></span>
                          <span className="role-card-label">{r.label}</span>
                          <span className="role-card-desc">{r.desc}</span>
                        </button>
                      ))}
                    </div>
                    {!formData.role && (
                      <div className="role-hint">{t('Необязательно — можно изменить в профиле')}</div>
                    )}
                  </div>
                )}

                {/* Step 5 — Password */}
                {step === TOTAL_STEPS && (
                  <div className="step-content">
                    <div className="reg-pass-wrap">
                      <input type={showPass ? 'text' : 'password'} placeholder={t('Пароль')}
                        value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
                        className="form-input single-input reg-pass-input" autoComplete="new-password" autoFocus />
                      <button type="button" className="reg-pass-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="reg-strength">
                        <div className="reg-strength-bar">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className="reg-strength-seg"
                              style={{ background: n <= strength.score ? strengthColors[strength.score] : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                        <span className="reg-strength-label" style={{ color: strengthColors[strength.score] }}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                    <div className="reg-pass-wrap">
                      <input type={showConfirm ? 'text' : 'password'} placeholder={t('Повторите пароль')}
                        value={formData.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        className="form-input single-input reg-pass-input" autoComplete="new-password" />
                      <button type="button" className="reg-pass-toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <div className="reg-mismatch">{t('Пароли не совпадают')}</div>
                    )}
                  </div>
                )}

                {error && <div className="form-error">{error}</div>}

                <div className="button-group">
                  {step > 1 && (
                    <button type="button" className="secondary-btn" onClick={prevStep}>
                      ← {t('Назад')}
                    </button>
                  )}
                  <button
                    type={step === TOTAL_STEPS ? 'submit' : 'button'}
                    className="primary-btn"
                    onClick={step < TOTAL_STEPS ? nextStep : undefined}
                    disabled={submitting}
                  >
                    {step === TOTAL_STEPS
                      ? (submitting ? t('Создаём...') : t('Зарегистрироваться'))
                      : step === 4 && !formData.role
                        ? t('Пропустить')
                        : t('Далее')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="register-footer">
          <Link to="/" className="register-back-link">← {t('На главную')}</Link>
          <a href="#">{t('Справка')}</a>
          <a href="#">{t('Конфиденциальность')}</a>
        </div>
      </div>
    </div>
  )
}

export default Register
