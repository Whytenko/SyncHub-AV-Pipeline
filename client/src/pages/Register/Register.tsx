import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Register.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

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

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
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
      showToast('Аккаунт создан!', 'success')
      navigate('/home')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось зарегистрироваться'
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
    { value: '1', label: 'Январь' },
    { value: '2', label: 'Февраль' },
    { value: '3', label: 'Март' },
    { value: '4', label: 'Апрель' },
    { value: '5', label: 'Май' },
    { value: '6', label: 'Июнь' },
    { value: '7', label: 'Июль' },
    { value: '8', label: 'Август' },
    { value: '9', label: 'Сентябрь' },
    { value: '10', label: 'Октябрь' },
    { value: '11', label: 'Ноябрь' },
    { value: '12', label: 'Декабрь' }
  ]

  // Гендеры
  const genders = [
    { value: '', label: 'Не выбирать' },
    { value: 'male', label: 'Мужской' },
    { value: 'female', label: 'Женский' }
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
                {step === 1 && "Создать аккаунт SyncHub"}
                {step === 2 && "Общие сведения"}
                {step === 3 && "Создайте никнейм"}
                {step === 4 && "Придумайте пароль"}
              </h1>
              
              <p className="register-subtitle">
                {step === 1 && "Введите своё имя"}
                {step === 2 && "Укажите свою дату рождения и пол"}
                {step === 3 && "Укажите уникальное имя пользователя"}
                {step === 4 && "Введите и повторите пароль"}
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
                        placeholder="Имя"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        autoFocus
                        className="form-input"
                      />
                      <input
                        type="text"
                        placeholder="Фамилия (необязательно)"
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
                        <option value="">День</option>
                        {days.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      
                      <select
                        value={formData.month}
                        onChange={(e) => handleChange('month', e.target.value)}
                        className="form-input date-select"
                      >
                        <option value="">Месяц</option>
                        {months.map(month => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                      
                      <select
                        value={formData.year}
                        onChange={(e) => handleChange('year', e.target.value)}
                        className="form-input date-select"
                      >
                        <option value="">Год</option>
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
                      placeholder="Никнейм"
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
                      placeholder="Пароль"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className="form-input single-input"
                    />
                    <input
                      type="password"
                      placeholder="Повторите пароль"
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
                    {step === 4 ? (submitting ? 'Создаём...' : 'Зарегистрироваться') : 'Далее'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Футер теперь вне карточки */}
        <div className="register-footer">
          <a href="#">Справка</a>
          <a href="#">Конфиденциальность</a>
          <a href="#">Условия</a>
        </div>
      </div>
    </div>
  )
}

export default Register
