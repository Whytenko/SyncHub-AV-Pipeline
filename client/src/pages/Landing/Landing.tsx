import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Landing.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  { color: '#9C27B0', label: 'Сценарист', desc: 'Загрузите PDF или Word-сценарий, заполните параметры съёмки: актёры, локации, реквизит, спецэффекты. Данные автоматически передаются в другие отделы.', num: '01' },
  { color: '#2196F3', label: 'Режиссёр', desc: 'Интерактивная раскадровка: строки — локации, столбцы — кадры. Прикрепляйте фото к каждой ячейке.', num: '02' },
  { color: '#FF9800', label: 'Костюмер', desc: 'Анатомическая карта персонажа. Отмечайте каждый элемент костюма. Персонажи из сценария — автоматически.', num: '03' },
  { color: '#E91E63', label: 'Визажист', desc: 'Детальная схема лица по зонам. Записывайте технику и материалы. Персонажи синхронизированы со сценарием.', num: '04' },
  { color: '#FF391A', label: 'Монтажёр', desc: 'Таймлайн с маркерами. Точная синхронизация по секундам. Управляйте точками пересинхронизации.', num: '05' },
  { color: '#06b6d4', label: 'Звукорежиссёр', desc: 'Отмечайте ключевые звуковые моменты на таймлайне. Комментарии и синхронизация с видеорядом.', num: '06' },
]

const TICKER_ITEMS = [
  '6 профессиональных ролей', 'Синхронизация вживую', 'Работает офлайн',
  'Бесплатно навсегда', 'Сценарий PDF / Word', 'Раскадровка в таблице',
  'Тайм-код на таймлайне', 'Анатомическая карта', 'Тёмная тема',
]

const STEPS = [
  { num: '01', title: 'Регистрация', desc: 'Без карты, без подтверждения почты. 30 секунд — и полный доступ к системе.' },
  { num: '02', title: 'Создайте проект', desc: 'Название и описание. Все разделы для каждой роли создаются автоматически.' },
  { num: '03', title: 'Пригласите команду', desc: 'Каждый видит свой раздел. Никакой путаницы с правами доступа.' },
  { num: '04', title: 'Работайте вместе', desc: 'Изменения видны мгновенно. Офлайн-режим сохраняет данные при потере связи.' },
]

const STATS = [
  { value: '6', label: 'Ролей в команде' },
  { value: '100%', label: 'Синхронизация' },
  { value: '∞', label: 'Бесплатно' },
  { value: '0', label: 'Потерь данных' },
]

const USE_CASES = [
  { stat: '−4 ч', label: 'на совещания', title: 'Студенческий фильм', desc: 'Группа из 8 человек сняла 15-минутный фильм без координационного хаоса.', color: '#9C27B0' },
  { stat: '+50%', label: 'эффективность', title: 'Рекламный ролик', desc: 'Монтаж и режиссура синхронизировали правки в реальном времени до дедлайна.', color: '#FF391A' },
  { stat: '0', label: 'потерь данных', title: 'Корпоративное видео', desc: 'Три города, одна команда. Офлайн-режим — не помеха, все данные сохранены.', color: '#06b6d4' },
]

const BENEFITS = [
  { num: '01', title: 'Экономия времени', desc: 'Снижение времени на координацию на 70%. Всё в одном месте — ноль переписок.' },
  { num: '02', title: 'Экономия бюджета', desc: 'Бесплатный для команд до 5 человек. Дешевле любого аналога на рынке.' },
  { num: '03', title: 'Реальное время', desc: 'Изменения синхронизируются мгновенно. Работайте асинхронно без потерь.' },
  { num: '04', title: 'Любая точка мира', desc: 'Распределённые команды. Часовые пояса и расстояния — не помеха.' },
  { num: '05', title: 'Офлайн режим', desc: 'Данные кешируются локально. Синхронизация автоматически при восстановлении.' },
  { num: '06', title: 'Безопасность', desc: 'Шифрование, история изменений, защищённые серверы.' },
]

type CmpVal = boolean | 'part'
const COMPARISON: { feature: string; synchub: CmpVal; cerebro: CmpVal; celtx: CmpVal; studio: CmpVal }[] = [
  { feature: 'Русский интерфейс', synchub: true, cerebro: true, celtx: false, studio: false },
  { feature: 'Бесплатный план', synchub: true, cerebro: false, celtx: 'part', studio: false },
  { feature: 'Костюмер и визажист', synchub: true, cerebro: false, celtx: false, studio: false },
  { feature: 'Офлайн-режим', synchub: true, cerebro: false, celtx: false, studio: false },
  { feature: 'Тёмная тема', synchub: true, cerebro: true, celtx: false, studio: false },
  { feature: 'Не нужна установка', synchub: true, cerebro: false, celtx: 'part', studio: true },
]

const TESTIMONIALS = [
  { text: 'Работал с 5 инструментами одновременно. SyncHub объединил всё. Время на синхронизацию упало в 10 раз.', author: 'Иван Петров', role: 'Режиссёр-постановщик' },
  { text: 'Команда в 3 городах. Офлайн-режим спасал нас несколько раз. Просто работает — и это главное.', author: 'Мария Сидорова', role: 'Монтажёр' },
  { text: 'Студия перешла на SyncHub для всех проектов. Себестоимость обработки упала на 40%.', author: 'Алексей Новиков', role: 'Продюсер' },
]

const FAQS = [
  { q: 'Это платно?', a: 'Базовый доступ полностью бесплатный. В планах — профессиональный план для студий с расширенными функциями совместной работы.' },
  { q: 'Нужно ли что-то устанавливать?', a: 'Нет. SyncHub работает полностью в браузере — Chrome, Firefox, Safari, Edge. Никаких плагинов и дистрибутивов.' },
  { q: 'Работает ли без интернета?', a: 'Да. При потере соединения данные кешируются локально и синхронизируются автоматически при восстановлении связи.' },
  { q: 'Сколько участников может быть в проекте?', a: 'Без ограничений. Каждый участник регистрирует отдельный аккаунт и получает доступ к своим разделам.' },
  { q: 'Поддерживаются ли другие языки?', a: 'Да: русский, английский, китайский. Переключить язык можно в любой момент без перезагрузки страницы.' },
]

function Check({ ok }: { ok: boolean | 'part' }) {
  if (ok === true) return <span className="cmp-yes">✓</span>
  if (ok === 'part') return <span className="cmp-part">~</span>
  return <span className="cmp-no">✗</span>
}

const Landing: React.FC = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (auth.user && !auth.loading) navigate('/home')
  }, [auth.user, auth.loading, navigate])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible') }),
      { threshold: 0.07 }
    )
    document.querySelectorAll('.anim').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor(seconds / 60) % 60).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  const timecode = `${h}:${m}:${s}:00`

  return (
    <div className="landing">

      {/* ── NAV ── */}
      <nav className="land-nav">
        <div className="land-nav-inner">
          <Link to="/" className="land-brand">
            <img src={logo} alt="SyncHub" className="land-logo" />
            <span>SyncHub</span>
          </Link>
          <div className="land-nav-actions">
            <Link to="/login" className="land-nav-login">Войти</Link>
            <Link to="/register" className="land-nav-cta">Начать бесплатно</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="land-hero">
        <div className="land-hero-bg-text" aria-hidden="true">SYNC<br />HUB</div>
        <div className="land-hero-inner">
          <div className="land-hero-left anim">
            <div className="land-hero-meta">
              <span className="land-rec-indicator">
                <span className="land-rec-dot" />
                REC
              </span>
              <span className="land-timecode">{timecode}</span>
              <span className="land-hero-take">TAKE 01</span>
            </div>
            <h1 className="land-headline">
              Инструмент<br />
              <em>съёмочной</em><br />
              группы
            </h1>
            <p className="land-sub">
              Режиссёр, монтажёр, костюмер, визажист<br />
              и звукорежиссёр — в одной системе.<br />
              Синхронизация данных, офлайн-режим.
            </p>
            <div className="land-hero-btns">
              <Link to="/register" className="land-cta-primary">Создать аккаунт →</Link>
              <Link to="/login" className="land-cta-secondary">Войти</Link>
            </div>
          </div>

          <div className="land-hero-right anim">
            <div className="land-role-stack">
              {ROLES.map((r, i) => (
                <div className="land-role-pill" key={i} style={{ '--rc': r.color } as React.CSSProperties}>
                  <span className="land-role-num">{r.num}</span>
                  <span className="land-role-name">{r.label}</span>
                  <span className="land-role-dot" />
                </div>
              ))}
            </div>
            <div className="land-hero-mockup-frame">
              <svg viewBox="0 0 440 240" xmlns="http://www.w3.org/2000/svg" className="land-mockup-svg">
                <rect width="440" height="240" rx="0" fill="#080808"/>
                <rect width="440" height="28" fill="#0f0f0f"/>
                <circle cx="16" cy="14" r="4" fill="#ef4444" opacity="0.6"/>
                <circle cx="28" cy="14" r="4" fill="#fbbf24" opacity="0.6"/>
                <circle cx="40" cy="14" r="4" fill="#4ade80" opacity="0.6"/>
                <text x="220" y="17" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">SyncHub · Дипломный проект 2026</text>
                <rect x="0" y="28" width="440" height="22" fill="#0a0a0a"/>
                <rect x="6" y="34" width="52" height="12" rx="6" fill="#9C27B0"/>
                <text x="32" y="43" textAnchor="middle" fill="white" fontSize="7" fontFamily="system-ui">Сценарий</text>
                <rect x="64" y="34" width="52" height="12" rx="6" fill="rgba(33,150,243,0.15)" stroke="rgba(33,150,243,0.4)" strokeWidth="0.5"/>
                <text x="90" y="43" textAnchor="middle" fill="rgba(33,150,243,0.8)" fontSize="7" fontFamily="system-ui">Режиссёр</text>
                <rect x="122" y="34" width="52" height="12" rx="6" fill="rgba(255,152,0,0.15)" stroke="rgba(255,152,0,0.4)" strokeWidth="0.5"/>
                <text x="148" y="43" textAnchor="middle" fill="rgba(255,152,0,0.8)" fontSize="7" fontFamily="system-ui">Костюмер</text>
                <rect x="180" y="34" width="52" height="12" rx="6" fill="rgba(233,30,99,0.15)" stroke="rgba(233,30,99,0.4)" strokeWidth="0.5"/>
                <text x="206" y="43" textAnchor="middle" fill="rgba(233,30,99,0.8)" fontSize="7" fontFamily="system-ui">Визажист</text>
                <rect x="238" y="34" width="52" height="12" rx="6" fill="rgba(255,57,26,0.15)" stroke="rgba(255,57,26,0.4)" strokeWidth="0.5"/>
                <text x="264" y="43" textAnchor="middle" fill="rgba(255,57,26,0.8)" fontSize="7" fontFamily="system-ui">Монтаж</text>
                <rect x="296" y="34" width="52" height="12" rx="6" fill="rgba(6,182,212,0.15)" stroke="rgba(6,182,212,0.4)" strokeWidth="0.5"/>
                <text x="322" y="43" textAnchor="middle" fill="rgba(6,182,212,0.8)" fontSize="7" fontFamily="system-ui">Звук</text>
                <rect x="0" y="50" width="440" height="190" fill="#060606"/>
                <rect x="8" y="58" width="424" height="130" rx="4" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
                <text x="18" y="70" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="monospace">РАСКАДРОВКА · 3 ЛОКАЦИИ · 4 КАДРА</text>
                <line x1="112" y1="58" x2="112" y2="188" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
                <line x1="216" y1="58" x2="216" y2="188" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
                <line x1="320" y1="58" x2="320" y2="188" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
                <line x1="8" y1="108" x2="432" y2="108" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
                <line x1="8" y1="148" x2="432" y2="148" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
                <rect x="9" y="59" width="102" height="48" rx="3" fill="rgba(33,150,243,0.08)" stroke="rgba(33,150,243,0.25)" strokeWidth="0.5"/>
                <rect x="217" y="109" width="102" height="38" rx="3" fill="rgba(255,152,0,0.08)" stroke="rgba(255,152,0,0.2)" strokeWidth="0.5"/>
                <rect x="321" y="59" width="102" height="48" rx="3" fill="rgba(233,30,99,0.08)" stroke="rgba(233,30,99,0.2)" strokeWidth="0.5"/>
                <rect x="8" y="198" width="424" height="34" rx="4" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
                <text x="18" y="208" fill="rgba(255,255,255,0.12)" fontSize="6" fontFamily="monospace">TIMELINE</text>
                <rect x="16" y="214" width="408" height="1.5" rx="1" fill="rgba(255,255,255,0.05)"/>
                <rect x="16" y="214" width="200" height="1.5" rx="1" fill="rgba(255,255,255,0.18)"/>
                <circle cx="80" cy="214" r="4" fill="#9C27B0" opacity="0.85"/>
                <circle cx="150" cy="214" r="4" fill="#FF391A" opacity="0.85"/>
                <circle cx="216" cy="214" r="4" fill="#2196F3" opacity="0.85"/>
                <circle cx="290" cy="214" r="4" fill="#E91E63" opacity="0.85"/>
              </svg>
            </div>
          </div>
        </div>
        <div className="land-hero-cut" aria-hidden="true" />
      </section>

      {/* ── TICKER ── */}
      <div className="land-ticker-outer" aria-hidden="true">
        <div className="land-ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="land-ticker-item">
              <span className="land-ticker-sep">·</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── 01 ROLES ── */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">01</span>
            <span className="land-eyebrow-label">Роли в команде</span>
          </div>
          <h2 className="land-section-title anim">
            Каждый специалист<br />получает своё рабочее место
          </h2>
          <div className="land-roles-grid anim">
            {ROLES.map((r, i) => (
              <div
                className={`land-role-card${i === 0 ? ' land-role-card--hero' : ''}`}
                key={i}
                style={{ '--rc': r.color } as React.CSSProperties}
              >
                <div className="land-role-card-accent" />
                <div className="land-role-card-num">{r.num}</div>
                <h3 className="land-role-card-title">{r.label}</h3>
                <p className="land-role-card-desc">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 02 HOW IT WORKS ── */}
      <section className="land-section land-section-dark">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">02</span>
            <span className="land-eyebrow-label">Как начать</span>
          </div>
          <h2 className="land-section-title anim">
            Четыре шага<br />до синхронизации команды
          </h2>
          <div className="land-steps-wrap anim">
            <div className="land-steps-rail">
              <div className="land-steps-rail-line" />
              {STEPS.map((_, i) => (
                <div className="land-steps-rail-dot" key={i} style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }} />
              ))}
            </div>
            <div className="land-steps-grid">
              {STEPS.map((s, i) => (
                <div className="land-step-item" key={i}>
                  <div className="land-step-num">{s.num}</div>
                  <h3 className="land-step-title">{s.title}</h3>
                  <p className="land-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BIG STATS ── */}
      <div className="land-big-stats-bar anim">
        <div className="land-section-inner">
          <div className="land-big-stats">
            {STATS.map((st, i) => (
              <div className="land-big-stat" key={i}>
                <div className="land-big-stat-value">{st.value}</div>
                <div className="land-big-stat-label">{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 03 USE CASES ── */}
      <section className="land-section land-section-dark">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">03</span>
            <span className="land-eyebrow-label">Реальные кейсы</span>
          </div>
          <h2 className="land-section-title anim">Как SyncHub помогает командам</h2>
          <div className="land-cases-grid anim">
            {USE_CASES.map((uc, i) => (
              <div className="land-case-card" key={i} style={{ '--uc': uc.color } as React.CSSProperties}>
                <div className="land-case-stat-block">
                  <span className="land-case-stat-value">{uc.stat}</span>
                  <span className="land-case-stat-label">{uc.label}</span>
                </div>
                <h3 className="land-case-title">{uc.title}</h3>
                <p className="land-case-desc">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 BENEFITS ── */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">04</span>
            <span className="land-eyebrow-label">Преимущества</span>
          </div>
          <h2 className="land-section-title anim">Почему выбирают SyncHub</h2>
          <div className="land-benefits-list anim">
            {BENEFITS.map((b, i) => (
              <div className="land-benefit-item" key={i}>
                <span className="land-benefit-item-num">{b.num}</span>
                <div>
                  <h3 className="land-benefit-item-title">{b.title}</h3>
                  <p className="land-benefit-item-desc">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 05 COMPARISON ── */}
      <section className="land-section land-section-dark">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">05</span>
            <span className="land-eyebrow-label">Сравнение</span>
          </div>
          <h2 className="land-section-title anim">SyncHub vs альтернативы</h2>
          <div className="land-cmp-wrap anim">
            <table className="land-cmp-table">
              <thead>
                <tr>
                  <th>Функция</th>
                  <th className="cmp-synchub">SyncHub</th>
                  <th>Cerebro</th>
                  <th>Celtx</th>
                  <th>StudioBinder</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i}>
                    <td>{row.feature}</td>
                    <td className="cmp-synchub"><Check ok={row.synchub} /></td>
                    <td><Check ok={row.cerebro} /></td>
                    <td><Check ok={row.celtx} /></td>
                    <td><Check ok={row.studio} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 06 TESTIMONIALS ── */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">06</span>
            <span className="land-eyebrow-label">Отзывы</span>
          </div>
          <h2 className="land-section-title anim">Что говорят пользователи</h2>
          <div className="land-quotes-grid anim">
            {TESTIMONIALS.map((t, i) => (
              <div className="land-quote-card" key={i}>
                <div className="land-quote-mark">"</div>
                <p className="land-quote-text">{t.text}</p>
                <div className="land-quote-footer">
                  <div className="land-quote-avatar">{t.author.charAt(0)}</div>
                  <div>
                    <div className="land-quote-name">{t.author}</div>
                    <div className="land-quote-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 07 FAQ ── */}
      <section className="land-section land-section-dark">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">07</span>
            <span className="land-eyebrow-label">FAQ</span>
          </div>
          <h2 className="land-section-title anim">Частые вопросы</h2>
          <div className="land-faq anim">
            {FAQS.map((item, i) => (
              <div
                className={`land-faq-item${openFaq === i ? ' is-open' : ''}`}
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="land-faq-q">
                  <span>{item.q}</span>
                  <span className="land-faq-arrow">{openFaq === i ? '−' : '+'}</span>
                </div>
                <div className="land-faq-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="land-cta-section">
        <div className="land-cta-slate-bar" aria-hidden="true" />
        <div className="land-cta-inner anim">
          <div className="land-cta-label">SCENE 01 · TAKE ∞ · ACTION</div>
          <h2 className="land-cta-title">Начните прямо сейчас</h2>
          <p className="land-cta-sub">30 секунд на регистрацию. Никаких карт, никаких ограничений.</p>
          <div className="land-cta-btns">
            <Link to="/register" className="land-cta-primary land-cta-primary-lg">Создать аккаунт бесплатно →</Link>
            <Link to="/login" className="land-cta-secondary-sm">Уже есть аккаунт? Войти</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="land-footer-brand">
            <img src={logo} alt="SyncHub" className="land-logo" style={{ width: 20, filter: 'invert(1) brightness(0.5)' }} />
            SyncHub
          </div>
          <div className="land-footer-copy">© 2026 SyncHub. Дипломный проект.</div>
          <div className="land-footer-links">
            <Link to="/login" className="land-footer-link">Войти</Link>
            <Link to="/register" className="land-footer-link">Регистрация</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Landing
