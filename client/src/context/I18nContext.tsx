import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppLanguage = 'ru' | 'en' | 'zh'

interface I18nContextValue {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  t: (source: string, params?: Record<string, string | number>) => string
}

const STORAGE_KEY = 'synchub_lang'

const dictionary: Record<string, { en: string; zh: string }> = {
  'Настройки': { en: 'Settings', zh: '设置' },
  'Проекты': { en: 'Projects', zh: '项目' },
  'Домой': { en: 'Home', zh: '首页' },
  'Создать': { en: 'Create', zh: '创建' },
  'Профиль': { en: 'Profile', zh: '个人资料' },
  'Помощь': { en: 'Help', zh: '帮助' },
  'Назад': { en: 'Back', zh: '返回' },
  'Главная': { en: 'Home', zh: '首页' },
  'Экспорт': { en: 'Export', zh: '导出' },
  'Выйти': { en: 'Log out', zh: '退出' },
  'Подсказка: наведите на элемент': { en: 'Hint: hover over any element', zh: '提示：悬停到元素上' },
  'Вход': { en: 'Login', zh: '登录' },
  'Введите никнейм и пароль': { en: 'Enter nickname and password', zh: '请输入昵称和密码' },
  'Никнейм (можно оставить пустым)': { en: 'Nickname (can be empty)', zh: '昵称（可留空）' },
  'Пароль (необязательно)': { en: 'Password (optional)', zh: '密码（可选）' },
  'Демо-доступ: demo / demo1234': { en: 'Demo access: demo / demo1234', zh: '演示账号：demo / demo1234' },
  'Зарегистрироваться': { en: 'Sign up', zh: '注册' },
  'Войти': { en: 'Log in', zh: '登录' },
  'Входим...': { en: 'Signing in...', zh: '登录中...' },
  'Справка': { en: 'Help', zh: '帮助' },
  'Конфиденциальность': { en: 'Privacy', zh: '隐私' },
  'Условия': { en: 'Terms', zh: '条款' },
  'Добро пожаловать': { en: 'Welcome', zh: '欢迎' },
  'Пользователь': { en: 'User', zh: '用户' },
  'Недавние проекты': { en: 'Recent projects', zh: '最近项目' },
  'Все проекты →': { en: 'All projects →', zh: '全部项目 →' },
  'Загружаем проекты...': { en: 'Loading projects...', zh: '正在加载项目...' },
  'Пока нет проектов. Создайте первый.': { en: 'No projects yet. Create your first one.', zh: '暂无项目，创建第一个吧。' },
  'Сводка': { en: 'Overview', zh: '概览' },
  'Проектов': { en: 'Projects', zh: '项目数' },
  'Команда': { en: 'Team', zh: '团队' },
  'Комментарии': { en: 'Comments', zh: '评论' },
  'Дедлайны/нед': { en: 'Deadlines/week', zh: '本周截止' },
  'Без срока': { en: 'No deadline', zh: '无截止日期' },
  'Мои проекты': { en: 'My projects', zh: '我的项目' },
  'Загрузка проектов...': { en: 'Loading projects...', zh: '正在加载项目...' },
  'Проектов пока нет. Создайте первый!': { en: 'No projects yet. Create your first one!', zh: '还没有项目，创建一个吧！' },
  'участника': { en: 'members', zh: '成员' },
  'медиафайлов': { en: 'media files', zh: '媒体文件' },
  'новых правок': { en: 'new edits', zh: '新修改' },
  'Дедлайн:': { en: 'Deadline:', zh: '截止日期：' },
  'Открыть проект': { en: 'Open project', zh: '打开项目' },
  'Удалить': { en: 'Delete', zh: '删除' },
  'Создать новый проект': { en: 'Create new project', zh: '创建新项目' },
  'Всего проектов:': { en: 'Total projects:', zh: '项目总数：' },
  'Медиафайлов:': { en: 'Media files:', zh: '媒体文件：' },
  'Правок:': { en: 'Edits:', zh: '修改：' },
  'Новый проект': { en: 'New project', zh: '新建项目' },
  'Отмена': { en: 'Cancel', zh: '取消' },
  'Создаем...': { en: 'Creating...', zh: '创建中...' },
  'Название проекта': { en: 'Project name', zh: '项目名称' },
  'Описание (необязательно)': { en: 'Description (optional)', zh: '描述（可选）' },
  'Дедлайн': { en: 'Deadline', zh: '截止日期' },
  'Удалить проект?': { en: 'Delete project?', zh: '删除项目？' },
  'Удаляем...': { en: 'Deleting...', zh: '删除中...' },
  'Проект будет удален без возможности восстановления.': {
    en: 'The project will be deleted permanently.',
    zh: '项目将被永久删除。'
  },
  'Персональные предпочтения': { en: 'Personal preferences', zh: '个人偏好' },
  'Светлая тема': { en: 'Light theme', zh: '浅色主题' },
  'Уведомления о событиях': { en: 'Event notifications', zh: '事件通知' },
  'Автосохранение изменений': { en: 'Autosave changes', zh: '自动保存更改' },
  'Язык интерфейса': { en: 'Interface language', zh: '界面语言' },
  'Русский': { en: 'Russian', zh: '俄语' },
  'Английский': { en: 'English', zh: '英语' },
  'Китайский': { en: 'Chinese', zh: '中文' },
  'Системная информация': { en: 'System information', zh: '系统信息' },
  'Версия клиента': { en: 'Client version', zh: '客户端版本' },
  'Очистить локальные настройки': { en: 'Clear local settings', zh: '清除本地设置' },
  'Профиль обновлен': { en: 'Profile updated', zh: '资料已更新' },
  'Пароль обновлен': { en: 'Password updated', zh: '密码已更新' },
  'Аватар обновлен': { en: 'Avatar updated', zh: '头像已更新' },
  'Заполните оба поля': { en: 'Fill in both fields', zh: '请填写两个字段' },
  'Имя пользователя': { en: 'Username', zh: '用户名' },
  'Имя': { en: 'First name', zh: '名字' },
  'Фамилия': { en: 'Last name', zh: '姓氏' },
  'О себе': { en: 'About', zh: '关于我' },
  'Email': { en: 'Email', zh: '电子邮箱' },
  'Роль в команде': { en: 'Role in team', zh: '团队角色' },
  'День рождения': { en: 'Birthday', zh: '生日' },
  'В системе с': { en: 'Member since', zh: '加入时间' },
  'Сохранить': { en: 'Save', zh: '保存' },
  'Пароль': { en: 'Password', zh: '密码' },
  'Изменить пароль': { en: 'Change password', zh: '修改密码' },
  'Активные проекты': { en: 'Active projects', zh: '活跃项目' },
  '+ Новый': { en: '+ New', zh: '+ 新建' },
  'Пока нет активных проектов.': { en: 'No active projects yet.', zh: '暂无活跃项目。' },
  'Открыть': { en: 'Open', zh: '打开' },
  'Не указано': { en: 'Not specified', zh: '未填写' },
  'Не указан': { en: 'Not specified', zh: '未填写' },
  'Участник': { en: 'Member', zh: '成员' },
  'в сети': { en: 'online', zh: '在线' },
  'Смена пароля': { en: 'Change password', zh: '修改密码' },
  'Текущий пароль': { en: 'Current password', zh: '当前密码' },
  'Новый пароль': { en: 'New password', zh: '新密码' },
  'Выберите аватар': { en: 'Choose avatar', zh: '选择头像' },
  'Готово': { en: 'Done', zh: '完成' },
  'Быстрые ответы': { en: 'Quick answers', zh: '快速解答' },
  'Как создать проект?': { en: 'How to create a project?', zh: '如何创建项目？' },
  'Как добавить маркер?': { en: 'How to add a marker?', zh: '如何添加标记？' },
  'Как поделиться заметками?': { en: 'How to share notes?', zh: '如何分享备注？' },
  'Контакты': { en: 'Contacts', zh: '联系方式' },
  'Что-то пошло не так.': { en: 'Something went wrong.', zh: '发生错误。' },
  'Перезагрузить': { en: 'Reload', zh: '重新加载' },
  'Загрузка…': { en: 'Loading…', zh: '加载中…' },
  'Навигация': { en: 'Navigation', zh: '导航' },
  'С возвращением!': { en: 'Welcome back!', zh: '欢迎回来！' },
  'Аккаунт создан!': { en: 'Account created!', zh: '账号已创建！' },
  'Не удалось войти': { en: 'Failed to sign in', zh: '登录失败' },
  'Не удалось зарегистрироваться': { en: 'Registration failed', zh: '注册失败' },
  'Проект создан': { en: 'Project created', zh: '项目已创建' },
  'Проект удален': { en: 'Project deleted', zh: '项目已删除' },
  'Не удалось загрузить проекты': { en: 'Failed to load projects', zh: '加载项目失败' },
  'Не удалось создать проект': { en: 'Failed to create project', zh: '创建项目失败' },
  'Не удалось удалить проект': { en: 'Failed to delete project', zh: '删除项目失败' },
  'Локальные настройки очищены': { en: 'Local settings cleared', zh: '本地设置已清除' },
  'API URL': { en: 'API URL', zh: 'API 地址' },
  'Светлая': { en: 'light', zh: '浅色' },
  'Тёмная': { en: 'dark', zh: '深色' },
  'К проектам': { en: 'To projects', zh: '返回项目' },
  'Изм.': { en: 'Edit', zh: '编辑' },
  'SyncHub • AV Pipeline': { en: 'SyncHub • AV Pipeline', zh: 'SyncHub • AV 工作流' },
  'Скопировать имя пользователя': { en: 'Copy username', zh: '复制用户名' },
  'Скопировать email': { en: 'Copy email', zh: '复制邮箱' },
  '{date} ({age} лет)': { en: '{date} ({age} years)', zh: '{date}（{age}岁）' },
  '{count} участников': { en: '{count} members', zh: '{count} 位成员' },
  '{count} участников · {deadline}': { en: '{count} members · {deadline}', zh: '{count} 位成员 · {deadline}' },
  'Поле «{label}» пустое': { en: 'Field “{label}” is empty', zh: '字段“{label}”为空' },
  '«{label}» скопировано': { en: '“{label}” copied', zh: '“{label}”已复制' },
  'Не удалось скопировать': { en: 'Failed to copy', zh: '复制失败' },
  'Не удалось обновить профиль': { en: 'Failed to update profile', zh: '更新资料失败' },
  'Не удалось обновить пароль': { en: 'Failed to update password', zh: '更新密码失败' },
  'Не удалось обновить аватар': { en: 'Failed to update avatar', zh: '更新头像失败' },
  'Обновлён {value}': { en: 'Updated {value}', zh: '{value} 更新' },
  '{count} дн. назад': { en: '{count} d ago', zh: '{count}天前' },
  '{count} ч. назад': { en: '{count} h ago', zh: '{count}小时前' },
  'только что': { en: 'just now', zh: '刚刚' },
  'Участники': { en: 'Members', zh: '成员' },
  'Медиафайлы': { en: 'Media files', zh: '媒体文件' },
  'Правки': { en: 'Edits', zh: '修改' },
  'Участники: {count}': { en: 'Members: {count}', zh: '成员：{count}' },
  'Медиафайлы: {count}': { en: 'Media files: {count}', zh: '媒体文件：{count}' },
  'Новые правки: {count}': { en: 'New edits: {count}', zh: '新修改：{count}' },
  'Создать проект': { en: 'Create project', zh: '创建项目' },
  'Проект «{name}» будет удален без возможности восстановления.': {
    en: 'Project “{name}” will be deleted permanently.',
    zh: '项目“{name}”将被永久删除。'
  },
  'Развернуть нижнюю панель': { en: 'Expand bottom bar', zh: '展开底部导航' },
  'Свернуть нижнюю панель': { en: 'Collapse bottom bar', zh: '收起底部导航' },
  'Закрыть': { en: 'Close', zh: '关闭' },
  'Неизвестная ошибка': { en: 'Unknown error', zh: '未知错误' },
  'Ошибка: {message}': { en: 'Error: {message}', zh: '错误：{message}' },
  'Действие: {value}': { en: 'Action: {value}', zh: '操作：{value}' },
  'Поле: {value}': { en: 'Field: {value}', zh: '字段：{value}' },
  'Поле ввода': { en: 'Input field', zh: '输入字段' },
  'Откройте раздел «Проекты» и нажмите «Создать новый проект». Заполните название и дедлайн.': {
    en: 'Open “Projects” and click “Create new project”. Fill in name and deadline.',
    zh: '打开“项目”并点击“创建新项目”。填写名称和截止日期。'
  },
  'Внутри проекта выберите вкладку и нажмите «Добавить маркер». Он сохранится в таймлайне.': {
    en: 'Inside a project, choose a tab and click “Add marker”. It will be saved to the timeline.',
    zh: '在项目内选择标签并点击“添加标记”，它会保存到时间线。'
  },
  'В режиссёрской вкладке нажмите «Поделиться с командой» — текст копируется в буфер.': {
    en: 'In the director tab, click “Share with team” to copy text to clipboard.',
    zh: '在导演标签页点击“与团队分享”，文本会复制到剪贴板。'
  },
  'Если что-то не работает, проверьте, запущен ли сервер (порт 5000) и клиент (порт 5173).': {
    en: 'If something does not work, check that server (5000) and client (5173) are running.',
    zh: '如果出现问题，请检查服务端（5000）和客户端（5173）是否已启动。'
  },
  'Для отчета по диплому можно сделать экспорт проекта через кнопку «Экспорт».': {
    en: 'For a thesis report, you can export the project with the “Export” button.',
    zh: '用于毕业报告时，可通过“导出”按钮导出项目。'
  },
  'Создать аккаунт SyncHub': { en: 'Create SyncHub account', zh: '创建 SyncHub 账号' },
  'Общие сведения': { en: 'General info', zh: '基本信息' },
  'Создайте никнейм': { en: 'Create a nickname', zh: '创建昵称' },
  'Придумайте пароль': { en: 'Create a password', zh: '设置密码' },
  'Введите своё имя': { en: 'Enter your name', zh: '输入你的姓名' },
  'Укажите свою дату рождения и пол': { en: 'Set your birth date and gender', zh: '填写生日和性别' },
  'Укажите уникальное имя пользователя': { en: 'Set a unique username', zh: '设置唯一用户名' },
  'Введите и повторите пароль': { en: 'Enter and repeat password', zh: '输入并重复密码' },
  'Введите название проекта': { en: 'Enter project name', zh: '输入项目名称' },
  'Фамилия (необязательно)': { en: 'Last name (optional)', zh: '姓氏（可选）' },
  'День': { en: 'Day', zh: '日' },
  'Месяц': { en: 'Month', zh: '月' },
  'Год': { en: 'Year', zh: '年' },
  'Январь': { en: 'January', zh: '一月' },
  'Февраль': { en: 'February', zh: '二月' },
  'Март': { en: 'March', zh: '三月' },
  'Апрель': { en: 'April', zh: '四月' },
  'Май': { en: 'May', zh: '五月' },
  'Июнь': { en: 'June', zh: '六月' },
  'Июль': { en: 'July', zh: '七月' },
  'Август': { en: 'August', zh: '八月' },
  'Сентябрь': { en: 'September', zh: '九月' },
  'Октябрь': { en: 'October', zh: '十月' },
  'Ноябрь': { en: 'November', zh: '十一月' },
  'Декабрь': { en: 'December', zh: '十二月' },
  'Не выбирать': { en: 'Do not choose', zh: '不选择' },
  'Мужской': { en: 'Male', zh: '男' },
  'Женский': { en: 'Female', zh: '女' },
  'Никнейм': { en: 'Nickname', zh: '昵称' },
  'Повторите пароль': { en: 'Repeat password', zh: '重复密码' },
  'Создаём...': { en: 'Creating...', zh: '创建中...' },
  'Далее': { en: 'Next', zh: '下一步' },
  'Режиссёр': { en: 'Director', zh: '导演' },
  'Сценарист': { en: 'Screenwriter', zh: '编剧' },
  'Монтажёр': { en: 'Editor', zh: '剪辑师' },
  'Композитор': { en: 'Composer', zh: '作曲' },
  'Костюмер': { en: 'Costume designer', zh: '服装师' },
  'Визажист': { en: 'Makeup artist', zh: '化妆师' },
  'Оператор': { en: 'Cinematographer', zh: '摄影师' }
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const replaceParams = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.split(`{${key}}`).join(String(value))
  }, template)
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AppLanguage | null
    if (stored === 'ru' || stored === 'en' || stored === 'zh') return stored
    return 'ru'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next)
  }

  const t = (source: string, params?: Record<string, string | number>) => {
    if (language === 'ru') return replaceParams(source, params)
    const translation = dictionary[source]?.[language] || source
    return replaceParams(translation, params)
  }

  const value = useMemo(() => ({ language, setLanguage, t }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider')
  }
  return context
}
