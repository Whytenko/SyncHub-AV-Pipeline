import React from 'react';
import Header from '../Header/Header';
import './Help.css';
import { useI18n } from '../../context/I18nContext';

const Help: React.FC = () => {
  const { t } = useI18n();

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
        <section className="help-card">
          <h2>{t('Быстрые ответы')}</h2>
          <div className="help-grid">
            <div className="help-item">
              <h3>{t('Как создать проект?')}</h3>
              <p>{t('Откройте раздел «Проекты» и нажмите «Создать новый проект». Заполните название и дедлайн.')}</p>
            </div>
            <div className="help-item">
              <h3>{t('Как добавить маркер?')}</h3>
              <p>{t('Внутри проекта выберите вкладку и нажмите «Добавить маркер». Он сохранится в таймлайне.')}</p>
            </div>
            <div className="help-item">
              <h3>{t('Как поделиться заметками?')}</h3>
              <p>{t('В режиссёрской вкладке нажмите «Поделиться с командой» — текст копируется в буфер.')}</p>
            </div>
          </div>
        </section>

        <section className="help-card">
          <h2>{t('Контакты')}</h2>
          <p>{t('Если что-то не работает, проверьте, запущен ли сервер (порт 5000) и клиент (порт 5173).')}</p>
          <p>{t('Для отчета по диплому можно сделать экспорт проекта через кнопку «Экспорт».')}</p>
        </section>
      </main>
    </div>
  );
};

export default Help;
