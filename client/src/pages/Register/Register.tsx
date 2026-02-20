import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Register.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../context/I18nContext'

const Register: React.FC = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    day: '',
    month: '',
    year: '',
    gender: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()
  const { showToast } = useToast()
  const { t } = useI18n()

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  useEffect(() => {
    if (auth.user && !auth.loading) {
      navigate('/home')
    }
  }, [auth.user, auth.loading, navigate])

  const nextStep = () => {
    setError('')
    if (step < 4) setStep(step + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (step !== 4) return
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
        birthdate
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

  // Генерация годов от 1925 до 2012
  const years = Array.from({ length: 2012 - 1925 + 1 }, (_, i) => 2012 - i)
  
  // Генерация дней от 1 до 31
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  // Месяцы
  const months = [
    { value: '1', label: t('Январь') },
    { value: '2', label: t('Февраль') },
    { value: '3', label: t('Март') },
    { value: '4', label: t('Апрель') },
    { value: '5', label: t('Май') },
    { value: '6', label: t('Июнь') },
    { value: '7', label: t('Июль') },
    { value: '8', label: t('Август') },
    { value: '9', label: t('Сентябрь') },
    { value: '10', label: t('Октябрь') },
    { value: '11', label: t('Ноябрь') },
    { value: '12', label: t('Декабрь') }
  ]

  // Гендеры
  const genders = [
    { value: '', label: t('Не выбирать') },
    { value: 'male', label: t('Мужской') },
    { value: 'female', label: t('Женский') }
  ]

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          {/* Хедер с логотипом - всегда отображается */}
          <div className="register-header">
            <img src={logo} alt="SyncHub" className="register-logo" />
          </div>

          <div className="register-content">
            {/* Левая часть - заголовки */}
            <div className="register-left">
              <h1 className="register-title">
                {step === 1 && t('Создать аккаунт SyncHub')}
                {step === 2 && t('Общие сведения')}
                {step === 3 && t('Создайте никнейм')}
                {step === 4 && t('Придумайте пароль')}
              </h1>
              
              <p className="register-subtitle">
                {step === 1 && t('Введите своё имя')}
                {step === 2 && t('Укажите свою дату рождения и пол')}
                {step === 3 && t('Укажите уникальное имя пользователя')}
                {step === 4 && t('Введите и повторите пароль')}
              </p>
            </div>

            {/* Правая часть - форма */}
            <div className="register-right">
              <form onSubmit={handleSubmit} className="register-form">
                {step === 1 && (
                  <div className="step-content">
                    <div className="input-group-vertical">
                      <input
                        type="text"
                        placeholder={t('Имя')}
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        autoFocus
                        className="form-input"
                      />
                      <input
                        type="text"
                        placeholder={t('Фамилия (необязательно)')}
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="step-content">
                    {/* Первая строка: День, Месяц, Год */}
                    <div className="date-row">
                      <select
                        value={formData.day}
                        onChange={(e) => handleChange('day', e.target.value)}
                        className="form-input date-select"
                      >
                        <option value="">{t('День')}</option>
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      
                      <select
                        value={formData.month}
                        onChange={(e) => handleChange('month', e.target.value)}
                        className="form-input date-select"
                      >
                        <option value="">{t('Месяц')}</option>
                        {months.map(month => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                      
                      <select
                        value={formData.year}
                        onChange={(e) => handleChange('year', e.target.value)}
                        className="form-input date-select"
                      >
                        <option value="">{t('Год')}</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Вторая строка: Пол */}
                    <div className="gender-row">
                      <select
                        value={formData.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="form-input gender-select"
                      >
                        {genders.map(gender => (
                          <option key={gender.value} value={gender.value}>{gender.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="step-content">
                    <input
                      type="text"
                      placeholder={t('Никнейм')}
                      value={formData.nickname}
                      onChange={(e) => handleChange('nickname', e.target.value)}
                      className="form-input single-input"
                    />
                  </div>
                )}

                {step === 4 && (
                  <div className="step-content">
                    <input
                      type="password"
                      placeholder={t('Пароль')}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="form-input single-input"
                    />
                    <input
                      type="password"
                      placeholder={t('Повторите пароль')}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className="form-input single-input"
                    />
                  </div>
                )}

                {error && <div className="form-error">{error}</div>}

                <div className="button-group">
                  {/* Убраны все кнопки "Назад" */}
                  <button 
                    type={step === 4 ? 'submit' : 'button'} 
                    className="primary-btn"
                    onClick={step < 4 ? nextStep : undefined}
                    disabled={submitting}
                  >
                    {step === 4 ? (submitting ? t('Создаём...') : t('Зарегистрироваться')) : t('Далее')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Футер теперь вне карточки */}
        <div className="register-footer">
          <a href="#">{t('Справка')}</a>
          <a href="#">{t('Конфиденциальность')}</a>
          <a href="#">{t('Условия')}</a>
        </div>
      </div>
    </div>
  )
}

export default Register
