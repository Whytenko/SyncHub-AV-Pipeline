import React, { useState } from 'react';
import Header from '../Header/Header';
import './Help.css';
import { useI18n } from '../../context/I18nContext';
import { Clapperboard, Film, Shirt, Sparkles, Music, Plus, Minus, type LucideIcon } from 'lucide-react';

const Help: React.FC = () => {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const modules: { Icon: LucideIcon; title: string; desc: string }[] = [
    { Icon: Clapperboard, title: t('Режиссёр'), desc: t('Текстовый редактор сценария. Пишите и редактируйте сцены прямо в браузере — текст сохраняется автоматически.') },
    { Icon: Film,         title: t('Монтажёр'), desc: t('Визуальный таймлайн с маркерами. Добавляйте временные метки, описывайте монтажные переходы, управляйте ключевыми сценами.') },
    { Icon: Shirt,        title: t('Костюмер'), desc: t('Силуэт персонажа с интерактивными маркерами. Добавляйте описания костюмов по зонам тела. Поддерживается несколько персонажей.') },
    { Icon: Sparkles,     title: t('Визажист'), desc: t('Детализированная иллюстрация лица. Добавляйте маркеры с описаниями грима по зонам: Лоб, Глаза, Нос, Губы, Подбородок.') },
    { Icon: Music,        title: t('Звукорежиссёр'), desc: t('Список звуковых треков и временных меток. Координируйте звуковое оформление с таймлайном монтажёра.') },
  ];

  const faqs = [
    {
      q: t('Как создать проект?'),
      a: t('В разделе «Проекты» нажмите «Создать новый проект». Введите название, описание (необязательно) и дедлайн. Проект сразу доступен для работы.')
    },
    {
      q: t('Как добавить маркер на таймлайн?'),
      a: t('Откройте проект, перейдите на вкладку «Монтажёр». Нажмите «Добавить маркер», укажите время, название и описание. Маркер появится на шкале времени.')
    },
    {
      q: t('Как работает офлайн-режим?'),
      a: t('При недоступном сервере приложение автоматически переходит в офлайн-режим. Данные читаются из кеша, внизу появляется жёлтый баннер. При восстановлении соединения режим снимается.')
    },
    {
      q: t('Как изменить аватар?'),
      a: t('Перейдите в раздел «Профиль», нажмите кнопку «Изм.» рядом с аватаром — откроется выбор эмодзи.')
    },
    {
      q: t('Как поменять язык интерфейса?'),
      a: t('В разделе «Настройки» выберите нужный язык из списка. Доступны русский, английский и китайский.')
    },
    {
      q: t('Как экспортировать данные проекта?'),
      a: t('Внутри проекта в шапке есть кнопка «Экспорт» — она скачивает JSON-файл со всеми данными проекта.')
    },
  ];

  return (
    <div className="help-page">
      <Header
        title={t('Справка')}
        showBackButton={true}
        backButtonText={t('Назад')}
        backButtonPath="/home"
        showHomeButton={true}
        showUserInfo={false}
        showLogoutButton={false}
      />

      <main className="help-main">

        {/* Модули */}
        <section className="help-section">
          <div className="help-section-header">
            <span className="help-section-label">{t('Разделы проекта')}</span>
          </div>
          <div className="help-modules-grid">
            {modules.map((m, i) => (
              <div className="help-module-card" key={i}>
                <div className="help-module-emoji"><m.Icon size={28} /></div>
                <div className="help-module-title">{m.title}</div>
                <div className="help-module-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="help-section">
          <div className="help-section-header">
            <span className="help-section-label">{t('Частые вопросы')}</span>
          </div>
          <div className="help-faq">
            {faqs.map((item, i) => (
              <div
                key={i}
                className={`help-faq-item${openFaq === i ? ' open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="help-faq-q">
                  <span>{item.q}</span>
                  <span className="help-faq-icon">{openFaq === i ? <Minus size={14} /> : <Plus size={14} />}</span>
                </div>
                <div className="help-faq-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Техинфо */}
        <section className="help-section">
          <div className="help-section-header">
            <span className="help-section-label">{t('Техническая информация')}</span>
          </div>
          <div className="help-info-grid">
            <div className="help-info-row">
              <span className="help-info-key">{t('Сервер')}</span>
              <code className="help-info-val">http://localhost:5001</code>
            </div>
            <div className="help-info-row">
              <span className="help-info-key">{t('Клиент')}</span>
              <code className="help-info-val">http://localhost:3000</code>
            </div>
            <div className="help-info-row">
              <span className="help-info-key">{t('Демо-аккаунт')}</span>
              <code className="help-info-val">demo / demo1234</code>
            </div>
            <div className="help-info-row">
              <span className="help-info-key">{t('Версия')}</span>
              <code className="help-info-val">SyncHub v4</code>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Help;
