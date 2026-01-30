import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../Header/Header';
import './Project.css';
import { projectsApi } from '../../api/projects';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import type { BodyMarker, Location, MediaFile, Project, ProjectComment, ProjectMarker, TabType } from '../../types';

// Импорт иконок
import PlayIcon from '../assets/icons/play.svg';
import PauseIcon from '../assets/icons/pause.svg';
import AudioIcon from '../assets/icons/audio.svg';
import VideoIcon from '../assets/icons/video.svg';
import UploadIcon from '../assets/icons/import.svg';
import MarkerIcon from '../assets/icons/marker.svg';
import AddMarkerIcon from '../assets/icons/add_marker.svg';
import AddCommentIcon from '../assets/icons/add_comment.svg';
import BackToProjectIcon from '../assets/icons/backtoproject.svg';
import PreviewIcon from '../assets/icons/preview.svg';
import DirectorIcon from '../assets/icons/director.svg';
import MakeupIcon from '../assets/icons/makeup.svg';
import ScenarioIcon from '../assets/icons/scenario.svg';
import ReplyIcon from '../assets/icons/comments.svg';
import CostumesIcon from '../assets/icons/costumes.svg';
import HumanSilhouette from '../assets/icons/human.svg';

const tabColors: Record<TabType, string> = {
  script: '#9C27B0',
  director: '#2196F3',
  costumes: '#FF9800',
  makeup: '#E91E63',
  edit: '#FF391A'
};

const tabNames: Record<TabType, string> = {
  script: 'Сценарий',
  director: 'Режиссерская',
  costumes: 'Костюмы',
  makeup: 'Визаж',
  edit: 'Монтаж'
};

const iconMap: Record<string, string> = {
  director: DirectorIcon,
  script: ScenarioIcon,
  makeup: MakeupIcon,
  costumes: CostumesIcon,
  edit: MarkerIcon
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTimeInput = (value: string) => {
  if (!value) return NaN;
  if (value.includes(':')) {
    const [mins, secs] = value.split(':').map((part) => Number(part));
    if (Number.isNaN(mins) || Number.isNaN(secs)) return NaN;
    return mins * 60 + secs;
  }
  return Number(value);
};

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [showAllMarkers, setShowAllMarkers] = useState(true);
  const [scriptText, setScriptText] = useState('');
  const [directorNotes, setDirectorNotes] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerTitle, setMarkerTitle] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTab, setCommentTab] = useState<TabType>('edit');
  const [commentText, setCommentText] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationDraft, setLocationDraft] = useState({ name: '', description: '' });
  const [showShotModal, setShowShotModal] = useState(false);
  const [shotDraft, setShotDraft] = useState({ time: '', title: '', description: '' });
  const [shotLocationId, setShotLocationId] = useState<number | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaDraft, setMediaDraft] = useState({ name: '', type: 'video', duration: '', size: '' });
  const [showDocModal, setShowDocModal] = useState(false);
  const [docDraft, setDocDraft] = useState({ name: '', size: '', uploadedBy: '' });
  const [showBodyMarkerModal, setShowBodyMarkerModal] = useState(false);
  const [bodyMarkerDraft, setBodyMarkerDraft] = useState({
    title: '',
    description: '',
    bodyPart: '',
    x: 50,
    y: 50,
    tabId: 'costumes' as TabType
  });
  const [bodyMarkerEditId, setBodyMarkerEditId] = useState<number | null>(null);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ name: '', description: '', deadline: '' });

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await projectsApi.get(id);
        setProject(response.project);
        setScriptText(response.project.scriptText || '');
        setDirectorNotes(response.project.directorNotes || '');
        setProjectDraft({
          name: response.project.name || '',
          description: response.project.description || '',
          deadline: response.project.deadline || ''
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось загрузить проект';
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [id, showToast]);

  useEffect(() => {
    if (project) {
      setProjectDraft({
        name: project.name || '',
        description: project.description || '',
        deadline: project.deadline || ''
      });
    }
  }, [project]);

  const saveProject = async (patch: Partial<Project>) => {
    if (!project) return;
    try {
      const response = await projectsApi.update(project.id, patch);
      setProject(response.project);
      return response.project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить изменения';
      showToast(message, 'error');
    }
  };

  const markers = project?.markers || [];
  const bodyMarkers = project?.bodyMarkers || [];
  const locations = project?.locations || [];
  const mediaFiles = project?.mediaFiles || [];
  const documents = project?.documents || [];
  const comments = project?.comments || [];

  const filteredMarkers = showAllMarkers
    ? markers
    : markers.filter((marker) => marker.tabId === activeTab);

  const resolveMarkerIcon = (marker: ProjectMarker) => {
    return iconMap[marker.icon] || MarkerIcon;
  };

  const handlePlayPause = () => setIsPlaying((prev) => !prev);

  const handleCreateMarker = async () => {
    if (!project) return;
    const title = markerTitle.trim() || `Маркер ${markers.length + 1}`;
    const newMarker: ProjectMarker = {
      id: markers.length + 1,
      time: currentTime,
      color: tabColors[activeTab],
      title,
      user: 'Вы',
      icon: activeTab,
      tabId: activeTab
    };
    const updatedMarkers = [...markers, newMarker];
    setMarkerTitle('');
    setShowMarkerModal(false);
    await saveProject({ markers: updatedMarkers });
    showToast('Маркер добавлен', 'success');
  };

  const handleTimelineClick = (time: number) => {
    setCurrentTime(time);
  };

  const handleFormatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setScriptText(editorRef.current.innerHTML);
    }
  };

  const handleSaveScript = async () => {
    await saveProject({ scriptText });
    showToast('Сценарий сохранен', 'success');
  };

  const handleAddMarkerToText = async () => {
    const markerLabel = `[Маркер: ${tabNames[activeTab]} / ${formatTime(currentTime)}]`;
    const nextText = `${scriptText}\n\n${markerLabel}`;
    setScriptText(nextText);
    await saveProject({ scriptText: nextText });
    showToast('Маркер добавлен в текст', 'success');
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      showToast('Введите текст комментария', 'error');
      return;
    }
    const newComment: ProjectComment = {
      id: comments.length + 1,
      tabId: commentTab,
      user: 'Вы',
      text: commentText.trim(),
      timestamp: new Date().toLocaleString('ru-RU'),
      resolved: false
    };
    setCommentText('');
    setShowCommentModal(false);
    await saveProject({ comments: [...comments, newComment] });
    showToast('Комментарий добавлен', 'success');
  };

  const openCommentModal = (tabId: TabType) => {
    setCommentTab(tabId);
    setCommentText('');
    setShowCommentModal(true);
  };

  const handleToggleResolved = async (commentId: number) => {
    const updated = comments.map((comment) =>
      comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment
    );
    await saveProject({ comments: updated });
  };

  const handleAddLocation = async () => {
    if (!locationDraft.name.trim()) {
      showToast('Введите название локации', 'error');
      return;
    }
    const newLocation: Location = {
      id: locations.length + 1,
      name: locationDraft.name.trim(),
      description: locationDraft.description.trim(),
      shots: []
    };
    setLocationDraft({ name: '', description: '' });
    setShowLocationModal(false);
    await saveProject({ locations: [...locations, newLocation] });
    showToast('Локация добавлена', 'success');
  };

  const handleAddShot = async () => {
    if (!shotLocationId) return;
    if (!shotDraft.title.trim()) {
      showToast('Введите название кадра', 'error');
      return;
    }
    const locationIndex = locations.findIndex((location) => location.id === shotLocationId);
    if (locationIndex === -1) return;
    const parsedTime = parseTimeInput(shotDraft.time);
    const time = Number.isNaN(parsedTime) ? currentTime : parsedTime;
    const updatedLocations = [...locations];
    const newShot = {
      id: Date.now(),
      time,
      title: shotDraft.title.trim(),
      description: shotDraft.description.trim(),
      image: ''
    };
    updatedLocations[locationIndex] = {
      ...updatedLocations[locationIndex],
      shots: [...updatedLocations[locationIndex].shots, newShot]
    };
    setShotDraft({ time: '', title: '', description: '' });
    setShowShotModal(false);
    await saveProject({ locations: updatedLocations });
    showToast('Кадр добавлен', 'success');
  };

  const handleSaveNotes = async () => {
    await saveProject({ directorNotes });
    showToast('Заметки сохранены', 'success');
  };

  const handleShareNotes = async () => {
    try {
      await navigator.clipboard.writeText(directorNotes || '');
      showToast('Заметки скопированы в буфер', 'success');
    } catch {
      showToast('Не удалось скопировать заметки', 'error');
    }
  };

  const handleAddBodyMarker = async () => {
    if (!bodyMarkerDraft.title.trim()) {
      showToast('Введите название маркера', 'error');
      return;
    }
    let updatedMarkers: BodyMarker[] = [];
    if (bodyMarkerEditId) {
      updatedMarkers = bodyMarkers.map((marker) =>
        marker.id === bodyMarkerEditId
          ? {
              ...marker,
              title: bodyMarkerDraft.title.trim(),
              description: bodyMarkerDraft.description.trim(),
              bodyPart: bodyMarkerDraft.bodyPart || marker.bodyPart,
              x: bodyMarkerDraft.x,
              y: bodyMarkerDraft.y,
              tabId: bodyMarkerDraft.tabId,
              color: tabColors[bodyMarkerDraft.tabId]
            }
          : marker
      );
    } else {
      const newMarker: BodyMarker = {
        id: bodyMarkers.length + 1,
        x: bodyMarkerDraft.x,
        y: bodyMarkerDraft.y,
        title: bodyMarkerDraft.title.trim(),
        description: bodyMarkerDraft.description.trim(),
        bodyPart: bodyMarkerDraft.bodyPart || 'torso',
        images: [],
        comments: [],
        color: tabColors[bodyMarkerDraft.tabId],
        tabId: bodyMarkerDraft.tabId
      };
      updatedMarkers = [...bodyMarkers, newMarker];
    }
    setShowBodyMarkerModal(false);
    setBodyMarkerDraft({ title: '', description: '', bodyPart: '', x: 50, y: 50, tabId: bodyMarkerDraft.tabId });
    const wasEditing = Boolean(bodyMarkerEditId);
    setBodyMarkerEditId(null);
    await saveProject({ bodyMarkers: updatedMarkers });
    showToast(wasEditing ? 'Маркер обновлен' : 'Маркер добавлен', 'success');
  };

  const handleAddBodyImage = async (markerId: number) => {
    const url = window.prompt('Вставьте ссылку на изображение');
    if (!url) return;
    const updated = bodyMarkers.map((marker) =>
      marker.id === markerId ? { ...marker, images: [...marker.images, url] } : marker
    );
    await saveProject({ bodyMarkers: updated });
    showToast('Изображение добавлено', 'success');
  };

  const handleAddMedia = async () => {
    if (!mediaDraft.name.trim()) {
      showToast('Введите название файла', 'error');
      return;
    }
    const newMedia: MediaFile = {
      id: mediaFiles.length + 1,
      name: mediaDraft.name.trim(),
      type: mediaDraft.type as MediaFile['type'],
      duration: mediaDraft.duration || '0:00',
      size: mediaDraft.size || '—'
    };
    setMediaDraft({ name: '', type: 'video', duration: '', size: '' });
    setShowMediaModal(false);
    await saveProject({ mediaFiles: [...mediaFiles, newMedia] });
    showToast('Медиафайл добавлен', 'success');
  };

  const handleAddDocument = async () => {
    if (!docDraft.name.trim()) {
      showToast('Введите название документа', 'error');
      return;
    }
    const newDoc = {
      id: documents.length + 1,
      name: docDraft.name.trim(),
      size: docDraft.size || '—',
      uploadedBy: docDraft.uploadedBy || 'Вы',
      uploadedAt: new Intl.DateTimeFormat('ru-RU').format(new Date()),
      type: 'script'
    };
    setDocDraft({ name: '', size: '', uploadedBy: '' });
    setShowDocModal(false);
    await saveProject({ documents: [...documents, newDoc] });
    showToast('Документ добавлен', 'success');
  };

  const handleExport = async () => {
    if (!project) return;
    try {
      const response = await projectsApi.exportProject(project.id);
      const blob = new Blob([JSON.stringify(response.project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `synchub-${project.name}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Экспорт готов', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось экспортировать проект';
      showToast(message, 'error');
    }
  };

  const handleSaveProjectSettings = async () => {
    if (!projectDraft.name.trim()) {
      showToast('Название проекта обязательно', 'error');
      return;
    }
    await saveProject({
      name: projectDraft.name.trim(),
      description: projectDraft.description.trim(),
      deadline: projectDraft.deadline
    });
    setShowProjectSettings(false);
    showToast('Настройки проекта сохранены', 'success');
  };

  const timelineDuration = 205;

  const commentsByTab = useMemo(() => {
    return comments.reduce<Record<TabType, ProjectComment[]>>(
      (acc, comment) => {
        acc[comment.tabId] = [...(acc[comment.tabId] || []), comment];
        return acc;
      },
      { edit: [], script: [], director: [], costumes: [], makeup: [] }
    );
  }, [comments]);

  if (loading) {
    return (
      <div className="project-page">
        <div className="page-loading">
          <div className="loading-spinner" />
          Загружаем проект…
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-page">
        <div className="empty-state">Проект не найден.</div>
      </div>
    );
  }

  return (
    <div className="project-page">
      <Header
        title={project.name}
        subtitle={`ID: ${project.id}`}
        showBackButton={true}
        backButtonText="К проектам"
        backButtonPath="/dashboard"
        backButtonIcon={BackToProjectIcon}
        showHomeButton={true}
        showUserInfo={false}
        showExportButton={true}
        showSettingsButton={true}
        showLogoutButton={false}
        teamCount={Array.isArray(project.members) ? project.members.length : 0}
        onExportClick={handleExport}
        onSettingsClick={() => setShowProjectSettings(true)}
      />

      <div className="timeline-section">
        <div className="timeline-controls">
          <button className="play-btn" onClick={handlePlayPause}>
            <img
              src={isPlaying ? PauseIcon : PlayIcon}
              alt={isPlaying ? 'Пауза' : 'Воспроизвести'}
              className="play-icon"
            />
          </button>
          <span className="time-display">
            {formatTime(currentTime)} / 3:25
          </span>

          <div className="markers-filter">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={showAllMarkers}
                onChange={(e) => setShowAllMarkers(e.target.checked)}
              />
              <span>Показать все маркеры</span>
            </label>
          </div>
        </div>

        <div className="timeline-container">
          <div className="timeline-bar">
            {filteredMarkers.map((marker) => (
              <div
                key={marker.id}
                className="timeline-marker"
                style={{
                  left: `${(marker.time / timelineDuration) * 100}%`,
                  backgroundColor: marker.color
                }}
                title={`${marker.title} (${marker.user}) - ${tabNames[marker.tabId]}`}
                onClick={() => handleTimelineClick(marker.time)}
              >
                <img src={resolveMarkerIcon(marker)} alt={marker.user} className="marker-icon" />
              </div>
            ))}

            <div className="timeline-cursor" style={{ left: `${(currentTime / timelineDuration) * 100}%` }} />

            <div
              className="timeline-click-area"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPosition = e.clientX - rect.left;
                const percentage = clickPosition / rect.width;
                const newTime = Math.floor(percentage * timelineDuration);
                handleTimelineClick(newTime);
              }}
            />
          </div>

          <div className="timeline-markers-labels">
            {[0, 30, 60, 90, 120, 150, 180, timelineDuration].map((time) => (
              <div key={time} className="timeline-label">
                {formatTime(time)}
              </div>
            ))}
          </div>
        </div>

        <div className="timeline-footer">
          <button className="add-marker-btn" onClick={() => { setMarkerTitle(''); setShowMarkerModal(true); }}>
            <img src={AddMarkerIcon} alt="Добавить маркер" className="add-marker-icon" />
            Добавить маркер для {tabNames[activeTab]}
          </button>

          <div className="markers-legend">
            <div className="legend-title">Легенда:</div>
            {(Object.keys(tabNames) as TabType[]).map((tabId) => (
              <div key={tabId} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: tabColors[tabId] }} />
                <span>{tabNames[tabId]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs-section">
        <div className="tabs-header">
          {(['script', 'director', 'costumes', 'makeup', 'edit'] as TabType[]).map((tabId) => (
            <button
              key={tabId}
              className={`tab-btn ${activeTab === tabId ? 'active' : ''}`}
              onClick={() => setActiveTab(tabId)}
              style={{ borderBottomColor: activeTab === tabId ? tabColors[tabId] : 'transparent' }}
            >
              {tabNames[tabId]}
              {tabId === 'director' && <span className="notification-badge">2</span>}
            </button>
          ))}
        </div>

        <div className="tabs-content">
          {activeTab === 'script' && (
            <div className="tab-content script-tab">
              <div className="script-container">
                <div className="script-editor-section">
                  <h3>Текстовый редактор сценария</h3>
                  <div className="text-editor-toolbar">
                    <button className="toolbar-btn" onClick={() => handleFormatText('bold')} title="Жирный">
                      <strong>B</strong>
                    </button>
                    <button className="toolbar-btn" onClick={() => handleFormatText('italic')} title="Курсив">
                      <em>I</em>
                    </button>
                    <button className="toolbar-btn" onClick={() => handleFormatText('formatBlock', '<h1>')} title="Заголовок 1">
                      H1
                    </button>
                    <button className="toolbar-btn" onClick={() => handleFormatText('formatBlock', '<h2>')} title="Заголовок 2">
                      H2
                    </button>
                    <button className="toolbar-btn" onClick={() => handleFormatText('insertUnorderedList')} title="Маркированный список">
                      • List
                    </button>
                    <button className="toolbar-btn" onClick={() => handleFormatText('insertOrderedList')} title="Нумерованный список">
                      1. List
                    </button>
                    <button className="toolbar-btn" onClick={() => handleFormatText('underline')} title="Подчеркивание">
                      <u>U</u>
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    className="text-editor-content"
                    contentEditable
                    onInput={handleEditorInput}
                    dangerouslySetInnerHTML={{ __html: scriptText }}
                  />
                  <div className="editor-actions">
                    <button className="save-btn" onClick={handleSaveScript}>Сохранить</button>
                    <button className="add-marker-text-btn" onClick={handleAddMarkerToText}>
                      <img src={AddMarkerIcon} alt="Маркер" />
                      Добавить маркер в текст
                    </button>
                  </div>
                </div>

                <div className="script-documents-section">
                  <h3>Загруженные документы</h3>
                  <div className="documents-list">
                    {documents.length === 0 && <div className="empty-state">Документов пока нет.</div>}
                    {documents.map((document) => (
                      <div key={document.id} className="document-item">
                        <div className="document-icon">📄</div>
                        <div className="document-info">
                          <div className="document-name">{document.name}</div>
                          <div className="document-meta">
                            <span>{document.size}</span>
                            <span>{document.uploadedBy}</span>
                            <span>{document.uploadedAt}</span>
                          </div>
                        </div>
                        <button className="preview-doc-btn" onClick={() => showToast('Предпросмотр в разработке', 'info')}>
                          Просмотр
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="upload-doc-btn" onClick={() => setShowDocModal(true)}>
                    <img src={UploadIcon} alt="Загрузить" />
                    Загрузить документ
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'director' && (
            <div className="tab-content director-tab">
              <div className="director-container">
                <div className="locations-section">
                  <h3>Локации и раскадровки</h3>
                  <div className="locations-list">
                    {locations.map((location) => (
                      <div key={location.id} className="location-card">
                        <div className="location-header">
                          <h4>{location.name}</h4>
                          <span className="shots-count">{location.shots.length} кадров</span>
                        </div>
                        <div className="location-description">{location.description}</div>
                        <div className="shots-timeline">
                          {location.shots.map((shot) => (
                            <div key={shot.id} className="shot-item">
                              <div className="shot-time">{formatTime(shot.time)}</div>
                              <div className="shot-content">
                                <div className="shot-title">{shot.title}</div>
                                <div className="shot-description">{shot.description}</div>
                                <div className="shot-image-placeholder">
                                  {shot.image ? (
                                    <img src={shot.image} alt={shot.title} />
                                  ) : (
                                    <div className="placeholder-text">Изображение раскадровки</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          className="add-shot-btn"
                          onClick={() => {
                            setShotLocationId(location.id);
                            setShowShotModal(true);
                          }}
                        >
                          + Добавить кадр
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="add-location-btn" onClick={() => setShowLocationModal(true)}>
                    <img src={AddMarkerIcon} alt="Добавить" />
                    Добавить локацию
                  </button>
                </div>

                <div className="director-notes-section">
                  <h3>Заметки режиссера</h3>
                  <textarea
                    className="director-notes-editor"
                    placeholder="Ваши заметки и идеи по съемке..."
                    rows={8}
                    value={directorNotes}
                    onChange={(e) => setDirectorNotes(e.target.value)}
                  />
                  <div className="notes-actions">
                    <button className="save-notes-btn" onClick={handleSaveNotes}>Сохранить заметки</button>
                    <button className="share-notes-btn" onClick={handleShareNotes}>Поделиться с командой</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costumes' && (
            <div className="tab-content costumes-tab">
              <div className="costumes-container">
                <div className="markers-list-section">
                  <h3>Маркеры костюмов</h3>
                  <div className="markers-description-list">
                    {bodyMarkers.filter((marker) => marker.tabId === 'costumes').map((marker) => (
                      <div key={marker.id} className="marker-description-card">
                        <div className="marker-header">
                          <div className="marker-color" style={{ backgroundColor: marker.color }} />
                          <div className="marker-title">{marker.title}</div>
                          <button
                            className="edit-marker-btn"
                            onClick={() => {
                              setBodyMarkerDraft({
                                title: marker.title,
                                description: marker.description,
                                bodyPart: marker.bodyPart,
                                x: marker.x,
                                y: marker.y,
                                tabId: marker.tabId
                              });
                              setBodyMarkerEditId(marker.id);
                              setShowBodyMarkerModal(true);
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                        <div className="marker-body-part">Часть тела: {marker.bodyPart}</div>
                        <div className="marker-description">{marker.description}</div>
                        <div className="marker-images">
                          {marker.images.length === 0 ? (
                            <button className="add-image-btn" onClick={() => handleAddBodyImage(marker.id)}>
                              <img src={UploadIcon} alt="Загрузить" />
                              Загрузить изображение
                            </button>
                          ) : (
                            <div className="images-preview">
                              {marker.images.map((image, index) => (
                                <img key={`${marker.id}-${index}`} src={image} alt={marker.title} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="add-description-btn"
                    onClick={() => {
                      setBodyMarkerDraft({ title: '', description: '', bodyPart: '', x: 50, y: 50, tabId: 'costumes' });
                      setBodyMarkerEditId(null);
                      setShowBodyMarkerModal(true);
                    }}
                  >
                    <img src={AddMarkerIcon} alt="Добавить" />
                    Добавить описание маркера
                  </button>
                </div>

                <div className="human-silhouette-section">
                  <h3>Силуэт человека</h3>
                  <div className="silhouette-container">
                    <div
                      className="silhouette-wrapper"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setBodyMarkerDraft({ title: '', description: '', bodyPart: 'torso', x, y, tabId: 'costumes' });
                        setBodyMarkerEditId(null);
                        setShowBodyMarkerModal(true);
                      }}
                    >
                      <img src={HumanSilhouette} alt="Силуэт человека" className="human-silhouette-img" />
                      {bodyMarkers.filter((marker) => marker.tabId === 'costumes').map((marker) => (
                        <div
                          key={marker.id}
                          className="body-marker"
                          style={{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: marker.color }}
                          title={marker.title}
                        >
                          <div className="marker-number">{marker.id}</div>
                          <div className="marker-tooltip">
                            <strong>{marker.title}</strong>
                            <div>{marker.bodyPart}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="silhouette-instructions">Кликните на силуэт, чтобы добавить маркер костюма</div>
                  </div>
                </div>

                <div className="costume-comments-section">
                  <h3>Комментарии к костюмам</h3>
                <div className="comments-list">
                  {commentsByTab.costumes.length === 0 && (
                    <div className="empty-state">Комментариев пока нет.</div>
                  )}
                  {commentsByTab.costumes.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <div className="user-badge" style={{ backgroundColor: '#FF9800' }}>
                            {comment.user}
                          </div>
                          <div className="comment-time">{comment.timestamp}</div>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-footer">
                          <span className="resolved-badge" onClick={() => handleToggleResolved(comment.id)}>
                            {comment.resolved ? 'Решено' : 'Не решено'}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('costumes')}>
                            <img src={ReplyIcon} alt="Ответить" />
                            Ответить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('costumes')}>
                    <img src={AddCommentIcon} alt="Добавить комментарий" />
                    Добавить комментарий
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'makeup' && (
            <div className="tab-content makeup-tab">
              <div className="makeup-container">
                <div className="markers-list-section">
                  <h3>Маркеры визажа</h3>
                  <div className="markers-description-list">
                    {bodyMarkers.filter((marker) => marker.tabId === 'makeup').map((marker) => (
                      <div key={marker.id} className="marker-description-card">
                        <div className="marker-header">
                          <div className="marker-color" style={{ backgroundColor: marker.color }} />
                          <div className="marker-title">{marker.title}</div>
                          <button
                            className="edit-marker-btn"
                            onClick={() => {
                              setBodyMarkerDraft({
                                title: marker.title,
                                description: marker.description,
                                bodyPart: marker.bodyPart,
                                x: marker.x,
                                y: marker.y,
                                tabId: marker.tabId
                              });
                              setBodyMarkerEditId(marker.id);
                              setShowBodyMarkerModal(true);
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                        <div className="marker-body-part">Часть тела: {marker.bodyPart}</div>
                        <div className="marker-description">{marker.description}</div>
                        <div className="marker-images">
                          {marker.images.length === 0 ? (
                            <button className="add-image-btn" onClick={() => handleAddBodyImage(marker.id)}>
                              <img src={UploadIcon} alt="Загрузить" />
                              Загрузить мокап
                            </button>
                          ) : (
                            <div className="images-preview">
                              {marker.images.map((image, index) => (
                                <img key={`${marker.id}-${index}`} src={image} alt={marker.title} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="add-description-btn"
                    onClick={() => {
                      setBodyMarkerDraft({ title: '', description: '', bodyPart: 'face', x: 50, y: 25, tabId: 'makeup' });
                      setBodyMarkerEditId(null);
                      setShowBodyMarkerModal(true);
                    }}
                  >
                    <img src={AddMarkerIcon} alt="Добавить" />
                    Добавить описание визажа
                  </button>
                </div>

                <div className="human-silhouette-section">
                  <h3>Силуэт для визажа</h3>
                  <div className="silhouette-container">
                    <div
                      className="silhouette-wrapper"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setBodyMarkerDraft({ title: '', description: '', bodyPart: 'face', x, y, tabId: 'makeup' });
                        setBodyMarkerEditId(null);
                        setShowBodyMarkerModal(true);
                      }}
                    >
                      <img src={HumanSilhouette} alt="Силуэт человека" className="human-silhouette-img" />
                      {bodyMarkers.filter((marker) => marker.tabId === 'makeup').map((marker) => (
                        <div
                          key={marker.id}
                          className="body-marker"
                          style={{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: marker.color }}
                        >
                          <div className="marker-number">{marker.id}</div>
                          <div className="marker-tooltip">
                            <strong>{marker.title}</strong>
                            <div>{marker.bodyPart}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="silhouette-instructions">Кликните на часть тела для добавления точки визажа</div>
                  </div>
                </div>

                <div className="makeup-comments-section">
                  <h3>Комментарии к визажу</h3>
                <div className="comments-list">
                  {commentsByTab.makeup.length === 0 && (
                    <div className="empty-state">Комментариев пока нет.</div>
                  )}
                  {commentsByTab.makeup.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <div className="user-badge" style={{ backgroundColor: '#E91E63' }}>
                            {comment.user}
                          </div>
                          <div className="comment-time">{comment.timestamp}</div>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-footer">
                          <span className="resolved-badge" onClick={() => handleToggleResolved(comment.id)}>
                            {comment.resolved ? 'Решено' : 'Не решено'}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('makeup')}>
                            <img src={ReplyIcon} alt="Ответить" />
                            Ответить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('makeup')}>
                    <img src={AddCommentIcon} alt="Добавить комментарий" />
                    Добавить комментарий
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="tab-content edit-tab">
              <div className="columns-container">
                <div className="column media-column">
                  <h3>Медиатека</h3>
                  <div className="media-list">
                    {mediaFiles.map((file) => (
                      <div key={file.id} className="media-item">
                        <div className="media-icon">
                          <img src={file.type === 'audio' ? AudioIcon : VideoIcon} alt={file.type} />
                        </div>
                        <div className="media-info">
                          <div className="media-name">{file.name}</div>
                          <div className="media-duration">{file.duration} • {file.size}</div>
                        </div>
                      </div>
                    ))}
                    {mediaFiles.length === 0 && <div className="empty-state">Медиафайлы отсутствуют.</div>}
                  </div>
                  <button className="upload-btn" onClick={() => setShowMediaModal(true)}>
                    <img src={UploadIcon} alt="Загрузить" className="upload-icon" />
                    Загрузить медиа
                  </button>
                </div>

                <div className="column preview-column">
                  <div className="video-preview">
                    <div className="placeholder-video">
                      <img src={PreviewIcon} alt="Предпросмотр" className="preview-icon" />
                      <div className="video-placeholder-text">Загрузите видео для предпросмотра</div>
                    </div>
                  </div>

                  <div className="waveform-placeholder">
                    <div className="waveform-title">WAVEFORM АУДИО</div>
                    <div className="waveform-visualization">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div
                          key={i}
                          className="waveform-bar"
                          style={{
                            height: `${20 + Math.sin(i * 0.3) * 20}px`,
                            backgroundColor: i % 10 === 0 ? '#FF391A' : '#50425B'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="column comments-column">
                  <h3>Комментарии к монтажу</h3>
                <div className="comments-list">
                  {commentsByTab.edit.length === 0 && (
                    <div className="empty-state">Комментариев пока нет.</div>
                  )}
                  {commentsByTab.edit.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <div className="user-badge" style={{ backgroundColor: '#FF391A' }}>
                            {comment.user}
                          </div>
                          <div className="comment-time">{comment.timestamp}</div>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-footer">
                          <span className="timestamp" onClick={() => handleToggleResolved(comment.id)}>
                            {comment.resolved ? 'Решено' : 'Не решено'}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('edit')}>
                            <img src={ReplyIcon} alt="Ответить" />
                            Ответить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('edit')}>
                    <img src={AddCommentIcon} alt="Добавить комментарий" className="add-comment-icon" />
                    Добавить комментарий
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="Новый маркер"
        isOpen={showMarkerModal}
        onClose={() => setShowMarkerModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowMarkerModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleCreateMarker}>
              Добавить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название маркера"
          value={markerTitle}
          onChange={(e) => setMarkerTitle(e.target.value)}
        />
        <div className="form-helper">Текущая позиция: {formatTime(currentTime)}</div>
      </Modal>

      <Modal
        title="Новый комментарий"
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setCommentText('');
        }}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowCommentModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleAddComment}>
              Добавить
            </button>
          </>
        }
      >
        <textarea
          className="form-input"
          placeholder="Введите комментарий"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={4}
        />
      </Modal>

      <Modal
        title="Новая локация"
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowLocationModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleAddLocation}>
              Добавить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название локации"
          value={locationDraft.name}
          onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder="Описание"
          rows={3}
          value={locationDraft.description}
          onChange={(e) => setLocationDraft({ ...locationDraft, description: e.target.value })}
        />
      </Modal>

      <Modal
        title="Новый кадр"
        isOpen={showShotModal}
        onClose={() => setShowShotModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowShotModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleAddShot}>
              Добавить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Время (сек или мм:сс)"
          value={shotDraft.time}
          onChange={(e) => setShotDraft({ ...shotDraft, time: e.target.value })}
        />
        <input
          className="form-input"
          placeholder="Название кадра"
          value={shotDraft.title}
          onChange={(e) => setShotDraft({ ...shotDraft, title: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder="Описание"
          rows={3}
          value={shotDraft.description}
          onChange={(e) => setShotDraft({ ...shotDraft, description: e.target.value })}
        />
      </Modal>

      <Modal
        title="Добавить медиа"
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowMediaModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleAddMedia}>
              Добавить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название файла"
          value={mediaDraft.name}
          onChange={(e) => setMediaDraft({ ...mediaDraft, name: e.target.value })}
        />
        <select
          className="form-input"
          value={mediaDraft.type}
          onChange={(e) => setMediaDraft({ ...mediaDraft, type: e.target.value })}
        >
          <option value="video">Видео</option>
          <option value="audio">Аудио</option>
          <option value="other">Другое</option>
        </select>
        <input
          className="form-input"
          placeholder="Длительность (например 1:45)"
          value={mediaDraft.duration}
          onChange={(e) => setMediaDraft({ ...mediaDraft, duration: e.target.value })}
        />
        <input
          className="form-input"
          placeholder="Размер файла (например 120 MB)"
          value={mediaDraft.size}
          onChange={(e) => setMediaDraft({ ...mediaDraft, size: e.target.value })}
        />
      </Modal>

      <Modal
        title="Добавить документ"
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowDocModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleAddDocument}>
              Добавить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название документа"
          value={docDraft.name}
          onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })}
        />
        <input
          className="form-input"
          placeholder="Размер"
          value={docDraft.size}
          onChange={(e) => setDocDraft({ ...docDraft, size: e.target.value })}
        />
        <input
          className="form-input"
          placeholder="Загрузил"
          value={docDraft.uploadedBy}
          onChange={(e) => setDocDraft({ ...docDraft, uploadedBy: e.target.value })}
        />
      </Modal>

      <Modal
        title="Маркер"
        isOpen={showBodyMarkerModal}
        onClose={() => {
          setShowBodyMarkerModal(false);
          setBodyMarkerEditId(null);
        }}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowBodyMarkerModal(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleAddBodyMarker}>
              Добавить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название"
          value={bodyMarkerDraft.title}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, title: e.target.value })}
        />
        <input
          className="form-input"
          placeholder="Часть тела"
          value={bodyMarkerDraft.bodyPart}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, bodyPart: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder="Описание"
          rows={3}
          value={bodyMarkerDraft.description}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, description: e.target.value })}
        />
      </Modal>

      <Modal
        title="Настройки проекта"
        isOpen={showProjectSettings}
        onClose={() => setShowProjectSettings(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowProjectSettings(false)}>
              Отмена
            </button>
            <button className="primary-btn" onClick={handleSaveProjectSettings}>
              Сохранить
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder="Название проекта"
          value={projectDraft.name}
          onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder="Описание"
          rows={3}
          value={projectDraft.description}
          onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })}
        />
        <input
          className="form-input"
          type="date"
          value={projectDraft.deadline}
          onChange={(e) => setProjectDraft({ ...projectDraft, deadline: e.target.value })}
        />
      </Modal>
    </div>
  );
};

export default ProjectPage;
