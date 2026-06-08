import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Landing.css'
import logo from '../assets/logo.svg'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  { color: '#9C27B0', label: 'Сценарист', desc: 'Загрузите сценарий PDF или Word, разбейте на сцены и заполните карту производства: актёрский состав, реквизит, эффекты, камера, риски. Данные расходятся по всем отделам.', num: '01' },
  { color: '#2196F3', label: 'Режиссёр', desc: 'Раскадровка по сценам: кадры с типом плана, фото и длительностью. Покрытие, хронометраж и таймлайн считаются автоматически.', num: '02' },
  { color: '#FF9800', label: 'Костюмер', desc: 'Образы костюмов с привязкой к сценам: гардероб со статусом и ценой, цветовая палитра и фото-референсы. Персонажи — из сценария.', num: '03' },
  { color: '#E91E63', label: 'Визажист', desc: 'Образы грима по сценам: продукты по зонам лица, техника, время нанесения и заметки по коже. Фото-референсы и синхронизация со сценарием.', num: '04' },
  { color: '#FF391A', label: 'Монтажёр', desc: 'Сверка монтажа с раскадровкой по сценам, медиатека финальных шотов и прогресс по каждой сцене. Синхронизация с режиссёрским таймлайном.', num: '05' },
  { color: '#06b6d4', label: 'Звукорежиссёр', desc: 'Главный аудиотрек, звуковые метки на таймлайне и режимы «на площадке» / «пост-продакшн». Комментарии и синхронизация с видеорядом по сценам.', num: '06' },
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

const FAQS = [
  { q: 'Это платно?', a: 'Базовый доступ полностью бесплатный. В планах — профессиональный план для студий с расширенными функциями совместной работы.' },
  { q: 'Нужно ли что-то устанавливать?', a: 'Нет. SyncHub работает полностью в браузере — Chrome, Firefox, Safari, Edge. Никаких плагинов и дистрибутивов.' },
  { q: 'Работает ли без интернета?', a: 'Да. При потере соединения данные кешируются локально и синхронизируются автоматически при восстановлении связи.' },
]

// Frames shown in the hero interface mockup — mirrors the real director storyboard.
const MOCK_FRAMES = [
  { n: 1, type: 'ДЛ', dur: '3с', rc: '#2196F3', filled: true },
  { n: 2, type: 'СП', dur: '5с', rc: '#9C27B0', filled: true },
  { n: 3, type: 'КП', dur: '2с', rc: '#E91E63', filled: true },
  { n: 4, type: 'ДТЛ', dur: '4с', rc: '#FF391A', filled: false },
]

/** High-fidelity replica of the in-app director / storyboard screen. */
const HeroMockup: React.FC = () => (
  <div className="land-ui" role="img" aria-label="Интерфейс SyncHub — раскадровка режиссёра">
    {/* window chrome */}
    <div className="land-ui-bar">
      <span className="land-ui-dot" style={{ background: '#ef4444' }} />
      <span className="land-ui-dot" style={{ background: '#fbbf24' }} />
      <span className="land-ui-dot" style={{ background: '#4ade80' }} />
      <span className="land-ui-bar-title">SyncHub · «Хаски» — короткометражка</span>
    </div>

    {/* role tabs */}
    <div className="land-ui-tabs">
      {ROLES.map((r, i) => (
        <span
          key={i}
          className={`land-ui-tab${r.label === 'Режиссёр' ? ' land-ui-tab--active' : ''}`}
          style={{ '--rc': r.color } as React.CSSProperties}
        >
          {r.label === 'Сценарист' ? 'Сценарий'
            : r.label === 'Монтажёр' ? 'Монтаж'
            : r.label === 'Звукорежиссёр' ? 'Звук' : r.label}
        </span>
      ))}
    </div>

    <div className="land-ui-body">
      {/* director stat row */}
      <div className="land-ui-stats">
        <div className="land-ui-stat"><b>6</b><span>Сцен</span></div>
        <div className="land-ui-stat"><b>21<i>/24</i></b><span>Кадров</span></div>
        <div className="land-ui-stat"><b>88<i>%</i></b><span>Покрытие</span></div>
        <div className="land-ui-stat"><b>4:12</b><span>Хронометраж</span></div>
      </div>
      <div className="land-ui-coverage"><div className="land-ui-coverage-fill" /></div>

      {/* storyboard scene */}
      <div className="land-ui-scene">
        <div className="land-ui-scene-head">
          <span className="land-ui-scene-dot" />
          <span className="land-ui-scene-num">Сц. 1</span>
          <span className="land-ui-scene-ie">ИНТ · ДЕНЬ</span>
          <span className="land-ui-scene-title">Кухня, утро</span>
          <span className="land-ui-scene-cov">4 / 4</span>
        </div>
        <div className="land-ui-frames">
          {MOCK_FRAMES.map(f => (
            <div key={f.n} className={`land-ui-frame${f.filled ? ' is-filled' : ''}`}>
              <span className="land-ui-frame-num">{f.n}</span>
              <div className="land-ui-frame-thumb" style={{ '--rc': f.rc } as React.CSSProperties} />
              <span className="land-ui-frame-type">{f.type}</span>
              <span className="land-ui-frame-dur">{f.dur}</span>
            </div>
          ))}
        </div>
      </div>

      {/* timeline */}
      <div className="land-ui-timeline">
        <span className="land-ui-tl-label">TIMELINE</span>
        <div className="land-ui-tl-track">
          <div className="land-ui-tl-progress" />
          <span className="land-ui-tl-playhead" />
          <span className="land-ui-tl-marker" style={{ left: '18%', background: '#9C27B0' }} />
          <span className="land-ui-tl-marker" style={{ left: '34%', background: '#FF391A' }} />
          <span className="land-ui-tl-marker" style={{ left: '52%', background: '#2196F3' }} />
          <span className="land-ui-tl-marker" style={{ left: '71%', background: '#E91E63' }} />
          <span className="land-ui-tl-marker" style={{ left: '86%', background: '#06b6d4' }} />
        </div>
      </div>
    </div>
  </div>
)

const CountUp: React.FC<{ target: string; active: boolean; delay?: number }> = ({ target, active, delay = 0 }) => {
  const isAnimatable = /^\d/.test(target) && parseInt(target) > 0
  const [val, setVal] = useState(isAnimatable ? '0' : target)
  const done = useRef(false)
  useEffect(() => {
    if (!active || done.current || !isAnimatable) return
    done.current = true
    const num = parseInt(target)
    const suffix = target.replace(/^\d+/, '')
    const timer = setTimeout(() => {
      const t0 = Date.now()
      const dur = Math.min(1300, 500 + num * 18)
      const tick = () => {
        const p = Math.min((Date.now() - t0) / dur, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(eased * num) + suffix)
        if (p < 1) requestAnimationFrame(tick)
        else setVal(target)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(timer)
  }, [active, target, delay, isAnimatable])
  return <>{val}</>
}

const Landing: React.FC = () => {
  const navigate = useNavigate()
  const auth = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)

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

  // Scroll progress bar
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setScrollProgress(max > 0 ? (h.scrollTop / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible') }),
      { threshold: 0.07 }
    )
    document.querySelectorAll('.anim').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect() }
    }, { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor(seconds / 60) % 60).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  const timecode = `${h}:${m}:${s}:00`

  return (
    <div className="landing">

      {/* scroll progress */}
      <div className="land-scroll-progress" style={{ transform: `scaleX(${scrollProgress / 100})` }} aria-hidden="true" />

      {/* ambient aurora background */}
      <div className="land-aurora" aria-hidden="true" />

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
              <HeroMockup />
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
                className={`land-role-card${i === 0 ? ' land-role-card--hero' : ''}${i === ROLES.length - 1 ? ' land-role-card--full' : ''}`}
                key={i}
                style={{ '--rc': r.color, '--stagger': `${i * 70}ms` } as React.CSSProperties}
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
      <div className={`land-big-stats-bar${statsVisible ? ' stats-visible' : ''}`} ref={statsRef}>
        <div className="land-section-inner">
          <div className="land-big-stats">
            {STATS.map((st, i) => (
              <div className="land-big-stat" key={i}>
                <div className="land-big-stat-value">
                  <CountUp target={st.value} active={statsVisible} delay={i * 130} />
                </div>
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
              <div className="land-case-card" key={i} style={{ '--uc': uc.color, '--stagger': `${i * 90}ms` } as React.CSSProperties}>
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

      {/* ── 04 FAQ ── */}
      <section className="land-section">
        <div className="land-section-inner">
          <div className="land-eyebrow anim">
            <span className="land-eyebrow-num">04</span>
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
