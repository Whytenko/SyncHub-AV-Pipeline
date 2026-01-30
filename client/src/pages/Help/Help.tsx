import React from 'react';
import Header from '../Header/Header';
import './Help.css';

const Help: React.FC = () => {
  return (
    <div className="help-page">
      <Header
        title="Справка"
        showBackButton={true}
        backButtonText="Назад"
        backButtonPath="/home"
        showHomeButton={true}
        showUserInfo={true}
        showLogoutButton={true}
      />

      <main className="help-main">
        <section className="help-card">
          <h2>Быстрые ответы</h2>
          <div className="help-grid">
            <div className="help-item">
              <h3>Как создать проект?</h3>
              <p>Откройте раздел «Проекты» и нажмите «Создать новый проект». Заполните название и дедлайн.</p>
            </div>
            <div className="help-item">
              <h3>Как добавить маркер?</h3>
              <p>Внутри проекта выберите вкладку и нажмите «Добавить маркер». Он сохранится в таймлайне.</p>
            </div>
            <div className="help-item">
              <h3>Как поделиться заметками?</h3>
              <p>В режиссёрской вкладке нажмите «Поделиться с командой» — текст копируется в буфер.</p>
            </div>
          </div>
        </section>

        <section className="help-card">
          <h2>Контакты</h2>
          <p>Если что-то не работает, проверьте, запущен ли сервер (порт 5000) и клиент (порт 5173).</p>
          <p>Для отчета по диплому можно сделать экспорт проекта через кнопку «Экспорт».</p>
        </section>
      </main>
    </div>
  );
};

export default Help;
