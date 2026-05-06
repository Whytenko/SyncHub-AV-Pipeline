import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Landing.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'

const FEATURES = [
  {
    color: '#6366f1',
    icon: '🎬',
    title: 'Режиссёр',
    desc: 'Профессиональный редактор сценария с правильной типографикой, историей версий и мгновенным доступом коллег.'
  },
  {
    color: '#f59e0b',
    icon: '🎞',
    title: 'Монтажёр',
    desc: 'Интуитивный таймлайн с точной синхронизацией по секундам. Управляйте точками пересинхронизации одним кликом.'
  },
  {
    color: '#ec4899',
    icon: '👗',
    title: 'Костюмер',
    desc: 'Анатомическая карта персонажа. Отмечайте каждый элемент: цвет, материал, особенности. Несколько персонажей в проекте.'
  },
  {
    color: '#8b5cf6',
    icon: '💄',
    title: 'Визажист',
    desc: 'Детальная схема лица с разделением по зонам. Записывайте технику, материалы и особенности макияжа.'
  },
  {
    color: '#06b6d4',
    icon: '🎙',
    title: 'Звукорежиссёр',
    desc: 'Управление аудиотреками с синхронизацией видеоряда. Отмечайте ключевые моменты и эффекты.'
  }
]

const STEPS = [
  {
    num: '01',
    title: 'Регистрация за 30 сек',
    desc: 'Не нужна карта или валидация почты. Просто логин, пароль и готово. Сразу доступен полный функционал.'
  },
  {
    num: '02',
    title: 'Создайте проект',
    desc: 'Задайте название и описание. Система автоматически создаст разделы для каждой роли команды.'
  },
  {
    num: '03',
    title: 'Пригласите коллег',
    desc: 'Поделитесь ссылкой приглашения. Каждый видит только свой раздел. Никакой путаницы прав доступа.'
  },
  {
    num: '04',
    title: 'Синхронизация вживую',
    desc: 'Все изменения видны мгновенно. Работает офлайн, синхронизируется при подключении.'
  }
]

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Экономия времени',
    desc: 'Снижение времени на координацию команды на 70%. Все в одном месте — ноль переписок.'
  },
  {
    icon: '💰',
    title: 'Экономия бюджета',
    desc: 'Бесплатный для команд до 5 человек. Годовая подписка дешевле одного проекта в Cerebro.'
  },
  {
    icon: '🔄',
    title: 'Синхронизация в реальном времени',
    desc: 'Изменения синхронизируются мгновенно. Работайте асинхронно без потери данных.'
  },
  {
    icon: '🌍',
    title: 'Распределённые команды',
    desc: 'Работайте с коллегами в любой точке мира. Часовые пояса не помеха.'
  },
  {
    icon: '📱',
    title: 'Мобильные уведомления',
    desc: 'Получайте оповещения о каждом изменении. Никогда не пропустите важное.'
  },
  {
    icon: '🛡️',
    title: 'Безопасность данных',
    desc: 'Шифрование конца-в-конца. Данные хранятся на европейских серверах.'
  }
]

const AUDIENCES = [
  {
    emoji: '🎓',
    title: 'Студенты киношкол',
    points: [
      'Учебные дипломные проекты',
      'Совместная работа без бюджета',
      'Всё необходимое в одном инструменте'
    ]
  },
  {
    emoji: '🎥',
    title: 'Независимые студии',
    points: [
      'Малобюджетные съёмки и рекламные ролики',
      'Управление командой до 20 человек',
      'Офлайн-режим на съёмочной площадке'
    ]
  },
  {
    emoji: '🏢',
    title: 'Корпоративный продакшн',
    points: [
      'Внутренние презентации и брендовые видео',
      'Чёткое разделение ролей и ответственности',
      'Единая история изменений по каждому проекту'
    ]
  }
]

const USE_CASES = [
  {
    title: 'Студенческий фильм «Утро»',
    desc: 'Группа из 8 человек сняла 15-минутный фильм без хаоса с координацией благодаря SyncHub.',
    stats: '−4 часа на совещания',
    color: '#6366f1'
  },
  {
    title: 'Реклама для туристического агентства',
    desc: 'Команда монтажа и режиссуры синхронизировала правки в реальном времени во время последних дней до дедлайна.',
    stats: '+50% эффективность',
    color: '#f59e0b'
  },
  {
    title: 'Корпоративное видео',
    desc: 'Разделённая команда в 3 городах работала в одном проекте с полной синхронизацией. Офлайн не был помехой.',
    stats: '0 потерь данных',
    color: '#ec4899'
  }
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

const FAQS = [
  {
    q: 'Это платно?',
    a: 'Базовый доступ полностью бесплатный. В планах — профессиональный план для студий с расширенными функциями совместной работы.'
  },
  {
    q: 'Нужно ли что-то устанавливать?',
    a: 'Нет. SyncHub работает полностью в браузере — Chrome, Firefox, Safari, Edge. Никаких плагинов и дистрибутивов.'
  },
  {
    q: 'Работает ли без интернета?',
    a: 'Да. При потере соединения данные кешируются локально и синхронизируются автоматически при восстановлении связи.'
  },
  {
    q: 'Сколько участников может быть в проекте?',
    a: 'Ограничений нет. Каждый участник регистрирует отдельный аккаунт и получает доступ к нужным разделам.'
  },
  {
    q: 'Поддерживаются ли другие языки?',
    a: 'Да: русский, английский и китайский. Переключить язык можно в любой момент без перезагрузки страницы.'
  }
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

  useEffect(() => {
    if (auth.user && !auth.loading) navigate('/home')
  }, [auth.user, auth.loading, navigate])

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible') }),
      { threshold: 0.08 }
    )
    document.querySelectorAll('.anim').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing">
      {/* NAV */}
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

      {/* HERO */}
      <section className="land-hero">
        <div className="land-hero-inner">
          <div className="land-hero-text anim">
            <div className="land-badge">🚀 Революция в кинопроизводстве</div>
            <h1 className="land-headline">
              Идеальный инструмент<br />
              <span className="land-headline-accent">для съёмочной группы</span>
            </h1>
            <p className="land-sub">
              Режиссёры, монтажёры, костюмеры, визажисты и звукорежиссёры<br />
              наконец могут работать вместе без глобальной переписки.<br />
              Экономия времени, снижение стресса, повышение качества.
            </p>
            <div className="land-hero-btns">
              <Link to="/register" className="land-cta-primary">Создать аккаунт →</Link>
              <Link to="/login" className="land-cta-secondary">Войти</Link>
            </div>
          </div>

          <div className="land-hero-visual anim">
            <div className="land-app-mockup">
              <svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg" className="land-mockup-svg">
                {/* Window frame */}
                <rect width="520" height="340" rx="14" fill="#0a0a0a" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
                {/* Title bar */}
                <rect width="520" height="38" rx="14" fill="#141414"/>
                <rect y="20" width="520" height="18" fill="#141414"/>
                <circle cx="22" cy="19" r="5.5" fill="#ef4444" opacity="0.75"/>
                <circle cx="40" cy="19" r="5.5" fill="#fbbf24" opacity="0.75"/>
                <circle cx="58" cy="19" r="5.5" fill="#4ade80" opacity="0.75"/>
                <text x="240" y="23" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="system-ui">SyncHub — Весенний показ 2026</text>
                {/* Sidebar */}
                <rect x="0" y="38" width="88" height="302" fill="#0d0d0d"/>
                <rect x="12" y="58" width="64" height="26" rx="6" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.35)" strokeWidth="1"/>
                <text x="44" y="75" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="system-ui">Проекты</text>
                <rect x="12" y="94" width="64" height="26" rx="6" fill="rgba(255,255,255,0.04)"/>
                <text x="44" y="111" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="system-ui">Дашборд</text>
                <rect x="12" y="130" width="64" height="26" rx="6" fill="rgba(255,255,255,0.04)"/>
                <text x="44" y="147" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="system-ui">Профиль</text>
                <rect x="12" y="166" width="64" height="26" rx="6" fill="rgba(255,255,255,0.04)"/>
                <text x="44" y="183" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="system-ui">Настройки</text>
                {/* Main area */}
                <rect x="88" y="38" width="432" height="302" fill="#090909"/>
                {/* Tab bar */}
                <rect x="88" y="38" width="432" height="42" fill="#0f0f0f"/>
                <rect x="100" y="50" width="72" height="20" rx="10" fill="#6366f1"/>
                <text x="136" y="63" textAnchor="middle" fill="white" fontSize="9" fontFamily="system-ui">Режиссёр</text>
                <rect x="182" y="50" width="72" height="20" rx="10" fill="rgba(245,158,11,0.18)" stroke="rgba(245,158,11,0.3)" strokeWidth="1"/>
                <text x="218" y="63" textAnchor="middle" fill="rgba(245,158,11,0.85)" fontSize="9" fontFamily="system-ui">Монтажёр</text>
                <rect x="264" y="50" width="72" height="20" rx="10" fill="rgba(236,72,153,0.18)" stroke="rgba(236,72,153,0.3)" strokeWidth="1"/>
                <text x="300" y="63" textAnchor="middle" fill="rgba(236,72,153,0.85)" fontSize="9" fontFamily="system-ui">Костюмер</text>
                <rect x="346" y="50" width="72" height="20" rx="10" fill="rgba(139,92,246,0.18)" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
                <text x="382" y="63" textAnchor="middle" fill="rgba(139,92,246,0.85)" fontSize="9" fontFamily="system-ui">Визажист</text>
                <rect x="428" y="50" width="72" height="20" rx="10" fill="rgba(6,182,212,0.18)" stroke="rgba(6,182,212,0.3)" strokeWidth="1"/>
                <text x="464" y="63" textAnchor="middle" fill="rgba(6,182,212,0.85)" fontSize="9" fontFamily="system-ui">Звук</text>
                {/* Script content */}
                <rect x="108" y="96" width="294" height="10" rx="5" fill="rgba(255,255,255,0.12)"/>
                <rect x="108" y="116" width="240" height="8" rx="4" fill="rgba(255,255,255,0.07)"/>
                <rect x="108" y="132" width="270" height="8" rx="4" fill="rgba(255,255,255,0.07)"/>
                <rect x="108" y="148" width="200" height="8" rx="4" fill="rgba(255,255,255,0.07)"/>
                <rect x="108" y="168" width="250" height="8" rx="4" fill="rgba(255,255,255,0.05)"/>
                <rect x="108" y="184" width="220" height="8" rx="4" fill="rgba(255,255,255,0.05)"/>
                {/* Timeline block */}
                <rect x="108" y="212" width="380" height="90" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
                <text x="124" y="230" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="system-ui">Таймлайн</text>
                {/* Timeline rail */}
                <rect x="124" y="250" width="348" height="3" rx="1.5" fill="rgba(255,255,255,0.08)"/>
                <rect x="124" y="250" width="160" height="3" rx="1.5" fill="rgba(245,245,245,0.3)"/>
                {/* Markers */}
                <rect x="166" y="238" width="2" height="26" rx="1" fill="rgba(245,245,245,0.5)"/>
                <circle cx="167" cy="236" r="4" fill="rgba(245,245,245,0.7)"/>
                <rect x="238" y="238" width="2" height="26" rx="1" fill="#f59e0b" opacity="0.8"/>
                <circle cx="239" cy="236" r="4" fill="#f59e0b" opacity="0.9"/>
                <rect x="284" y="238" width="2" height="26" rx="1" fill="#6366f1" opacity="0.8"/>
                <circle cx="285" cy="236" r="4" fill="#6366f1" opacity="0.9"/>
                <rect x="340" y="238" width="2" height="26" rx="1" fill="#ec4899" opacity="0.8"/>
                <circle cx="341" cy="236" r="4" fill="#ec4899" opacity="0.9"/>
                {/* Labels */}
                <text x="148" y="283" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="system-ui">00:00</text>
                <text x="230" y="283" fill="rgba(245,158,11,0.7)" fontSize="8" fontFamily="system-ui">01:24</text>
                <text x="276" y="283" fill="rgba(99,102,241,0.7)" fontSize="8" fontFamily="system-ui">02:15</text>
                <text x="332" y="283" fill="rgba(236,72,153,0.7)" fontSize="8" fontFamily="system-ui">03:40</text>
              </svg>
              <div className="land-mockup-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="land-stats anim">
        <div className="land-stats-inner">
          <div className="land-stat"><strong>5</strong> профессиональных ролей</div>
          <div className="land-stat-sep" />
          <div className="land-stat"><strong>100%</strong> синхронизация</div>
          <div className="land-stat-sep" />
          <div className="land-stat"><strong>Работает</strong> без интернета</div>
          <div className="land-stat-sep" />
          <div className="land-stat"><strong>Навсегда</strong> бесплатно</div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">Пять специализированных рабочих мест</h2>
            <p className="land-section-sub">
              Каждая роль получает инструменты, оптимизированные именно под её задачи. Больше никакой адаптации.
            </p>
          </div>
          <div className="land-features-grid">
            {FEATURES.map((f, i) => (
              <div className="land-feature-card anim" key={i} style={{ '--feat-color': f.color } as React.CSSProperties}>
                <div className="land-feature-icon">{f.icon}</div>
                <div className="land-feature-color-bar" />
                <h3 className="land-feature-title">{f.title}</h3>
                <p className="land-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="land-section land-section-alt">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">Как начать работу</h2>
            <p className="land-section-sub">Четыре простых шага — и ваша команда уже синхронизирована.</p>
          </div>
          <div className="land-steps">
            {STEPS.map((s, i) => (
              <div className="land-step anim" key={i}>
                <div className="land-step-num">{s.num}</div>
                <div className="land-step-body">
                  <h3 className="land-step-title">{s.title}</h3>
                  <p className="land-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">Реальные примеры</h2>
            <p className="land-section-sub">
              Посмотрите, как SyncHub помог командам работать эффективнее.
            </p>
          </div>
          <div className="land-usecases-grid">
            {USE_CASES.map((uc, i) => (
              <div className="land-usecase-card anim" key={i} style={{ '--uc-color': uc.color } as React.CSSProperties}>
                <div className="land-usecase-header">
                  <h3 className="land-usecase-title">{uc.title}</h3>
                  <div className="land-usecase-stat">{uc.stats}</div>
                </div>
                <p className="land-usecase-desc">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="land-section land-section-alt">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">Почему выбирают SyncHub</h2>
            <p className="land-section-sub">
              Шесть ключевых преимуществ, которые меняют способ работы кинопроизводства.
            </p>
          </div>
          <div className="land-benefits-grid">
            {BENEFITS.map((b, i) => (
              <div className="land-benefit-card anim" key={i}>
                <div className="land-benefit-icon">{b.icon}</div>
                <h3 className="land-benefit-title">{b.title}</h3>
                <p className="land-benefit-desc">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR WHO */}
      <section className="land-section land-section-alt">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">Для кого SyncHub</h2>
            <p className="land-section-sub">
              От студентов до профессиональных студий — есть план для каждого.
            </p>
          </div>
          <div className="land-audience-grid">
            {AUDIENCES.map((a, i) => (
              <div className="land-audience-card anim" key={i}>
                <div className="land-audience-emoji">{a.emoji}</div>
                <h3 className="land-audience-title">{a.title}</h3>
                <ul className="land-audience-list">
                  {a.points.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="land-section land-section-alt">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">SyncHub vs альтернативы</h2>
            <p className="land-section-sub">
              Cerebro и StudioBinder — мощные инструменты, но они дорогие, не адаптированы под российские реалии
              и не покрывают визажистов и костюмеров.
            </p>
          </div>
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

      {/* FAQ */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-section-header anim">
            <h2 className="land-section-title">Частые вопросы</h2>
          </div>
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

      {/* FINAL CTA */}
      <section className="land-cta-section anim">
        <div className="land-cta-inner">
          <h2 className="land-cta-title">Присоединяйтесь к революции</h2>
          <p className="land-cta-sub">
            Лучше один раз попробовать, чем сто раз читать. Создайте аккаунт за 30 секунд, никаких карт.
          </p>
          <div className="land-cta-btns">
            <Link to="/register" className="land-cta-primary land-cta-primary-lg">
              Создать аккаунт бесплатно →
            </Link>
            <div className="land-demo-hint">
              Или войдите с демо-доступом:&nbsp;
              <Link to="/login" className="land-demo-link">demo / demo1234</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="land-footer">
        <div className="land-footer-inner">
          <div className="land-footer-brand">
            <img src={logo} alt="SyncHub" className="land-footer-logo" />
            <span>SyncHub</span>
          </div>
          <div className="land-footer-links">
            <Link to="/login">Войти</Link>
            <Link to="/register">Регистрация</Link>
          </div>
          <div className="land-footer-copy">
            © 2026 SyncHub · Дипломный проект
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
