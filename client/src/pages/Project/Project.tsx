import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../Header/Header';
import './Project.css';
import { projectsApi } from '../../api/projects';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import Modal from '../../components/Modal';
import type {
  BodyMarker,
  BodySilhouette,
  DocumentFile,
  Location,
  MediaFile,
  Project,
  ProjectComment,
  ProjectMarker,
  ScriptParams,
  StoryboardCell,
  StoryboardGrid,
  TabType,
  Task,
  TaskStatus,
  TaskPriority
} from '../../types';

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
import FaceSilhouette from '../assets/icons/face.svg';
import ActionIcon from '../assets/icons/action.svg';
import ManagerIcon from '../assets/icons/edits.svg';

const tabColors: Record<TabType, string> = {
  script: '#9C27B0',
  director: '#2196F3',
  costumes: '#FF9800',
  makeup: '#E91E63',
  edit: '#FF391A',
  sound: '#06b6d4',
  manager: '#22c55e'
};

const tabNames: Record<TabType, string> = {
  script: 'Сценарий',
  director: 'Режиссерская',
  costumes: 'Костюмы',
  makeup: 'Визаж',
  edit: 'Монтаж',
  sound: 'Звук',
  manager: 'Менеджер'
};

const mobileTabs: Array<{ id: TabType; label: string; icon: string }> = [
  { id: 'script', label: 'Сценарий', icon: ScenarioIcon },
  { id: 'director', label: 'Режиссёр', icon: DirectorIcon },
  { id: 'costumes', label: 'Костюмер', icon: CostumesIcon },
  { id: 'makeup', label: 'Визажист', icon: MakeupIcon },
  { id: 'edit', label: 'Монтажер', icon: ActionIcon },
  { id: 'sound', label: 'Звукорежиссёр', icon: AudioIcon },
  { id: 'manager', label: 'Менеджер', icon: ManagerIcon }
];

const mobileTabAriaNames: Record<TabType, string> = {
  script: 'Scenario',
  director: 'Director',
  costumes: 'Costumes',
  makeup: 'Makeup',
  edit: 'Action',
  sound: 'Sound',
  manager: 'Manager'
};

const iconMap: Record<string, string> = {
  director: DirectorIcon,
  script: ScenarioIcon,
  makeup: MakeupIcon,
  costumes: CostumesIcon,
  edit: MarkerIcon,
  sound: AudioIcon,
  manager: ManagerIcon
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const DEFAULT_TIMELINE_DURATION = 205;

const normalizeTimelineDuration = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMELINE_DURATION;
  }
  return Math.max(1, Math.floor(parsed));
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

const sanitizeScriptHtml = (html: string) =>
  html
    // Remove hidden bidi-control chars that can flip typing direction.
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    // Strip rtl/auto dir attributes from pasted rich text.
    .replace(/\sdir=(['"]?)(rtl|auto)\1/gi, ' dir="ltr"')
    // Normalize inline direction styles.
    .replace(/direction\s*:\s*rtl\s*;?/gi, 'direction:ltr;')
    .replace(/unicode-bidi\s*:\s*[^;"']+\s*;?/gi, '');

const defaultScriptParams: ScriptParams = {
  scriptFile: null,
  actorsCount: 0, extraActorsCount: 0, childActorsCount: 0, animalsCount: 0,
  locationsCount: 0, exteriorScenesCount: 0, interiorScenesCount: 0,
  nightScenesCount: 0, shootingDaysCount: 0, totalDurationMin: 90,
  propsCount: 0, costumeSetsCount: 0, makeupLooksCount: 0,
  wigs: false, prosthetics: false,
  vfxShotsCount: 0, practicalEffectsCount: 0, stuntsCount: 0,
  weaponProps: false, pyrotechnics: false, rainScenes: false, snowScenes: false,
  vehiclesCount: 0, vehicleChases: false, droneShots: false,
  underwaterShots: false, aerialShots: false, craneShots: false,
  productionFormat: '4K', aspectRatio: '16:9', handheldStyle: false, steadicam: false,
  originalMusicTracks: 0, voiceOverPresent: false, silentScenes: false, musicGenre: '',
  genre: '', ageRating: '16+', targetAudience: '', dialogLanguage: 'Русский',
  subtitlesNeeded: false, weatherDependentDays: 0, hazardousConditions: false,
  internationalShoot: false, remoteLocations: false, militaryEquipment: false,
  logline: '', budgetTier: 'mid', colorGrading: 'Нейтральная'
};

const defaultStoryboardGrid: StoryboardGrid = { locationNames: [], columnCount: 4, cells: {} };

const compressImage = (file: File, maxW = 480, maxH = 320): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

const normalizeSilhouettes = (value: unknown): BodySilhouette[] => {
  if (!Array.isArray(value)) {
    return [{ id: 1, name: 'Человек 1' }];
  }

  const normalized = value
    .map((item: any, index) => {
      const rawId = Number(item?.id);
      const id = Number.isFinite(rawId) && rawId > 0 ? rawId : index + 1;
      const name = typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : `Человек ${index + 1}`;
      return { id, name };
    })
    .filter((item, index, arr) => arr.findIndex((target) => target.id === item.id) === index)
    .sort((a, b) => a.id - b.id);

  return normalized.length > 0 ? normalized : [{ id: 1, name: 'Человек 1' }];
};

const getMarkerPersonId = (marker: BodyMarker) => {
  const id = Number((marker as any).personId);
  return Number.isFinite(id) && id > 0 ? id : 1;
};

const getBodyMarkerTime = (marker: BodyMarker) => {
  const time = Number((marker as any).time);
  return Number.isFinite(time) && time >= 0 ? Math.floor(time) : 0;
};

type TimelineMarkerItem = ProjectMarker & { timelineKey: string };

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { t, language } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [showAllMarkers, setShowAllMarkers] = useState(true);
  const [, setScriptText] = useState('');
  const [initialScriptHtml, setInitialScriptHtml] = useState('');
  const [directorNotes, setDirectorNotes] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const timelineBarRef = useRef<HTMLDivElement>(null);

  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [markerTitle, setMarkerTitle] = useState('');
  const [markerComment, setMarkerComment] = useState('');
  const [showTimelineMarkerModal, setShowTimelineMarkerModal] = useState(false);
  const [selectedTimelineMarker, setSelectedTimelineMarker] = useState<ProjectMarker | null>(null);
  const [timelineDurationInput, setTimelineDurationInput] = useState('');
  const [pendingTimelineDuration, setPendingTimelineDuration] = useState<number | null>(null);
  const [showTimelineDurationConfirm, setShowTimelineDurationConfirm] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentTab, setCommentTab] = useState<TabType>('edit');
  const [commentText, setCommentText] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationDraft, setLocationDraft] = useState({ name: '', description: '' });
  const [showShotModal, setShowShotModal] = useState(false);
  const [shotDraft, setShotDraft] = useState({ time: '', title: '', description: '' });
  const [shotLocationId] = useState<number | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaDraft, setMediaDraft] = useState({ name: '', type: 'video', duration: '', size: '' });
  const [showDocModal, setShowDocModal] = useState(false);
  const [docDraft, setDocDraft] = useState({ name: '', size: '', uploadedBy: '' });
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [showBodyMarkerModal, setShowBodyMarkerModal] = useState(false);
  const [bodyMarkerDraft, setBodyMarkerDraft] = useState({
    title: '',
    description: '',
    bodyPart: '',
    time: '0:00',
    x: 50,
    y: 50,
    tabId: 'costumes' as TabType,
    personId: 1
  });
  const [bodyMarkerEditId, setBodyMarkerEditId] = useState<number | null>(null);
  const [pendingSilhouetteRemoval, setPendingSilhouetteRemoval] = useState<{
    personId: number;
    personName: string;
    relatedMarkersCount: number;
  } | null>(null);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ name: '', description: '', deadline: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilterStatus, setTaskFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [taskFilterDept, setTaskFilterDept] = useState<TabType | 'all'>('all');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDraft, setTaskDraft] = useState<{ title: string; description: string; status: TaskStatus; priority: TaskPriority; department: TabType; assignee: string; sceneRef: string }>({
    title: '', description: '', status: 'todo', priority: 'medium', department: 'edit', assignee: '', sceneRef: ''
  });
  const [taskEditId, setTaskEditId] = useState<string | null>(null);

  // Script params
  const scriptFileInputRef = useRef<HTMLInputElement>(null);
  const [scriptParams, setScriptParamsDraft] = useState<ScriptParams>(defaultScriptParams);

  // Storyboard grid
  const [storyboardGrid, setStoryboardGridLocal] = useState<StoryboardGrid>(defaultStoryboardGrid);
  const [cellEditorOpen, setCellEditorOpen] = useState(false);
  const [cellEditorRow, setCellEditorRow] = useState(0);
  const [cellEditorCol, setCellEditorCol] = useState(0);
  const [cellEditorDraft, setCellEditorDraft] = useState<StoryboardCell>({ description: '', imageUrl: '', shotType: '' });

  const normalizeProjectData = (rawProject: Project): Project => {
    const silhouettes = normalizeSilhouettes((rawProject as any).bodySilhouettes);
    const markersWithComment = Array.isArray(rawProject.markers)
      ? rawProject.markers.map((marker) => ({
          ...marker,
          comment:
            typeof (marker as any).comment === 'string' && (marker as any).comment.trim().length > 0
              ? (marker as any).comment.trim()
              : marker.title
        }))
      : [];
    const bodyMarkersWithPerson = Array.isArray(rawProject.bodyMarkers)
      ? rawProject.bodyMarkers.map((marker) => ({
          ...marker,
          time: getBodyMarkerTime(marker),
          personId: getMarkerPersonId(marker)
        }))
      : [];
    return {
      ...rawProject,
      timelineDuration: normalizeTimelineDuration((rawProject as any).timelineDuration),
      markers: markersWithComment,
      bodyMarkers: bodyMarkersWithPerson,
      bodySilhouettes: silhouettes
    };
  };

  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await projectsApi.get(id);
        const normalizedScript = sanitizeScriptHtml(response.project.scriptText || '');
        const normalizedProject = normalizeProjectData(response.project);
        setProject(normalizedProject);
        setScriptText(normalizedScript);
        setInitialScriptHtml(normalizedScript);
        setDirectorNotes(normalizedProject.directorNotes || '');
        setTimelineDurationInput(formatTime(normalizedProject.timelineDuration));
        setProjectDraft({
          name: normalizedProject.name || '',
          description: normalizedProject.description || '',
          deadline: normalizedProject.deadline || ''
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : t('Не удалось загрузить проект');
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [id, showToast, t]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== initialScriptHtml) {
      editorRef.current.innerHTML = initialScriptHtml;
    }
  }, [initialScriptHtml, project?.id]);

  useEffect(() => {
    if (!project) return;
    setScriptParamsDraft(project.scriptParams
      ? { ...defaultScriptParams, ...(project.scriptParams as ScriptParams) }
      : defaultScriptParams);
    setStoryboardGridLocal(project.storyboardGrid
      ? (project.storyboardGrid as StoryboardGrid)
      : defaultStoryboardGrid);
    setTasks(Array.isArray(project.tasks) ? project.tasks : []);
  }, [project?.id]);

  useEffect(() => {
    if (project) {
      setProjectDraft({
        name: project.name || '',
        description: project.description || '',
        deadline: project.deadline || ''
      });
    }
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const nextDuration = normalizeTimelineDuration(project.timelineDuration);
    setTimelineDurationInput(formatTime(nextDuration));
    setCurrentTime((prev) => Math.min(prev, nextDuration));
  }, [project?.timelineDuration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === 'Escape') {
        setShowTaskModal(false);
        setShowMarkerModal(false);
        setShowCommentModal(false);
        setCellEditorOpen(false);
        setShowBodyMarkerModal(false);
        setShowProjectSettings(false);
        setShowMediaModal(false);
        setShowDocModal(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !isInput) {
        e.preventDefault();
        if (directorNotes) saveProject({ directorNotes } as Partial<Project>);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && !isInput) {
        e.preventDefault();
        setShowMarkerModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [directorNotes, project]);

  const saveProject = async (patch: Partial<Project>) => {
    if (!project) return;
    setSaveStatus('saving');
    try {
      const response = await projectsApi.update(project.id, patch);
      const normalizedProject = normalizeProjectData(response.project);
      setProject(normalizedProject);
      setSaveStatus('saved');
      setSavedAt(new Date());
      setTimeout(() => setSaveStatus('idle'), 3000);
      return normalizedProject;
    } catch (err) {
      setSaveStatus('idle');
      const message = err instanceof Error ? err.message : t('Не удалось сохранить изменения');
      showToast(message, 'error');
    }
  };

  const markers = project?.markers || [];
  const soundMarkers = markers.filter((m) => m.tabId === 'sound').sort((a, b) => a.time - b.time);
  const bodyMarkers = project?.bodyMarkers || [];
  const bodySilhouettes = normalizeSilhouettes(project?.bodySilhouettes);
  const locations = project?.locations || [];
  const mediaFiles = project?.mediaFiles || [];
  const documents = project?.documents || [];
  const comments = project?.comments || [];
  const timelineDuration = normalizeTimelineDuration(project?.timelineDuration);
  const locale = language === 'en' ? 'en-US' : language === 'zh' ? 'zh-CN' : 'ru-RU';
  const selectedMedia = mediaFiles.find((file) => file.id === selectedMediaId) || null;

  useEffect(() => {
    if (mediaFiles.length === 0) {
      setSelectedMediaId(null);
      return;
    }
    if (!selectedMediaId || !mediaFiles.some((file) => file.id === selectedMediaId)) {
      setSelectedMediaId(mediaFiles[0].id);
    }
  }, [mediaFiles, selectedMediaId]);

  const maxTimelineUsage = useMemo(() => {
    const markerMax = markers.reduce((max, marker) => Math.max(max, marker.time), 0);
    const shotsMax = locations.reduce(
      (max, location) =>
        Math.max(
          max,
          ...location.shots.map((shot) => shot.time)
        ),
      0
    );
    const bodyMarkersMax = bodyMarkers.reduce((max, marker) => Math.max(max, getBodyMarkerTime(marker)), 0);
    return Math.max(markerMax, shotsMax, bodyMarkersMax);
  }, [bodyMarkers, locations, markers]);

  const timelineMarkers = useMemo<TimelineMarkerItem[]>(() => {
    const projectMarkers: TimelineMarkerItem[] = markers.map((marker) => ({
      ...marker,
      timelineKey: `project-${marker.id}`
    }));

    const silhouetteTimelineMarkers: TimelineMarkerItem[] = bodyMarkers.map((marker) => {
      const personId = getMarkerPersonId(marker);
      const personName = bodySilhouettes.find((person) => person.id === personId)?.name || `Человек ${personId}`;
      return {
        id: marker.id,
        time: getBodyMarkerTime(marker),
        color: marker.color || tabColors[marker.tabId],
        title: marker.title,
        comment: marker.description?.trim() || marker.title,
        user: personName,
        icon: marker.tabId,
        tabId: marker.tabId,
        timelineKey: `silhouette-${marker.tabId}-${marker.id}`
      };
    });

    return [...projectMarkers, ...silhouetteTimelineMarkers];
  }, [bodyMarkers, bodySilhouettes, markers]);

  const filteredMarkers = showAllMarkers
    ? timelineMarkers
    : timelineMarkers.filter((marker) => marker.tabId === activeTab);

  const timelineLabels = useMemo(() => {
    const segments = 7;
    const labels = Array.from({ length: segments + 1 }, (_, index) =>
      Math.round((index / segments) * timelineDuration)
    );
    return Array.from(new Set([0, ...labels, timelineDuration])).sort((a, b) => a - b);
  }, [timelineDuration]);

  const resolveMarkerIcon = (marker: ProjectMarker) => {
    return iconMap[marker.icon] || MarkerIcon;
  };

  const getSilhouetteLabel = (personId: number) => {
    const person = bodySilhouettes.find((item) => item.id === personId);
    return person?.name || `Человек ${personId}`;
  };

  const handlePlayPause = () => setIsPlaying((prev) => !prev);

  const handleCreateMarker = async () => {
    if (!project) return;
    if (!markerComment.trim()) {
      showToast(t('Введите комментарий маркера'), 'error');
      return;
    }
    const title = markerTitle.trim() || t('Маркер {count}', { count: markers.length + 1 });
    const newMarker: ProjectMarker = {
      id: markers.length + 1,
      time: currentTime,
      color: tabColors[activeTab],
      title,
      comment: markerComment.trim(),
      user: t('Вы'),
      icon: activeTab,
      tabId: activeTab
    };
    const updatedMarkers = [...markers, newMarker];
    setMarkerTitle('');
    setMarkerComment('');
    setShowMarkerModal(false);
    await saveProject({ markers: updatedMarkers });
    showToast(t('Маркер добавлен'), 'success');
  };

  const handleTimelineClick = (time: number) => {
    const safeTime = Math.max(0, Math.min(timelineDuration, Math.floor(time)));
    setCurrentTime(safeTime);
  };

  const handleOpenTimelineMarkerDetails = (marker: ProjectMarker) => {
    setSelectedTimelineMarker(marker);
    handleTimelineClick(marker.time);
    setShowTimelineMarkerModal(true);
  };

  const applyTimelineDuration = async (nextDuration: number, shouldClampData: boolean) => {
    const patch: Partial<Project> = { timelineDuration: nextDuration };
    if (shouldClampData) {
      patch.markers = markers.map((marker) => ({
        ...marker,
        time: Math.min(marker.time, nextDuration)
      }));
      patch.bodyMarkers = bodyMarkers.map((marker) => ({
        ...marker,
        time: Math.min(getBodyMarkerTime(marker), nextDuration)
      }));
      patch.locations = locations.map((location) => ({
        ...location,
        shots: location.shots.map((shot) => ({
          ...shot,
          time: Math.min(shot.time, nextDuration)
        }))
      }));
    }
    await saveProject(patch);
    setCurrentTime((prev) => Math.min(prev, nextDuration));
    setTimelineDurationInput(formatTime(nextDuration));
    showToast(t('Длительность таймлайна обновлена'), 'success');
  };

  const handleSaveTimelineDuration = async () => {
    if (!project) return;
    const parsed = parseTimeInput(timelineDurationInput.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast(t('Введите корректную длительность таймлайна (секунды или мм:сс)'), 'error');
      return;
    }

    const nextDuration = normalizeTimelineDuration(parsed);
    if (nextDuration < maxTimelineUsage) {
      setPendingTimelineDuration(nextDuration);
      setShowTimelineDurationConfirm(true);
      return;
    }

    await applyTimelineDuration(nextDuration, false);
  };

  const handleConfirmTimelineShrink = async () => {
    if (!pendingTimelineDuration) return;
    await applyTimelineDuration(pendingTimelineDuration, true);
    setPendingTimelineDuration(null);
    setShowTimelineDurationConfirm(false);
  };


  // ── Script params ────────────────────────────────────────────────────────────

  const updateScriptParam = async <K extends keyof ScriptParams>(key: K, value: ScriptParams[K]) => {
    const updated = { ...scriptParams, [key]: value };
    setScriptParamsDraft(updated);

    // Data binding: actors → bodySilhouettes
    if (key === 'actorsCount') {
      const newCount = value as number;
      let newSilhouettes = [...bodySilhouettes];
      if (newCount > newSilhouettes.length) {
        for (let i = newSilhouettes.length + 1; i <= newCount; i++) {
          newSilhouettes.push({ id: i, name: `${t('Актёр')} ${i}` });
        }
      } else {
        newSilhouettes = newSilhouettes.slice(0, newCount);
      }
      await saveProject({ bodySilhouettes: newSilhouettes, scriptParams: updated } as Partial<Project>);
      if (newCount > 0) showToast(t('{n} актёров — образы обновлены', { n: newCount }), 'success');
      return;
    }

    // Data binding: locationsCount → storyboard grid rows
    if (key === 'locationsCount') {
      const newCount = value as number;
      let newNames = [...storyboardGrid.locationNames];
      if (newCount > newNames.length) {
        for (let i = newNames.length + 1; i <= newCount; i++) {
          newNames.push(`${t('Локация')} ${i}`);
        }
      } else {
        newNames = newNames.slice(0, newCount);
      }
      const newCells: Record<string, StoryboardCell> = {};
      Object.entries(storyboardGrid.cells).forEach(([k, v]) => {
        if (parseInt(k.split('_')[0]) < newCount) newCells[k] = v;
      });
      const newGrid = { ...storyboardGrid, locationNames: newNames, cells: newCells };
      setStoryboardGridLocal(newGrid);
      await saveProject({ storyboardGrid: newGrid, scriptParams: updated } as Partial<Project>);
      return;
    }

    await saveProject({ scriptParams: updated } as Partial<Project>);
  };

  const handleScriptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;
    let dataUrl: string | undefined;
    if (isImage) {
      try { dataUrl = await compressImage(file, 600, 400); } catch { dataUrl = undefined; }
    }
    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    await updateScriptParam('scriptFile', { name: file.name, type: ext, size: sizeStr, dataUrl });
    showToast(t('Файл сценария загружен'), 'success');
    e.target.value = '';
  };

  const handleRemoveScriptFile = async () => {
    await updateScriptParam('scriptFile', null);
  };

  // ── Storyboard grid ──────────────────────────────────────────────────────────

  const saveStoryboardGrid = async (grid: StoryboardGrid) => {
    setStoryboardGridLocal(grid);
    await saveProject({ storyboardGrid: grid } as Partial<Project>);
  };

  const saveTasks = async (newTasks: Task[]) => {
    setTasks(newTasks);
    await saveProject({ tasks: newTasks } as Partial<Project>);
  };

  const handleOpenNewTask = () => {
    setTaskDraft({ title: '', description: '', status: 'todo', priority: 'medium', department: 'edit', assignee: '', sceneRef: '' });
    setTaskEditId(null);
    setShowTaskModal(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setTaskDraft({ title: task.title, description: task.description, status: task.status, priority: task.priority, department: task.department, assignee: task.assignee || '', sceneRef: task.sceneRef || '' });
    setTaskEditId(task.id);
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskDraft.title.trim()) return;
    const now = new Date().toISOString();
    if (taskEditId) {
      const updated = tasks.map(t => t.id === taskEditId ? { ...t, ...taskDraft, updatedAt: now } : t);
      await saveTasks(updated);
    } else {
      const newTask: Task = { id: `task_${Date.now()}`, ...taskDraft, createdAt: now, updatedAt: now };
      await saveTasks([...tasks, newTask]);
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    await saveTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const now = new Date().toISOString();
    await saveTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: now } : t));
  };

  const handleAddStoryboardRow = async () => {
    const newGrid = {
      ...storyboardGrid,
      locationNames: [...storyboardGrid.locationNames, `${t('Локация')} ${storyboardGrid.locationNames.length + 1}`]
    };
    await saveStoryboardGrid(newGrid);
    setScriptParamsDraft(prev => ({ ...prev, locationsCount: newGrid.locationNames.length }));
    await saveProject({ scriptParams: { ...scriptParams, locationsCount: newGrid.locationNames.length } } as Partial<Project>);
  };

  const handleRemoveStoryboardRow = async () => {
    if (storyboardGrid.locationNames.length === 0) return;
    const newLen = storyboardGrid.locationNames.length - 1;
    const newNames = storyboardGrid.locationNames.slice(0, newLen);
    const newCells: Record<string, StoryboardCell> = {};
    Object.entries(storyboardGrid.cells).forEach(([k, v]) => {
      if (parseInt(k.split('_')[0]) < newLen) newCells[k] = v;
    });
    const newGrid = { ...storyboardGrid, locationNames: newNames, cells: newCells };
    setStoryboardGridLocal(newGrid);
    setScriptParamsDraft(prev => ({ ...prev, locationsCount: newLen }));
    await saveProject({ storyboardGrid: newGrid, scriptParams: { ...scriptParams, locationsCount: newLen } } as Partial<Project>);
  };

  const handleAddStoryboardColumn = async () => {
    await saveStoryboardGrid({ ...storyboardGrid, columnCount: storyboardGrid.columnCount + 1 });
  };

  const handleRemoveStoryboardColumn = async () => {
    if (storyboardGrid.columnCount <= 1) return;
    const newCount = storyboardGrid.columnCount - 1;
    const newCells: Record<string, StoryboardCell> = {};
    Object.entries(storyboardGrid.cells).forEach(([k, v]) => {
      if (parseInt(k.split('_')[1]) < newCount) newCells[k] = v;
    });
    await saveStoryboardGrid({ ...storyboardGrid, columnCount: newCount, cells: newCells });
  };

  const renameStoryboardRow = (rowIdx: number, name: string) => {
    const newNames = [...storyboardGrid.locationNames];
    newNames[rowIdx] = name;
    setStoryboardGridLocal({ ...storyboardGrid, locationNames: newNames });
  };

  const openCellEditor = (rowIdx: number, colIdx: number) => {
    const key = `${rowIdx}_${colIdx}`;
    const existing = storyboardGrid.cells[key] ?? { description: '', imageUrl: '', shotType: '' };
    setCellEditorRow(rowIdx);
    setCellEditorCol(colIdx);
    setCellEditorDraft({ ...existing });
    setCellEditorOpen(true);
  };

  const handleSaveCell = async () => {
    const key = `${cellEditorRow}_${cellEditorCol}`;
    const newCells = { ...storyboardGrid.cells, [key]: { ...cellEditorDraft } };
    setCellEditorOpen(false);
    await saveStoryboardGrid({ ...storyboardGrid, cells: newCells });
  };

  const handleDeleteCell = async () => {
    const key = `${cellEditorRow}_${cellEditorCol}`;
    const newCells = { ...storyboardGrid.cells };
    delete newCells[key];
    setCellEditorOpen(false);
    await saveStoryboardGrid({ ...storyboardGrid, cells: newCells });
  };

  const handleCellImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setCellEditorDraft(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch {
      showToast(t('Не удалось загрузить изображение'), 'error');
    }
    e.target.value = '';
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      showToast(t('Введите текст комментария'), 'error');
      return;
    }
    const newComment: ProjectComment = {
      id: comments.length + 1,
      tabId: commentTab,
      user: t('Вы'),
      text: commentText.trim(),
      timestamp: new Date().toLocaleString(locale),
      resolved: false
    };
    setCommentText('');
    setShowCommentModal(false);
    await saveProject({ comments: [...comments, newComment] });
    showToast(t('Комментарий добавлен'), 'success');
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
      showToast(t('Введите название локации'), 'error');
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
    showToast(t('Локация добавлена'), 'success');
  };

  const handleAddShot = async () => {
    if (!shotLocationId) return;
    if (!shotDraft.title.trim()) {
      showToast(t('Введите название кадра'), 'error');
      return;
    }
    const locationIndex = locations.findIndex((location) => location.id === shotLocationId);
    if (locationIndex === -1) return;
    const parsedTime = parseTimeInput(shotDraft.time);
    const rawTime = Number.isNaN(parsedTime) ? currentTime : parsedTime;
    const time = Math.max(0, Math.min(timelineDuration, Math.floor(rawTime)));
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
    showToast(t('Кадр добавлен'), 'success');
  };

  const handleSaveNotes = async () => {
    await saveProject({ directorNotes });
    showToast(t('Заметки сохранены'), 'success');
  };

  const handleShareNotes = async () => {
    try {
      await navigator.clipboard.writeText(directorNotes || '');
      showToast(t('Заметки скопированы в буфер'), 'success');
    } catch {
      showToast(t('Не удалось скопировать заметки'), 'error');
    }
  };

  const handleAddSilhouette = async () => {
    const lastId = bodySilhouettes.reduce((max, person) => Math.max(max, person.id), 0);
    const nextSilhouette: BodySilhouette = {
      id: lastId + 1,
      name: t('Человек {count}', { count: bodySilhouettes.length + 1 })
    };
    const nextSilhouettes = [...bodySilhouettes, nextSilhouette];
    await saveProject({ bodySilhouettes: nextSilhouettes });
    showToast(t('Добавлен новый силуэт'), 'success');
  };

  const handleRenameSilhouette = async (personId: number) => {
    const person = bodySilhouettes.find((item) => item.id === personId);
    if (!person) return;
    const nextNameRaw = window.prompt(t('Введите новое имя человека'), person.name);
    if (nextNameRaw === null) return;
    const nextName = nextNameRaw.trim();
    if (!nextName) {
      showToast(t('Имя человека не может быть пустым'), 'error');
      return;
    }
    const duplicate = bodySilhouettes.some(
      (item) => item.id !== personId && item.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      showToast(t('Человек с таким именем уже есть'), 'error');
      return;
    }
    if (nextName === person.name) return;

    const nextSilhouettes = bodySilhouettes.map((item) =>
      item.id === personId ? { ...item, name: nextName } : item
    );
    await saveProject({ bodySilhouettes: nextSilhouettes });
    showToast(t('Имя человека обновлено'), 'success');
  };

  const handleRemoveSilhouette = async (personId: number) => {
    if (bodySilhouettes.length <= 1) {
      showToast(t('Нельзя удалить последнего человека'), 'error');
      return;
    }
    const personName = getSilhouetteLabel(personId);
    const relatedMarkersCount = bodyMarkers.filter((marker) => getMarkerPersonId(marker) === personId).length;
    setPendingSilhouetteRemoval({ personId, personName, relatedMarkersCount });
  };

  const handleConfirmSilhouetteRemoval = async () => {
    if (!pendingSilhouetteRemoval) return;

    const { personId, personName } = pendingSilhouetteRemoval;
    const nextSilhouettes = bodySilhouettes.filter((person) => person.id !== personId);
    const nextMarkers = bodyMarkers.filter((marker) => getMarkerPersonId(marker) !== personId);

    if (bodyMarkerDraft.personId === personId) {
      setBodyMarkerDraft((prev) => ({
        ...prev,
        personId: nextSilhouettes[0]?.id || 1
      }));
      setBodyMarkerEditId(null);
      setShowBodyMarkerModal(false);
    }

    await saveProject({
      bodySilhouettes: nextSilhouettes,
      bodyMarkers: nextMarkers
    });
    showToast(t('Удален {name}', { name: personName }), 'success');
    setPendingSilhouetteRemoval(null);
  };

  const handleAddBodyMarker = async () => {
    if (!bodyMarkerDraft.title.trim()) {
      showToast(t('Введите название маркера'), 'error');
      return;
    }
    const personId = Math.max(1, Number(bodyMarkerDraft.personId) || 1);
    const parsedTime = parseTimeInput(bodyMarkerDraft.time);
    const rawTime = Number.isNaN(parsedTime) ? currentTime : parsedTime;
    const markerTime = Math.max(0, Math.min(timelineDuration, Math.floor(rawTime)));
    let updatedMarkers: BodyMarker[] = [];
    if (bodyMarkerEditId) {
      updatedMarkers = bodyMarkers.map((marker) =>
        marker.id === bodyMarkerEditId
          ? {
              ...marker,
              time: markerTime,
              title: bodyMarkerDraft.title.trim(),
              description: bodyMarkerDraft.description.trim(),
              bodyPart: bodyMarkerDraft.bodyPart || marker.bodyPart,
              x: bodyMarkerDraft.x,
              y: bodyMarkerDraft.y,
              tabId: bodyMarkerDraft.tabId,
              personId,
              color: tabColors[bodyMarkerDraft.tabId]
            }
          : marker
      );
    } else {
      const newMarker: BodyMarker = {
        id: bodyMarkers.length + 1,
        time: markerTime,
        x: bodyMarkerDraft.x,
        y: bodyMarkerDraft.y,
        title: bodyMarkerDraft.title.trim(),
        description: bodyMarkerDraft.description.trim(),
        bodyPart: bodyMarkerDraft.bodyPart || 'torso',
        images: [],
        comments: [],
        color: tabColors[bodyMarkerDraft.tabId],
        tabId: bodyMarkerDraft.tabId,
        personId
      };
      updatedMarkers = [...bodyMarkers, newMarker];
    }
    setShowBodyMarkerModal(false);
    setBodyMarkerDraft({
      title: '',
      description: '',
      bodyPart: '',
      time: formatTime(currentTime),
      x: 50,
      y: 50,
      tabId: bodyMarkerDraft.tabId,
      personId
    });
    const wasEditing = Boolean(bodyMarkerEditId);
    setBodyMarkerEditId(null);
    await saveProject({ bodyMarkers: updatedMarkers });
    showToast(wasEditing ? t('Маркер обновлен') : t('Маркер добавлен'), 'success');
  };

  const handleAddBodyImage = async (markerId: number) => {
    const url = window.prompt(t('Вставьте ссылку на изображение'));
    if (!url) return;
    const updated = bodyMarkers.map((marker) =>
      marker.id === markerId ? { ...marker, images: [...marker.images, url] } : marker
    );
    await saveProject({ bodyMarkers: updated });
    showToast(t('Изображение добавлено'), 'success');
  };

  const handleAddMedia = async () => {
    if (!mediaDraft.name.trim()) {
      showToast(t('Введите название файла'), 'error');
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
    showToast(t('Медиафайл добавлен'), 'success');
  };

  const handleAddDocument = async () => {
    if (!docDraft.name.trim()) {
      showToast(t('Введите название документа'), 'error');
      return;
    }
    const newDoc = {
      id: documents.length + 1,
      name: docDraft.name.trim(),
      size: docDraft.size || '—',
      uploadedBy: docDraft.uploadedBy || t('Вы'),
      uploadedAt: new Intl.DateTimeFormat(locale).format(new Date()),
      type: 'script'
    };
    setDocDraft({ name: '', size: '', uploadedBy: '' });
    setShowDocModal(false);
    await saveProject({ documents: [...documents, newDoc] });
    showToast(t('Документ добавлен'), 'success');
  };

  const handlePrintReport = () => {
    window.print();
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
      showToast(t('Экспорт готов'), 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Не удалось экспортировать проект');
      showToast(message, 'error');
    }
  };

  const handleSaveProjectSettings = async () => {
    if (!projectDraft.name.trim()) {
      showToast(t('Название проекта обязательно'), 'error');
      return;
    }
    await saveProject({
      name: projectDraft.name.trim(),
      description: projectDraft.description.trim(),
      deadline: projectDraft.deadline
    });
    setShowProjectSettings(false);
    showToast(t('Настройки проекта сохранены'), 'success');
  };

  const getTimelineTimeFromClientX = (clientX: number) => {
    const timelineElement = timelineBarRef.current;
    if (!timelineElement) {
      return currentTime;
    }

    const rect = timelineElement.getBoundingClientRect();
    if (rect.width <= 0) {
      return currentTime;
    }

    const clampedOffsetX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const percentage = clampedOffsetX / rect.width;
    return Math.floor(percentage * timelineDuration);
  };

  const handleTimelineScrubStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsTimelineDragging(true);
    handleTimelineClick(getTimelineTimeFromClientX(event.clientX));
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTimelineScrubMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTimelineDragging) return;
    handleTimelineClick(getTimelineTimeFromClientX(event.clientX));
  };

  const handleTimelineScrubEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTimelineDragging) return;
    handleTimelineClick(getTimelineTimeFromClientX(event.clientX));
    setIsTimelineDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const commentsByTab = useMemo(() => {
    return comments.reduce<Record<TabType, ProjectComment[]>>(
      (acc, comment) => {
        acc[comment.tabId] = [...(acc[comment.tabId] || []), comment];
        return acc;
      },
      { edit: [], script: [], director: [], costumes: [], makeup: [], sound: [], manager: [] }
    );
  }, [comments]);

  if (loading) {
    return (
      <div className="project-page">
        <div className="page-loading">
          <div className="loading-spinner" />
          {t('Загружаем проект…')}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-page">
        <div className="empty-state">{t('Проект не найден.')}</div>
      </div>
    );
  }

  return (
    <div className="project-page">
      <Header
        title={project.name}
        subtitle={`ID: ${project.id}`}
        showBackButton={true}
        backButtonText={t('К проектам')}
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
        {/* ── Toolbar row: controls + scrub bar + actions ── */}
        <div className="timeline-toolbar">
          <button className="play-btn" onClick={handlePlayPause} title={isPlaying ? t('Пауза') : t('Воспроизвести')}>
            <img
              src={isPlaying ? PauseIcon : PlayIcon}
              alt={isPlaying ? t('Пауза') : t('Воспроизвести')}
              className="play-icon"
            />
          </button>

          <span className="time-display">
            {formatTime(currentTime)}<span className="time-sep"> / </span>{formatTime(timelineDuration)}
          </span>

          {/* Save indicator — inline, only when active */}
          {saveStatus === 'saving' && <span className="tl-save-indicator tl-save-indicator--saving">⟳ {t('Сохранение...')}</span>}
          {saveStatus === 'saved' && savedAt && <span className="tl-save-indicator tl-save-indicator--saved">✓ {t('Сохранено')}</span>}

          {/* Deadline badge — only when urgent/overdue */}
          {(() => {
            const daysLeft = project.deadline
              ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
              : null;
            if (daysLeft === null) return null;
            if (daysLeft < 0) return <span className="tl-deadline-badge tl-deadline-badge--overdue">⚠ {t('{n} дн. просрочен', { n: Math.abs(daysLeft) })}</span>;
            if (daysLeft <= 7) return <span className="tl-deadline-badge tl-deadline-badge--urgent">⏰ {t('{n} дн.', { n: daysLeft })}</span>;
            return null;
          })()}

          {/* Scrub track — flex: 1 */}
          <div className="timeline-track" style={{ '--tl-progress': `${(currentTime / timelineDuration) * 100}%` } as React.CSSProperties}>
            <div className="timeline-bar" ref={timelineBarRef}>
              {filteredMarkers.map((marker) => (
                <div
                  key={marker.timelineKey}
                  className="timeline-marker"
                  style={{
                    left: `${(Math.min(marker.time, timelineDuration) / timelineDuration) * 100}%`,
                    backgroundColor: marker.color
                  }}
                  title={`${marker.title} (${marker.user}) — ${tabNames[marker.tabId]}${marker.comment ? ` • ${marker.comment}` : ''}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenTimelineMarkerDetails(marker);
                  }}
                >
                  <img src={resolveMarkerIcon(marker)} alt={marker.user} className="marker-icon" />
                </div>
              ))}
              <div
                className={`timeline-cursor ${isTimelineDragging ? 'dragging' : ''}`}
                style={{ left: `${(currentTime / timelineDuration) * 100}%` }}
                onPointerDown={handleTimelineScrubStart}
                onPointerMove={handleTimelineScrubMove}
                onPointerUp={handleTimelineScrubEnd}
                onPointerCancel={handleTimelineScrubEnd}
              />
            </div>
            <div
              className="timeline-click-area"
              onPointerDown={handleTimelineScrubStart}
              onPointerMove={handleTimelineScrubMove}
              onPointerUp={handleTimelineScrubEnd}
              onPointerCancel={handleTimelineScrubEnd}
            />
          </div>

          {/* Right-side action buttons */}
          <button
            className="tl-action-btn"
            onClick={() => { setMarkerTitle(''); setMarkerComment(''); setShowMarkerModal(true); }}
            title={t('Добавить маркер для {tab}', { tab: t(tabNames[activeTab]) })}
          >
            <img src={AddMarkerIcon} alt="" className="tl-action-icon" />
          </button>

          <button
            className={`tl-action-btn${showAllMarkers ? ' tl-action-btn--active' : ''}`}
            onClick={() => setShowAllMarkers(v => !v)}
            title={showAllMarkers ? t('Только текущая вкладка') : t('Показать все маркеры')}
          >
            <span className="tl-action-label">{showAllMarkers ? '⊞' : '⊟'}</span>
          </button>

          <button className="tl-action-btn no-print" onClick={handlePrintReport} title={t('Экспорт в PDF')}>
            <span className="tl-action-label">PDF</span>
          </button>
        </div>

        {/* ── Footer row: time labels + mini legend ── */}
        <div className="timeline-footer-compact">
          <div className="timeline-markers-labels">
            {timelineLabels.map((time) => (
              <div key={time} className="timeline-label">{formatTime(time)}</div>
            ))}
          </div>
          <div className="timeline-legend-mini">
            {(Object.keys(tabNames) as TabType[]).map((tabId) => (
              <span key={tabId} className="tl-legend-item" title={t(tabNames[tabId])}>
                <span className="tl-legend-dot" style={{ background: tabColors[tabId] }} />
                {t(tabNames[tabId]).slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs-section">
        <div className="tabs-header">
          {(['script', 'director', 'costumes', 'makeup', 'edit', 'sound', 'manager'] as TabType[]).map((tabId) => (
            <button
              key={tabId}
              className={`tab-btn ${activeTab === tabId ? 'active' : ''}`}
              onClick={() => setActiveTab(tabId)}
              style={activeTab === tabId ? {
                backgroundColor: `${tabColors[tabId]}1a`,
                borderColor: `${tabColors[tabId]}55`,
                color: tabColors[tabId]
              } : {}}
            >
              <img src={iconMap[tabId]} alt="" className="tab-btn-icon" />
              {t(tabNames[tabId])}
              {tabId !== 'manager' && (() => {
                const count = (commentsByTab[tabId] || []).filter(c => !c.resolved).length;
                return count > 0 ? <span className="notification-badge">{count}</span> : null;
              })()}
              {tabId === 'manager' && (() => {
                const blocked = tasks.filter(t => t.status === 'blocked').length;
                const pending = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
                if (blocked > 0) return <span className="notification-badge notification-badge--blocked">{blocked}</span>;
                if (pending > 0) return <span className="notification-badge notification-badge--pending">{pending}</span>;
                return null;
              })()}
            </button>
          ))}
        </div>

        <div className="tabs-content">
          {activeTab === 'script' && (
            <div className="tab-content script-tab">
              <input ref={scriptFileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleScriptFileUpload} />

              {/* Upload zone */}
              <div
                className={`script-upload-zone${scriptParams.scriptFile ? ' has-file' : ''}`}
                onClick={() => !scriptParams.scriptFile && scriptFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const fakeEvent = { target: { files: [f], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>; await handleScriptFileUpload(fakeEvent); } }}
              >
                {scriptParams.scriptFile ? (
                  <div className="script-file-info">
                    <div className="script-file-icon">{scriptParams.scriptFile.type === 'PDF' ? '📕' : scriptParams.scriptFile.type === 'PNG' || scriptParams.scriptFile.type === 'JPG' || scriptParams.scriptFile.type === 'JPEG' ? '🖼' : '📄'}</div>
                    <div className="script-file-details">
                      <div className="script-file-name">{scriptParams.scriptFile.name}</div>
                      <div className="script-file-meta">{scriptParams.scriptFile.type} · {scriptParams.scriptFile.size}</div>
                    </div>
                    {scriptParams.scriptFile.dataUrl && <img src={scriptParams.scriptFile.dataUrl} className="script-file-thumb" alt="" />}
                    <div className="script-file-actions">
                      <button className="script-file-btn" onClick={(e) => { e.stopPropagation(); scriptFileInputRef.current?.click(); }}>{t('Заменить')}</button>
                      <button className="script-file-btn script-file-btn--danger" onClick={(e) => { e.stopPropagation(); handleRemoveScriptFile(); }}>{t('Удалить')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="script-upload-prompt">
                    <div className="script-upload-icon">📄</div>
                    <div className="script-upload-title">{t('Загрузить файл сценария')}</div>
                    <div className="script-upload-formats">PDF · Word (.docx) · PNG · JPG</div>
                    <div className="script-upload-hint">{t('Перетащите файл или нажмите для выбора')}</div>
                  </div>
                )}
              </div>

              {/* Parameters */}
              <div className="sp-grid">

                <div className="sp-section">
                  <div className="sp-section-title">🎭 {t('Актёрский состав')}</div>
                  <div className="sp-fields">
                    <div className="sp-field sp-field--accent">
                      <label className="sp-label">{t('Главных актёров')}</label>
                      <input type="number" min={0} max={500} className="sp-num" value={scriptParams.actorsCount} onChange={(e) => updateScriptParam('actorsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                      <span className="sp-hint">{t('→ Костюмер и Визажист')}</span>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Массовка / экстра')}</label>
                      <input type="number" min={0} max={10000} className="sp-num" value={scriptParams.extraActorsCount} onChange={(e) => updateScriptParam('extraActorsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Дети-актёры')}</label>
                      <input type="number" min={0} max={200} className="sp-num" value={scriptParams.childActorsCount} onChange={(e) => updateScriptParam('childActorsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Животные')}</label>
                      <input type="number" min={0} max={200} className="sp-num" value={scriptParams.animalsCount} onChange={(e) => updateScriptParam('animalsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">📍 {t('Масштаб производства')}</div>
                  <div className="sp-fields">
                    <div className="sp-field sp-field--accent">
                      <label className="sp-label">{t('Количество локаций')}</label>
                      <input type="number" min={0} max={200} className="sp-num" value={scriptParams.locationsCount} onChange={(e) => updateScriptParam('locationsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                      <span className="sp-hint">{t('→ Раскадровка Режиссёра')}</span>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Наружных сцен')}</label>
                      <input type="number" min={0} max={5000} className="sp-num" value={scriptParams.exteriorScenesCount} onChange={(e) => updateScriptParam('exteriorScenesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Внутренних сцен')}</label>
                      <input type="number" min={0} max={5000} className="sp-num" value={scriptParams.interiorScenesCount} onChange={(e) => updateScriptParam('interiorScenesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Ночных сцен')}</label>
                      <input type="number" min={0} max={5000} className="sp-num" value={scriptParams.nightScenesCount} onChange={(e) => updateScriptParam('nightScenesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Дней съёмок')}</label>
                      <input type="number" min={0} max={1000} className="sp-num" value={scriptParams.shootingDaysCount} onChange={(e) => updateScriptParam('shootingDaysCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Хронометраж (мин)')}</label>
                      <input type="number" min={0} max={600} className="sp-num" value={scriptParams.totalDurationMin} onChange={(e) => updateScriptParam('totalDurationMin', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">🎨 {t('Реквизит и образы')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('Единиц реквизита')}</label>
                      <input type="number" min={0} max={10000} className="sp-num" value={scriptParams.propsCount} onChange={(e) => updateScriptParam('propsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Комплектов костюмов')}</label>
                      <input type="number" min={0} max={2000} className="sp-num" value={scriptParams.costumeSetsCount} onChange={(e) => updateScriptParam('costumeSetsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Образов грима')}</label>
                      <input type="number" min={0} max={2000} className="sp-num" value={scriptParams.makeupLooksCount} onChange={(e) => updateScriptParam('makeupLooksCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.wigs} onChange={(e) => updateScriptParam('wigs', e.target.checked)} /><span>{t('Парики / накладные волосы')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.prosthetics} onChange={(e) => updateScriptParam('prosthetics', e.target.checked)} /><span>{t('Грим-протезы / трансформации')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">💥 {t('Эффекты и трюки')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('VFX-кадров (цифровые эффекты)')}</label>
                      <input type="number" min={0} max={10000} className="sp-num" value={scriptParams.vfxShotsCount} onChange={(e) => updateScriptParam('vfxShotsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Реальных эффектов (пиро/огонь/вода)')}</label>
                      <input type="number" min={0} max={1000} className="sp-num" value={scriptParams.practicalEffectsCount} onChange={(e) => updateScriptParam('practicalEffectsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Трюков (каскадёры)')}</label>
                      <input type="number" min={0} max={500} className="sp-num" value={scriptParams.stuntsCount} onChange={(e) => updateScriptParam('stuntsCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.weaponProps} onChange={(e) => updateScriptParam('weaponProps', e.target.checked)} /><span>{t('Оружие / имитация оружия')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.pyrotechnics} onChange={(e) => updateScriptParam('pyrotechnics', e.target.checked)} /><span>{t('Пиротехника')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.rainScenes} onChange={(e) => updateScriptParam('rainScenes', e.target.checked)} /><span>{t('Сцены с дождём')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.snowScenes} onChange={(e) => updateScriptParam('snowScenes', e.target.checked)} /><span>{t('Сцены со снегом')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">🚗 {t('Транспорт и оборудование')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('Транспортных средств')}</label>
                      <input type="number" min={0} max={1000} className="sp-num" value={scriptParams.vehiclesCount} onChange={(e) => updateScriptParam('vehiclesCount', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.vehicleChases} onChange={(e) => updateScriptParam('vehicleChases', e.target.checked)} /><span>{t('Автомобильные погони')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.droneShots} onChange={(e) => updateScriptParam('droneShots', e.target.checked)} /><span>{t('Дрон-съёмка')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.underwaterShots} onChange={(e) => updateScriptParam('underwaterShots', e.target.checked)} /><span>{t('Подводные съёмки')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.aerialShots} onChange={(e) => updateScriptParam('aerialShots', e.target.checked)} /><span>{t('Авиасъёмка (вертолёт)')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.craneShots} onChange={(e) => updateScriptParam('craneShots', e.target.checked)} /><span>{t('Кран / рельсовые тележки')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">📷 {t('Камера и формат')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('Формат съёмки')}</label>
                      <select className="sp-select" value={scriptParams.productionFormat} onChange={(e) => updateScriptParam('productionFormat', e.target.value)}>
                        {['4K','6K','8K','HD 1080p','Film 35mm','Film 16mm','Цифровой RAW'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Соотношение сторон')}</label>
                      <select className="sp-select" value={scriptParams.aspectRatio} onChange={(e) => updateScriptParam('aspectRatio', e.target.value)}>
                        {['16:9','2.35:1','1.85:1','4:3','2.39:1','1:1'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.handheldStyle} onChange={(e) => updateScriptParam('handheldStyle', e.target.checked)} /><span>{t('Ручная камера')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.steadicam} onChange={(e) => updateScriptParam('steadicam', e.target.checked)} /><span>{t('Стедикам')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">🎵 {t('Звук и музыка')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('Оригинальных треков')}</label>
                      <input type="number" min={0} max={500} className="sp-num" value={scriptParams.originalMusicTracks} onChange={(e) => updateScriptParam('originalMusicTracks', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Жанр музыки')}</label>
                      <input type="text" className="sp-text" value={scriptParams.musicGenre} placeholder={t('Оркестр, Электроника...')}
                        onChange={(e) => setScriptParamsDraft(prev => ({ ...prev, musicGenre: e.target.value }))}
                        onBlur={(e) => updateScriptParam('musicGenre', e.target.value)} />
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.voiceOverPresent} onChange={(e) => updateScriptParam('voiceOverPresent', e.target.checked)} /><span>{t('Закадровый голос (VO)')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.silentScenes} onChange={(e) => updateScriptParam('silentScenes', e.target.checked)} /><span>{t('Сцены без диалогов')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">🎬 {t('Жанр и аудитория')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('Жанр')}</label>
                      <select className="sp-select" value={scriptParams.genre} onChange={(e) => updateScriptParam('genre', e.target.value)}>
                        <option value="">{t('Выбрать...')}</option>
                        {['Драма','Комедия','Триллер','Экшн','Мелодрама','Ужасы','Фантастика','Фэнтези','Документальный','Анимация','Биографический','Музыкальный','Криминал','Вестерн','Исторический'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Возрастной рейтинг')}</label>
                      <select className="sp-select" value={scriptParams.ageRating} onChange={(e) => updateScriptParam('ageRating', e.target.value)}>
                        {['0+','6+','12+','16+','18+'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Целевая аудитория')}</label>
                      <input type="text" className="sp-text" value={scriptParams.targetAudience} placeholder={t('18–35, семейная...')}
                        onChange={(e) => setScriptParamsDraft(prev => ({ ...prev, targetAudience: e.target.value }))}
                        onBlur={(e) => updateScriptParam('targetAudience', e.target.value)} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Язык диалогов')}</label>
                      <select className="sp-select" value={scriptParams.dialogLanguage} onChange={(e) => updateScriptParam('dialogLanguage', e.target.value)}>
                        {['Русский','Английский','Китайский','Французский','Немецкий','Испанский','Несколько языков'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.subtitlesNeeded} onChange={(e) => updateScriptParam('subtitlesNeeded', e.target.checked)} /><span>{t('Необходимы субтитры')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section">
                  <div className="sp-section-title">⚠️ {t('Риски и условия')}</div>
                  <div className="sp-fields">
                    <div className="sp-field">
                      <label className="sp-label">{t('Погодозависимых дней')}</label>
                      <input type="number" min={0} max={365} className="sp-num" value={scriptParams.weatherDependentDays} onChange={(e) => updateScriptParam('weatherDependentDays', Math.max(0, parseInt(e.target.value) || 0))} />
                    </div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.hazardousConditions} onChange={(e) => updateScriptParam('hazardousConditions', e.target.checked)} /><span>{t('Опасные условия (огонь, высота, вода)')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.internationalShoot} onChange={(e) => updateScriptParam('internationalShoot', e.target.checked)} /><span>{t('Международные съёмки')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.remoteLocations} onChange={(e) => updateScriptParam('remoteLocations', e.target.checked)} /><span>{t('Труднодоступные локации')}</span></label></div>
                    <div className="sp-field sp-field--check"><label className="sp-check"><input type="checkbox" checked={scriptParams.militaryEquipment} onChange={(e) => updateScriptParam('militaryEquipment', e.target.checked)} /><span>{t('Военная техника / спецсредства')}</span></label></div>
                  </div>
                </div>

                <div className="sp-section sp-section--wide">
                  <div className="sp-section-title">📝 {t('Концепция')}</div>
                  <div className="sp-fields">
                    <div className="sp-field sp-field--full">
                      <label className="sp-label">{t('Логлайн (1–2 предложения)')}</label>
                      <textarea className="sp-textarea" value={scriptParams.logline} placeholder={t('Краткое описание сюжета...')} rows={3}
                        onChange={(e) => setScriptParamsDraft(prev => ({ ...prev, logline: e.target.value }))}
                        onBlur={(e) => updateScriptParam('logline', e.target.value)} />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Уровень бюджета')}</label>
                      <select className="sp-select" value={scriptParams.budgetTier} onChange={(e) => updateScriptParam('budgetTier', e.target.value)}>
                        <option value="micro">{t('Микро (< 1 млн)')}</option>
                        <option value="low">{t('Малый (1–10 млн)')}</option>
                        <option value="mid">{t('Средний (10–100 млн)')}</option>
                        <option value="high">{t('Высокий (> 100 млн)')}</option>
                        <option value="blockbuster">{t('Блокбастер (500+ млн)')}</option>
                      </select>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">{t('Цветовая гамма')}</label>
                      <select className="sp-select" value={scriptParams.colorGrading} onChange={(e) => updateScriptParam('colorGrading', e.target.value)}>
                        {['Нейтральная','Тёплая','Холодная','Монохром','Высококонтрастная','Пастельная','Мрачная / тёмная'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'director' && (
            <div className="tab-content director-tab">

              {/* STORYBOARD — main work area */}
              <div className="storyboard-section">
                <div className="storyboard-toolbar">
                  <div className="storyboard-toolbar-left">
                    <h3>{t('Раскадровка')}</h3>
                    {storyboardGrid.locationNames.length > 0 && (
                      <span className="storyboard-dims">{storyboardGrid.locationNames.length} × {storyboardGrid.columnCount}</span>
                    )}
                  </div>
                  <div className="storyboard-toolbar-right">
                    <div className="storyboard-rows-ctrl">
                      <button className="storyboard-ctrl-btn" onClick={handleAddStoryboardRow}>+ {t('Локация')}</button>
                      <button className="storyboard-ctrl-btn storyboard-ctrl-btn--minus" onClick={handleRemoveStoryboardRow} disabled={storyboardGrid.locationNames.length === 0}>− {t('Строку')}</button>
                    </div>
                    <div className="storyboard-cols-ctrl">
                      <button className="storyboard-ctrl-btn storyboard-ctrl-btn--minus" onClick={handleRemoveStoryboardColumn} disabled={storyboardGrid.columnCount <= 1}>−</button>
                      <span className="storyboard-col-count">{storyboardGrid.columnCount} {t('кадров')}</span>
                      <button className="storyboard-ctrl-btn" onClick={handleAddStoryboardColumn}>+</button>
                    </div>
                  </div>
                </div>

                {storyboardGrid.locationNames.length === 0 ? (
                  <div className="storyboard-empty">
                    <div className="storyboard-empty-icon">🎬</div>
                    <div className="storyboard-empty-title">{t('Раскадровка пуста')}</div>
                    <div className="storyboard-empty-hint">{t('Добавьте локации кнопкой выше или задайте количество локаций на вкладке Сценарий')}</div>
                    <button className="add-marker-btn" style={{ marginTop: 16 }} onClick={handleAddStoryboardRow}>
                      <img src={AddMarkerIcon} alt="" className="add-marker-icon" />
                      {t('Добавить первую локацию')}
                    </button>
                  </div>
                ) : (
                  <div className="storyboard-table-wrap">
                    <table className="storyboard-table">
                      <thead>
                        <tr>
                          <th className="storyboard-th-loc">{t('Локация')}</th>
                          {Array.from({ length: storyboardGrid.columnCount }, (_, ci) => (
                            <th key={ci} className="storyboard-th-shot">{t('Кадр')} {ci + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {storyboardGrid.locationNames.map((locName, ri) => (
                          <tr key={ri}>
                            <td className="storyboard-row-label">
                              <input
                                className="storyboard-loc-input"
                                value={locName}
                                placeholder={`${t('Локация')} ${ri + 1}`}
                                onChange={(e) => renameStoryboardRow(ri, e.target.value)}
                                onBlur={() => saveStoryboardGrid(storyboardGrid)}
                              />
                            </td>
                            {Array.from({ length: storyboardGrid.columnCount }, (_, ci) => {
                              const key = `${ri}_${ci}`;
                              const cell = storyboardGrid.cells[key];
                              return (
                                <td key={ci} className={`storyboard-cell${cell?.imageUrl || cell?.description ? ' storyboard-cell--filled' : ''}`} onClick={() => openCellEditor(ri, ci)}>
                                  {cell?.imageUrl
                                    ? <img src={cell.imageUrl} alt="" className="storyboard-cell-img" />
                                    : <div className="storyboard-cell-add">+</div>}
                                  {cell?.shotType && <div className="storyboard-cell-type">{cell.shotType}</div>}
                                  {cell?.description && <div className="storyboard-cell-desc">{cell.description}</div>}
                                  {cell?.duration != null && cell.duration > 0 && <div className="storyboard-cell-dur">{cell.duration}с</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(() => {
                      const allCells = Object.values(storyboardGrid.cells);
                      const totalSec = allCells.reduce((s, c) => s + (c.duration || 0), 0);
                      const filled = allCells.filter(c => c.duration && c.duration > 0).length;
                      const totalCells = storyboardGrid.locationNames.length * storyboardGrid.columnCount;
                      const overload = totalSec > timelineDuration;
                      if (filled === 0) return null;
                      return (
                        <div className={`storyboard-timing-bar${overload ? ' storyboard-timing-bar--over' : ''}`}>
                          <span className="storyboard-timing-label">{t('Хронометраж')}:</span>
                          <span className="storyboard-timing-total" style={{ color: overload ? 'var(--error)' : tabColors.director }}>
                            {Math.floor(totalSec / 60)}:{String(totalSec % 60).padStart(2, '0')}
                          </span>
                          <span className="storyboard-timing-sep">/</span>
                          <span className="storyboard-timing-max">{Math.floor(timelineDuration / 60)}:{String(timelineDuration % 60).padStart(2, '0')}</span>
                          {overload && <span className="storyboard-timing-warn">⚠ {t('Превышение')}</span>}
                          <span className="storyboard-timing-coverage">{filled}/{totalCells} {t('кадров размечено')}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Secondary: timeline + notes */}
              <div className="director-secondary-row">
                <div className="director-secondary-card">
                  <div className="director-secondary-title">{t('Параметры таймлайна')}</div>
                  <div className="timeline-duration-form">
                    <input
                      className="form-input timeline-duration-input"
                      placeholder={t('Например 240 или 4:00')}
                      value={timelineDurationInput}
                      onChange={(e) => setTimelineDurationInput(e.target.value)}
                    />
                    <button className="save-notes-btn save-timeline-btn" onClick={handleSaveTimelineDuration}>
                      {t('Применить')}
                    </button>
                  </div>
                </div>

                <div className="director-secondary-card director-secondary-card--notes">
                  <div className="director-secondary-title">{t('Заметки режиссёра')}</div>
                  <textarea
                    className="director-notes-editor"
                    placeholder={t('Ваши заметки и идеи по съемке...')}
                    rows={5}
                    value={directorNotes}
                    onChange={(e) => setDirectorNotes(e.target.value)}
                  />
                  <div className="notes-actions">
                    <button className="save-notes-btn" onClick={handleSaveNotes}>{t('Сохранить')}</button>
                    <button className="share-notes-btn" onClick={handleShareNotes}>{t('Поделиться')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costumes' && (
            <div className="tab-content costumes-tab">
              <div className="costumes-container">
                <div className="markers-list-section">
                  <h3>{t('Маркеры костюмов')}</h3>
                  <div className="markers-description-list">
                    {bodyMarkers.filter((marker) => marker.tabId === 'costumes').length === 0 && (
                      <div className="body-markers-empty">
                        <img src={CostumesIcon} alt="" className="empty-tab-icon" />
                        <p>{t('Кликните на силуэт, чтобы добавить первый маркер')}</p>
                      </div>
                    )}
                    {bodyMarkers.filter((marker) => marker.tabId === 'costumes').map((marker) => (
                      <div
                        key={marker.id}
                        className="marker-description-card"
                        style={{ '--mc': marker.color } as React.CSSProperties}
                      >
                        <div className="marker-header">
                          <div className="marker-badge" style={{ backgroundColor: marker.color }}>
                            {marker.id}
                          </div>
                          <div className="marker-title">{marker.title}</div>
                          <button
                            className="edit-marker-btn"
                            title={t('Редактировать')}
                            onClick={() => {
                              setBodyMarkerDraft({
                                title: marker.title,
                                description: marker.description,
                                bodyPart: marker.bodyPart,
                                time: formatTime(getBodyMarkerTime(marker)),
                                x: marker.x,
                                y: marker.y,
                                tabId: marker.tabId,
                                personId: getMarkerPersonId(marker)
                              });
                              setBodyMarkerEditId(marker.id);
                              setShowBodyMarkerModal(true);
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                        <div className="marker-meta-row">
                          <span className="marker-part-badge">{marker.bodyPart || '—'}</span>
                          <span className="marker-person-label">
                            {getSilhouetteLabel(getMarkerPersonId(marker))}
                          </span>
                          <select
                            className={`body-marker-status-select body-marker-status--${marker.status || 'todo'}`}
                            value={marker.status || 'todo'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const newStatus = e.target.value as BodyMarker['status'];
                              const updated = (project?.bodyMarkers || []).map(m => m.id === marker.id ? { ...m, status: newStatus } : m);
                              saveProject({ bodyMarkers: updated } as Partial<Project>);
                            }}
                          >
                            <option value="todo">{t('Не начато')}</option>
                            <option value="in_progress">{t('В работе')}</option>
                            <option value="ready">{t('Готово')}</option>
                            <option value="approved">{t('Утверждено')}</option>
                          </select>
                        </div>
                        <div className="marker-description">{marker.description}</div>
                        <div className="marker-images">
                          {marker.images.length === 0 ? (
                            <button className="add-image-btn" onClick={() => handleAddBodyImage(marker.id)}>
                              <img src={UploadIcon} alt={t('Загрузить')} />
                              {t('Загрузить изображение')}
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
                      setBodyMarkerDraft({
                        title: '',
                        description: '',
                        bodyPart: '',
                        time: formatTime(currentTime),
                        x: 50,
                        y: 50,
                        tabId: 'costumes',
                        personId: bodySilhouettes[0]?.id || 1
                      });
                      setBodyMarkerEditId(null);
                      setShowBodyMarkerModal(true);
                    }}
                  >
                    <img src={AddMarkerIcon} alt={t('Добавить')} />
                    {t('Добавить описание маркера')}
                  </button>
                </div>

                <div className="human-silhouette-section">
                  <div className="silhouette-header">
                    <h3>{t('Силуэт человека')}</h3>
                    <button className="add-person-btn" onClick={handleAddSilhouette}>
                      {t('+ Добавить человека')}
                    </button>
                  </div>
                  <div className="silhouette-people-grid">
                    {bodySilhouettes.map((person) => (
                      <div key={`costumes-${person.id}`} className="silhouette-person-card">
                        <div className="silhouette-person-head">
                          <div className="silhouette-person-title">{person.name}</div>
                          <div className="silhouette-person-actions">
                            <button
                              type="button"
                              className="rename-person-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSilhouette(person.id);
                              }}
                              title={t('Переименовать')}
                            >
                              {t('Изм.')}
                            </button>
                            <button
                              type="button"
                              className="remove-person-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSilhouette(person.id);
                              }}
                              disabled={bodySilhouettes.length <= 1}
                              title={t('Удалить человека')}
                            >
                              {t('Удалить')}
                            </button>
                          </div>
                        </div>
                        <div className="silhouette-container">
                          <div
                            className="silhouette-wrapper"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = ((e.clientX - rect.left) / rect.width) * 100;
                              const y = ((e.clientY - rect.top) / rect.height) * 100;
                              setBodyMarkerDraft({
                                title: '',
                                description: '',
                                bodyPart: 'torso',
                                time: formatTime(currentTime),
                                x,
                                y,
                                tabId: 'costumes',
                                personId: person.id
                              });
                              setBodyMarkerEditId(null);
                              setShowBodyMarkerModal(true);
                            }}
                          >
                            <div className="body-zone-guides" aria-hidden="true">
                              <span className="body-zone" style={{ top: '4%' }}>{t('Голова')}</span>
                              <span className="body-zone" style={{ top: '22%' }}>{t('Плечи')}</span>
                              <span className="body-zone" style={{ top: '40%' }}>{t('Торс')}</span>
                              <span className="body-zone" style={{ top: '60%' }}>{t('Бёдра')}</span>
                              <span className="body-zone" style={{ top: '78%' }}>{t('Ноги')}</span>
                              <span className="body-zone" style={{ top: '94%' }}>{t('Стопы')}</span>
                            </div>
                            <img src={HumanSilhouette} alt={person.name} className="human-silhouette-img" />
                            {bodyMarkers
                              .filter((marker) => marker.tabId === 'costumes' && getMarkerPersonId(marker) === person.id)
                              .map((marker) => (
                                <div
                                  key={marker.id}
                                  className="body-marker"
                                  style={{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: marker.color }}
                                  title={`${marker.title} • ${person.name}`}
                                >
                                  <div className="marker-number">{marker.id}</div>
                                  <div className="marker-tooltip">
                                    <strong>{marker.title}</strong>
                                    <div>{marker.bodyPart}</div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="silhouette-instructions">{t('Кликните на силуэт, чтобы добавить маркер костюма')}</div>
                </div>

                <div className="costume-comments-section">
                  <h3>{t('Комментарии к костюмам')}</h3>
                <div className="comments-list">
                  {commentsByTab.costumes.length === 0 && (
                    <div className="empty-state">{t('Комментариев пока нет.')}</div>
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
                            {comment.resolved ? t('Решено') : t('Не решено')}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('costumes')}>
                            <img src={ReplyIcon} alt={t('Ответить')} />
                            {t('Ответить')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('costumes')}>
                    <img src={AddCommentIcon} alt={t('Добавить комментарий')} />
                    {t('Добавить комментарий')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'makeup' && (
            <div className="tab-content makeup-tab">
              <div className="makeup-container">
                <div className="markers-list-section">
                  <h3>{t('Маркеры визажа')}</h3>
                  <div className="markers-description-list">
                    {bodyMarkers.filter((marker) => marker.tabId === 'makeup').length === 0 && (
                      <div className="body-markers-empty">
                        <img src={MakeupIcon} alt="" className="empty-tab-icon" />
                        <p>{t('Кликните на лицо, чтобы добавить первую точку визажа')}</p>
                      </div>
                    )}
                    {bodyMarkers.filter((marker) => marker.tabId === 'makeup').map((marker) => (
                      <div
                        key={marker.id}
                        className="marker-description-card"
                        style={{ '--mc': marker.color } as React.CSSProperties}
                      >
                        <div className="marker-header">
                          <div className="marker-badge" style={{ backgroundColor: marker.color }}>
                            {marker.id}
                          </div>
                          <div className="marker-title">{marker.title}</div>
                          <button
                            className="edit-marker-btn"
                            title={t('Редактировать')}
                            onClick={() => {
                              setBodyMarkerDraft({
                                title: marker.title,
                                description: marker.description,
                                bodyPart: marker.bodyPart,
                                time: formatTime(getBodyMarkerTime(marker)),
                                x: marker.x,
                                y: marker.y,
                                tabId: marker.tabId,
                                personId: getMarkerPersonId(marker)
                              });
                              setBodyMarkerEditId(marker.id);
                              setShowBodyMarkerModal(true);
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                        <div className="marker-meta-row">
                          <span className="marker-part-badge">{marker.bodyPart || '—'}</span>
                          <span className="marker-person-label">
                            {getSilhouetteLabel(getMarkerPersonId(marker))}
                          </span>
                          <select
                            className={`body-marker-status-select body-marker-status--${marker.status || 'todo'}`}
                            value={marker.status || 'todo'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const newStatus = e.target.value as BodyMarker['status'];
                              const updated = (project?.bodyMarkers || []).map(m => m.id === marker.id ? { ...m, status: newStatus } : m);
                              saveProject({ bodyMarkers: updated } as Partial<Project>);
                            }}
                          >
                            <option value="todo">{t('Не начато')}</option>
                            <option value="in_progress">{t('В работе')}</option>
                            <option value="ready">{t('Готово')}</option>
                            <option value="approved">{t('Утверждено')}</option>
                          </select>
                        </div>
                        <div className="marker-description">{marker.description}</div>
                        <div className="marker-images">
                          {marker.images.length === 0 ? (
                            <button className="add-image-btn" onClick={() => handleAddBodyImage(marker.id)}>
                              <img src={UploadIcon} alt={t('Загрузить')} />
                              {t('Загрузить мокап')}
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
                      setBodyMarkerDraft({
                        title: '',
                        description: '',
                        bodyPart: 'face',
                        time: formatTime(currentTime),
                        x: 50,
                        y: 25,
                        tabId: 'makeup',
                        personId: bodySilhouettes[0]?.id || 1
                      });
                      setBodyMarkerEditId(null);
                      setShowBodyMarkerModal(true);
                    }}
                  >
                    <img src={AddMarkerIcon} alt={t('Добавить')} />
                    {t('Добавить описание визажа')}
                  </button>
                </div>

                <div className="human-silhouette-section">
                  <div className="silhouette-header">
                    <h3>{t('Силуэт для визажа')}</h3>
                    <button className="add-person-btn" onClick={handleAddSilhouette}>
                      {t('+ Добавить человека')}
                    </button>
                  </div>
                  <div className="silhouette-people-grid">
                    {bodySilhouettes.map((person) => (
                      <div key={`makeup-${person.id}`} className="silhouette-person-card">
                        <div className="silhouette-person-head">
                          <div className="silhouette-person-title">{person.name}</div>
                          <div className="silhouette-person-actions">
                            <button
                              type="button"
                              className="rename-person-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSilhouette(person.id);
                              }}
                              title={t('Переименовать')}
                            >
                              {t('Изм.')}
                            </button>
                            <button
                              type="button"
                              className="remove-person-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSilhouette(person.id);
                              }}
                              disabled={bodySilhouettes.length <= 1}
                              title={t('Удалить человека')}
                            >
                              {t('Удалить')}
                            </button>
                          </div>
                        </div>
                        <div className="silhouette-container">
                          <div
                            className="silhouette-wrapper face-silhouette-wrapper"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = ((e.clientX - rect.left) / rect.width) * 100;
                              const y = ((e.clientY - rect.top) / rect.height) * 100;
                              setBodyMarkerDraft({
                                title: '',
                                description: '',
                                bodyPart: 'face',
                                time: formatTime(currentTime),
                                x,
                                y,
                                tabId: 'makeup',
                                personId: person.id
                              });
                              setBodyMarkerEditId(null);
                              setShowBodyMarkerModal(true);
                            }}
                          >
                            <img src={FaceSilhouette} alt={person.name} className="face-silhouette-img" />
                            {bodyMarkers
                              .filter((marker) => marker.tabId === 'makeup' && getMarkerPersonId(marker) === person.id)
                              .map((marker) => (
                                <div
                                  key={marker.id}
                                  className="body-marker"
                                  style={{ left: `${marker.x}%`, top: `${marker.y}%`, backgroundColor: marker.color }}
                                  title={`${marker.title} • ${person.name}`}
                                >
                                  <div className="marker-number">{marker.id}</div>
                                  <div className="marker-tooltip">
                                    <strong>{marker.title}</strong>
                                    <div>{marker.bodyPart}</div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="silhouette-instructions">{t('Кликните на часть тела для добавления точки визажа')}</div>
                </div>

                <div className="makeup-comments-section">
                  <h3>{t('Комментарии к визажу')}</h3>
                <div className="comments-list">
                  {commentsByTab.makeup.length === 0 && (
                    <div className="empty-state">{t('Комментариев пока нет.')}</div>
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
                            {comment.resolved ? t('Решено') : t('Не решено')}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('makeup')}>
                            <img src={ReplyIcon} alt={t('Ответить')} />
                            {t('Ответить')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('makeup')}>
                    <img src={AddCommentIcon} alt={t('Добавить комментарий')} />
                    {t('Добавить комментарий')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="tab-content edit-tab">
              <div className="columns-container">
                <div className="column media-column">
                  <h3>{t('Медиатека')}</h3>
                  <div className="media-list">
                    {mediaFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className={`media-item ${selectedMedia?.id === file.id ? 'active' : ''}`}
                        onClick={() => setSelectedMediaId(file.id)}
                      >
                        <div className="media-icon">
                          <img src={file.type === 'audio' ? AudioIcon : VideoIcon} alt={file.type} />
                        </div>
                        <div className="media-info">
                          <div className="media-name">{file.name}</div>
                          <div className="media-duration">{file.duration} • {file.size}</div>
                        </div>
                      </button>
                    ))}
                    {mediaFiles.length === 0 && (
                      <div className="empty-state-rich">
                        <img src={VideoIcon} alt="" className="empty-state-icon" />
                        <div className="empty-state-text">{t('Медиафайлов пока нет')}</div>
                        <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={() => setShowMediaModal(true)}>{t('Добавить файл')}</button>
                      </div>
                    )}
                  </div>
                  <button className="upload-btn" onClick={() => setShowMediaModal(true)}>
                    <img src={UploadIcon} alt={t('Загрузить')} className="upload-icon" />
                    {t('Загрузить медиа')}
                  </button>
                </div>

                <div className="column preview-column">
                  <div className="video-preview">
                    {selectedMedia ? (
                      <div className="media-preview-card">
                        <div className="media-preview-head">
                          <img
                            src={selectedMedia.type === 'audio' ? AudioIcon : VideoIcon}
                            alt={selectedMedia.type}
                            className="preview-icon"
                          />
                          <div className="media-preview-titles">
                            <div className="media-preview-name">{selectedMedia.name}</div>
                            <div className="media-preview-meta">
                              {t('Тип: {type} • {duration} • {size}', {
                                type: selectedMedia.type,
                                duration: selectedMedia.duration,
                                size: selectedMedia.size
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="media-preview-progress">
                          <div
                            className="media-preview-progress-bar"
                            style={{ width: `${Math.min(100, (currentTime / Math.max(timelineDuration, 1)) * 100)}%` }}
                          />
                        </div>
                        <div className="media-preview-time">
                          {formatTime(currentTime)} / {formatTime(timelineDuration)}
                        </div>
                      </div>
                    ) : (
                      <div className="placeholder-video">
                        <img src={PreviewIcon} alt={t('Предпросмотр')} className="preview-icon" />
                        <div className="video-placeholder-text">{t('Выберите медиафайл для предпросмотра')}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="column comments-column">
                  <h3>{t('Комментарии к монтажу')}</h3>
                <div className="comments-list">
                  {commentsByTab.edit.length === 0 && (
                    <div className="empty-state">{t('Комментариев пока нет.')}</div>
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
                            {comment.resolved ? t('Решено') : t('Не решено')}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('edit')}>
                            <img src={ReplyIcon} alt={t('Ответить')} />
                            {t('Ответить')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('edit')}>
                    <img src={AddCommentIcon} alt={t('Добавить комментарий')} className="add-comment-icon" />
                    {t('Добавить комментарий')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="tab-content sound-tab">
              <div className="sound-layout">
                <div className="sound-markers-col">
                  <div className="sound-markers-head">
                    <h3>{t('Звуковые метки')}</h3>
                    <button className="add-marker-btn" onClick={() => setShowMarkerModal(true)}>
                      <img src={AddMarkerIcon} alt={t('Добавить')} className="add-marker-icon" />
                      {t('Добавить метку')}
                    </button>
                  </div>
                  <p className="sound-hint">{t('Переместите курсор таймлайна на нужную позицию, затем нажмите «Добавить метку».')}</p>
                  {soundMarkers.length === 0 ? (
                    <div className="empty-state-rich">
                      <img src={AudioIcon} alt="" className="empty-state-icon" />
                      <div className="empty-state-text">{t('Звуковых меток пока нет')}</div>
                      <button className="add-marker-btn" style={{ marginTop: 8 }} onClick={() => setShowMarkerModal(true)}>
                        {t('Добавить метку')}
                      </button>
                    </div>
                  ) : (
                    <div className="sound-markers-list">
                      {soundMarkers.map((marker) => (
                        <div
                          key={marker.id}
                          className="sound-marker-row"
                          onClick={() => handleOpenTimelineMarkerDetails(marker)}
                        >
                          <div className="sound-marker-time" style={{ color: tabColors.sound }}>
                            {formatTime(marker.time)}
                          </div>
                          <div className="sound-marker-info">
                            <div className="sound-marker-title">{marker.title}</div>
                            {marker.comment && <div className="sound-marker-desc">{marker.comment}</div>}
                          </div>
                          <div className="sound-marker-dot" style={{ background: tabColors.sound }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="column comments-column">
                  <h3>{t('Комментарии к звуку')}</h3>
                  <div className="comments-list">
                    {commentsByTab.sound.length === 0 && (
                      <div className="empty-state">{t('Комментариев пока нет.')}</div>
                    )}
                    {commentsByTab.sound.map((comment) => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <div className="user-badge" style={{ backgroundColor: tabColors.sound }}>
                            {comment.user}
                          </div>
                          <div className="comment-time">{comment.timestamp}</div>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-footer">
                          <span className="timestamp" onClick={() => handleToggleResolved(comment.id)}>
                            {comment.resolved ? t('Решено') : t('Не решено')}
                          </span>
                          <button className="reply-btn" onClick={() => openCommentModal('sound')}>
                            <img src={ReplyIcon} alt={t('Ответить')} />
                            {t('Ответить')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="add-comment-btn" onClick={() => openCommentModal('sound')}>
                    <img src={AddCommentIcon} alt={t('Добавить комментарий')} className="add-comment-icon" />
                    {t('Добавить комментарий')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manager' && (() => {
            const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'approved', 'changes', 'blocked'];
            const taskStatusLabel: Record<TaskStatus, string> = {
              todo: t('К выполнению'),
              in_progress: t('В работе'),
              review: t('На проверке'),
              approved: t('Утверждено'),
              changes: t('Правки'),
              blocked: t('Заблокировано')
            };
            const taskStatusColor: Record<TaskStatus, string> = {
              todo: '#6b7280',
              in_progress: '#2196F3',
              review: '#9C27B0',
              approved: '#22c55e',
              changes: '#FF9800',
              blocked: '#FF391A'
            };
            const priorityLabel: Record<TaskPriority, string> = {
              low: t('Низкий'),
              medium: t('Средний'),
              high: t('Высокий'),
              critical: t('Критический')
            };
            const priorityColor: Record<TaskPriority, string> = {
              low: '#6b7280',
              medium: '#2196F3',
              high: '#FF9800',
              critical: '#FF391A'
            };
            const deptNames: Partial<Record<TabType, string>> = {
              script: t('Сценарий'),
              director: t('Режиссёр'),
              costumes: t('Костюмы'),
              makeup: t('Визаж'),
              edit: t('Монтаж'),
              sound: t('Звук')
            };

            const totalTasks = tasks.length;
            const byStatus = TASK_STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
              acc[s] = tasks.filter(t => t.status === s).length;
              return acc;
            }, {});

            const visibleTasks = tasks.filter(task => {
              if (taskFilterStatus !== 'all' && task.status !== taskFilterStatus) return false;
              if (taskFilterDept !== 'all' && task.department !== taskFilterDept) return false;
              return true;
            });

            const deptTabs: TabType[] = ['script', 'director', 'costumes', 'makeup', 'edit', 'sound'];
            const healthByDept = deptTabs.map(dep => {
              const depTasks = tasks.filter(t => t.department === dep);
              const done = depTasks.filter(t => t.status === 'approved').length;
              const blocked = depTasks.filter(t => t.status === 'blocked').length;
              const pct = depTasks.length > 0 ? Math.round((done / depTasks.length) * 100) : 0;
              return { dep, total: depTasks.length, done, blocked, pct };
            });

            return (
              <div className="tab-content manager-tab">
                <div className="manager-layout">
                  {/* Health dashboard */}
                  <div className="manager-health-section">
                    <div className="manager-section-title">{t('Здоровье проекта')}</div>
                    <div className="manager-health-grid">
                      {healthByDept.map(({ dep, total, done, blocked, pct }) => (
                        <div key={dep} className={`manager-health-card${blocked > 0 ? ' manager-health-card--blocked' : ''}`}>
                          <div className="manager-health-card-head">
                            <img src={iconMap[dep]} alt="" className="manager-health-icon" style={{ filter: `drop-shadow(0 0 3px ${tabColors[dep]})` }} />
                            <span className="manager-health-dept" style={{ color: tabColors[dep] }}>{deptNames[dep]}</span>
                            {blocked > 0 && <span className="manager-health-blocked-badge">⛔ {blocked}</span>}
                          </div>
                          <div className="manager-health-bar-wrap">
                            <div className="manager-health-bar" style={{ width: `${pct}%`, background: blocked > 0 ? '#FF391A' : tabColors[dep] }} />
                          </div>
                          <div className="manager-health-stats">
                            <span>{done}/{total} {t('готово')}</span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status summary */}
                  <div className="manager-status-row">
                    {TASK_STATUS_ORDER.map(s => (
                      <div key={s} className="manager-status-pill" style={{ borderColor: taskStatusColor[s] }}>
                        <span className="manager-status-count" style={{ color: taskStatusColor[s] }}>{byStatus[s] || 0}</span>
                        <span className="manager-status-name">{taskStatusLabel[s]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Task board */}
                  <div className="manager-task-head">
                    <div className="manager-section-title">{t('Задачи')} ({visibleTasks.length}/{totalTasks})</div>
                    <button className="add-marker-btn" onClick={handleOpenNewTask}>
                      <img src={AddMarkerIcon} alt="" className="add-marker-icon" />
                      {t('Новая задача')}
                    </button>
                  </div>

                  {/* Filters */}
                  <div className="manager-filters">
                    <div className="manager-filter-group">
                      <button className={`manager-filter-chip${taskFilterStatus === 'all' ? ' manager-filter-chip--active' : ''}`} onClick={() => setTaskFilterStatus('all')}>{t('Все')}</button>
                      {TASK_STATUS_ORDER.map(s => (
                        <button key={s} className={`manager-filter-chip${taskFilterStatus === s ? ' manager-filter-chip--active' : ''}`} style={taskFilterStatus === s ? { borderColor: taskStatusColor[s], color: taskStatusColor[s] } : {}} onClick={() => setTaskFilterStatus(taskFilterStatus === s ? 'all' : s)}>
                          {taskStatusLabel[s]} {byStatus[s] > 0 && <span className="manager-filter-count">{byStatus[s]}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="manager-filter-group">
                      <button className={`manager-filter-chip${taskFilterDept === 'all' ? ' manager-filter-chip--active' : ''}`} onClick={() => setTaskFilterDept('all')}>{t('Все отделы')}</button>
                      {(Object.keys(deptNames) as TabType[]).map(dep => (
                        <button key={dep} className={`manager-filter-chip${taskFilterDept === dep ? ' manager-filter-chip--active' : ''}`} style={taskFilterDept === dep ? { borderColor: tabColors[dep], color: tabColors[dep] } : {}} onClick={() => setTaskFilterDept(taskFilterDept === dep ? 'all' : dep)}>
                          {deptNames[dep]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="manager-empty-state">
                      <img src={ManagerIcon} alt="" style={{ width: 48, opacity: 0.3, marginBottom: 12 }} />
                      <div>{t('Задач пока нет')}</div>
                      <button className="add-marker-btn" onClick={handleOpenNewTask}>{t('Создать первую задачу')}</button>
                    </div>
                  ) : visibleTasks.length === 0 ? (
                    <div className="empty-state">{t('Нет задач по выбранным фильтрам')}</div>
                  ) : (
                    <div className="manager-task-list">
                      {visibleTasks.map(task => (
                        <div
                          key={task.id}
                          className={`manager-task-card${task.status === 'blocked' ? ' manager-task-card--blocked' : ''}${dragTaskId === task.id ? ' manager-task-card--dragging' : ''}`}
                          draggable
                          onDragStart={() => setDragTaskId(task.id)}
                          onDragEnd={() => setDragTaskId(null)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={async () => {
                            if (!dragTaskId || dragTaskId === task.id) return;
                            const from = tasks.findIndex(t => t.id === dragTaskId);
                            const to = tasks.findIndex(t => t.id === task.id);
                            if (from === -1 || to === -1) return;
                            const reordered = [...tasks];
                            const [moved] = reordered.splice(from, 1);
                            reordered.splice(to, 0, moved);
                            await saveTasks(reordered);
                            setDragTaskId(null);
                          }}
                        >
                          <div className="manager-task-card-top">
                            <span className="manager-task-priority-dot" style={{ background: priorityColor[task.priority] }} title={priorityLabel[task.priority]} />
                            <span className="manager-task-title">{task.title}</span>
                            <div className="manager-task-actions">
                              <button className="edit-marker-btn" onClick={() => handleOpenEditTask(task)} title={t('Редактировать')}>✏️</button>
                              <button className="edit-marker-btn" style={{ color: 'var(--error)' }} onClick={() => handleDeleteTask(task.id)} title={t('Удалить')}>🗑</button>
                            </div>
                          </div>
                          {task.description && <div className="manager-task-desc">{task.description}</div>}
                          <div className="manager-task-meta">
                            <span className="manager-task-dept" style={{ color: tabColors[task.department] || '#888' }}>
                              {deptNames[task.department] || task.department}
                            </span>
                            {task.assignee && <span className="manager-task-assignee">👤 {task.assignee}</span>}
                            {task.sceneRef && <span className="manager-task-scene">🎬 {task.sceneRef}</span>}
                            <select
                              className={`manager-task-status-select manager-task-status--${task.status}`}
                              value={task.status}
                              onClick={e => e.stopPropagation()}
                              onChange={e => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
                              style={{ borderColor: taskStatusColor[task.status], color: taskStatusColor[task.status] }}
                            >
                              {TASK_STATUS_ORDER.map(s => (
                                <option key={s} value={s}>{taskStatusLabel[s]}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <nav className="project-mobile-tabs" aria-label="Разделы проекта">
        {mobileTabs.map((tab) => (
          <button
            key={`mobile-${tab.id}`}
            className={`project-mobile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ ['--tab-accent' as const]: tabColors[tab.id] } as React.CSSProperties}
          >
            <img
              src={tab.icon}
              alt={mobileTabAriaNames[tab.id]}
              className="project-mobile-tab-icon"
            />
            <span className="project-mobile-tab-label">{t(tab.label)}</span>
          </button>
        ))}
      </nav>

      {/* Task modal */}
      <Modal
        title={taskEditId ? t('Редактировать задачу') : t('Новая задача')}
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowTaskModal(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveTask}>{t('Сохранить')}</button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название задачи')}
          value={taskDraft.title}
          onChange={e => setTaskDraft(prev => ({ ...prev, title: e.target.value }))}
        />
        <textarea
          className="form-input"
          placeholder={t('Описание (необязательно)')}
          value={taskDraft.description}
          onChange={e => setTaskDraft(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Отдел')}</div>
            <select className="form-input" value={taskDraft.department} onChange={e => setTaskDraft(prev => ({ ...prev, department: e.target.value as TabType }))}>
              {(['script', 'director', 'costumes', 'makeup', 'edit', 'sound'] as TabType[]).map(dep => (
                <option key={dep} value={dep}>{tabNames[dep]}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="form-label">{t('Приоритет')}</div>
            <select className="form-input" value={taskDraft.priority} onChange={e => setTaskDraft(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}>
              <option value="low">{t('Низкий')}</option>
              <option value="medium">{t('Средний')}</option>
              <option value="high">{t('Высокий')}</option>
              <option value="critical">{t('Критический')}</option>
            </select>
          </div>
        </div>
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Статус')}</div>
            <select className="form-input" value={taskDraft.status} onChange={e => setTaskDraft(prev => ({ ...prev, status: e.target.value as TaskStatus }))}>
              <option value="todo">{t('К выполнению')}</option>
              <option value="in_progress">{t('В работе')}</option>
              <option value="review">{t('На проверке')}</option>
              <option value="approved">{t('Утверждено')}</option>
              <option value="changes">{t('Правки')}</option>
              <option value="blocked">{t('Заблокировано')}</option>
            </select>
          </div>
          <div>
            <div className="form-label">{t('Исполнитель')}</div>
            <input className="form-input" placeholder={t('Имя или никнейм')} value={taskDraft.assignee} onChange={e => setTaskDraft(prev => ({ ...prev, assignee: e.target.value }))} />
          </div>
        </div>
        <input className="form-input" placeholder={t('Сцена / тайм-код (необязательно)')} value={taskDraft.sceneRef} onChange={e => setTaskDraft(prev => ({ ...prev, sceneRef: e.target.value }))} />
      </Modal>

      {/* Cell editor modal */}
      <Modal
        title={`${t('Кадр')} ${cellEditorCol + 1} — ${storyboardGrid.locationNames[cellEditorRow] || ''}`}
        isOpen={cellEditorOpen}
        onClose={() => setCellEditorOpen(false)}
        actions={
          <>
            <button className="secondary-btn" style={{ marginRight: 'auto', color: 'var(--error)' }} onClick={handleDeleteCell}>{t('Очистить')}</button>
            <button className="secondary-btn" onClick={() => setCellEditorOpen(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveCell}>{t('Сохранить')}</button>
          </>
        }
      >
        <div className="cell-editor">
          <div className="cell-editor-img-row">
            {cellEditorDraft.imageUrl ? (
              <div className="cell-editor-preview">
                <img src={cellEditorDraft.imageUrl} alt="" className="cell-editor-img" />
                <button className="cell-editor-remove-img" onClick={() => setCellEditorDraft(prev => ({ ...prev, imageUrl: '' }))}>{t('Удалить фото')}</button>
              </div>
            ) : (
              <label className="cell-editor-upload-btn">
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCellImageUpload} />
                <span>📷 {t('Добавить фото')}</span>
              </label>
            )}
          </div>
          <select className="form-input" value={cellEditorDraft.shotType} onChange={(e) => setCellEditorDraft(prev => ({ ...prev, shotType: e.target.value }))}>
            <option value="">{t('Тип плана...')}</option>
            {[t('Общий план (ОП)'), t('Средний план (СП)'), t('Крупный план (КП)'), t('Деталь (Д)'), t('Субъективная камера'), t('Панорама'), t('Вид сверху'), t('Вид снизу'), t('Движение вперёд (трекинг)')].map(v => <option key={v}>{v}</option>)}
          </select>
          <div className="cell-editor-duration-row">
            <label className="cell-editor-duration-label">{t('Длительность кадра, сек')}:</label>
            <input
              type="number"
              className="form-input cell-editor-duration-input"
              min={0}
              max={9999}
              placeholder="0"
              value={cellEditorDraft.duration ?? ''}
              onChange={(e) => setCellEditorDraft(prev => ({ ...prev, duration: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value) || 0) }))}
            />
          </div>
          <textarea
            className="form-input"
            placeholder={t('Описание кадра: действие, персонажи, атмосфера...')}
            value={cellEditorDraft.description}
            onChange={(e) => setCellEditorDraft(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
          />
        </div>
      </Modal>

      <Modal
        title={t('Новый маркер')}
        isOpen={showMarkerModal}
        onClose={() => {
          setShowMarkerModal(false);
          setMarkerTitle('');
          setMarkerComment('');
        }}
        actions={
          <>
            <button
              className="secondary-btn"
              onClick={() => {
                setShowMarkerModal(false);
                setMarkerTitle('');
                setMarkerComment('');
              }}
            >
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleCreateMarker}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название маркера')}
          value={markerTitle}
          onChange={(e) => setMarkerTitle(e.target.value)}
        />
        <textarea
          className="form-input"
          placeholder={t('Комментарий маркера')}
          value={markerComment}
          onChange={(e) => setMarkerComment(e.target.value)}
          rows={4}
        />
        <div className="form-helper">{t('Текущая позиция: {time}', { time: formatTime(currentTime) })}</div>
      </Modal>

      <Modal
        title={t('Данные маркера')}
        isOpen={showTimelineMarkerModal && Boolean(selectedTimelineMarker)}
        onClose={() => {
          setShowTimelineMarkerModal(false);
          setSelectedTimelineMarker(null);
        }}
        actions={
          <button
            className="primary-btn"
            onClick={() => {
              setShowTimelineMarkerModal(false);
              setSelectedTimelineMarker(null);
            }}
          >
            {t('Закрыть')}
          </button>
        }
      >
        {selectedTimelineMarker && (
          <div className="timeline-marker-details">
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">ID</span>
              <span className="timeline-marker-value">{selectedTimelineMarker.id}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Название')}</span>
              <span className="timeline-marker-value">{selectedTimelineMarker.title}</span>
            </div>
            <div className="timeline-marker-row multiline">
              <span className="timeline-marker-label">{t('Комментарий')}</span>
              <span className="timeline-marker-value">{selectedTimelineMarker.comment || t('Не указано')}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Время')}</span>
              <span className="timeline-marker-value">{formatTime(selectedTimelineMarker.time)}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Раздел')}</span>
              <span className="timeline-marker-value">{t(tabNames[selectedTimelineMarker.tabId])}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Автор')}</span>
              <span className="timeline-marker-value">{selectedTimelineMarker.user}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Тип иконки')}</span>
              <span className="timeline-marker-value">{selectedTimelineMarker.icon}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Цвет')}</span>
              <span className="timeline-marker-color-value">
                <span
                  className="timeline-marker-color-chip"
                  style={{ backgroundColor: selectedTimelineMarker.color }}
                />
                {selectedTimelineMarker.color}
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={t('Подтвердите уменьшение таймлайна')}
        isOpen={showTimelineDurationConfirm && pendingTimelineDuration !== null}
        onClose={() => {
          setShowTimelineDurationConfirm(false);
          setPendingTimelineDuration(null);
        }}
        actions={
          <>
            <button
              className="secondary-btn"
              onClick={() => {
                setShowTimelineDurationConfirm(false);
                setPendingTimelineDuration(null);
              }}
            >
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleConfirmTimelineShrink}>
              {t('Применить')}
            </button>
          </>
        }
      >
        {pendingTimelineDuration !== null && (
          <>
            <div>{t('Текущая длина таймлайна: {duration}', { duration: formatTime(timelineDuration) })}</div>
            <div>{t('Новая длина таймлайна: {duration}', { duration: formatTime(pendingTimelineDuration) })}</div>
            <div className="form-helper">
              {t(
                'Новая длина меньше существующих маркеров и кадров. Их позиции будут автоматически сдвинуты в пределы новой длины.'
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal
        title={t('Подтвердите удаление человека')}
        isOpen={Boolean(pendingSilhouetteRemoval)}
        onClose={() => setPendingSilhouetteRemoval(null)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setPendingSilhouetteRemoval(null)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleConfirmSilhouetteRemoval}>
              {t('Удалить')}
            </button>
          </>
        }
      >
        {pendingSilhouetteRemoval && (
          <>
            <div>{t('Будет удален: {name}', { name: pendingSilhouetteRemoval.personName })}</div>
            {pendingSilhouetteRemoval.relatedMarkersCount > 0 && (
              <div className="form-helper">
                {t('Связанные body-маркеры будут удалены: {count}', {
                  count: pendingSilhouetteRemoval.relatedMarkersCount
                })}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        title={t('Новый комментарий')}
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setCommentText('');
        }}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowCommentModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleAddComment}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <textarea
          className="form-input"
          placeholder={t('Введите комментарий')}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={4}
        />
      </Modal>

      <Modal
        title={t('Новая локация')}
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowLocationModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleAddLocation}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название локации')}
          value={locationDraft.name}
          onChange={(e) => setLocationDraft({ ...locationDraft, name: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder={t('Описание')}
          rows={3}
          value={locationDraft.description}
          onChange={(e) => setLocationDraft({ ...locationDraft, description: e.target.value })}
        />
      </Modal>

      <Modal
        title={t('Новый кадр')}
        isOpen={showShotModal}
        onClose={() => setShowShotModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowShotModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleAddShot}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Время (сек или мм:сс)')}
          value={shotDraft.time}
          onChange={(e) => setShotDraft({ ...shotDraft, time: e.target.value })}
        />
        <input
          className="form-input"
          placeholder={t('Название кадра')}
          value={shotDraft.title}
          onChange={(e) => setShotDraft({ ...shotDraft, title: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder={t('Описание')}
          rows={3}
          value={shotDraft.description}
          onChange={(e) => setShotDraft({ ...shotDraft, description: e.target.value })}
        />
      </Modal>

      <Modal
        title={t('Добавить медиа')}
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowMediaModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleAddMedia}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название файла')}
          value={mediaDraft.name}
          onChange={(e) => setMediaDraft({ ...mediaDraft, name: e.target.value })}
        />
        <select
          className="form-input"
          value={mediaDraft.type}
          onChange={(e) => setMediaDraft({ ...mediaDraft, type: e.target.value })}
        >
          <option value="video">{t('Видео')}</option>
          <option value="audio">{t('Аудио')}</option>
          <option value="other">{t('Другое')}</option>
        </select>
        <input
          className="form-input"
          placeholder={t('Длительность (например 1:45)')}
          value={mediaDraft.duration}
          onChange={(e) => setMediaDraft({ ...mediaDraft, duration: e.target.value })}
        />
        <input
          className="form-input"
          placeholder={t('Размер файла (например 120 MB)')}
          value={mediaDraft.size}
          onChange={(e) => setMediaDraft({ ...mediaDraft, size: e.target.value })}
        />
      </Modal>

      <Modal
        title={t('Добавить документ')}
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowDocModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleAddDocument}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название документа')}
          value={docDraft.name}
          onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })}
        />
        <input
          className="form-input"
          placeholder={t('Размер')}
          value={docDraft.size}
          onChange={(e) => setDocDraft({ ...docDraft, size: e.target.value })}
        />
        <input
          className="form-input"
          placeholder={t('Загрузил')}
          value={docDraft.uploadedBy}
          onChange={(e) => setDocDraft({ ...docDraft, uploadedBy: e.target.value })}
        />
      </Modal>

      <Modal
        title={t('Просмотр документа')}
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        actions={
          <button className="primary-btn" onClick={() => setPreviewDocument(null)}>
            {t('Закрыть')}
          </button>
        }
      >
        {previewDocument && (
          <div className="timeline-marker-details">
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Название')}</span>
              <span className="timeline-marker-value">{previewDocument.name}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Размер')}</span>
              <span className="timeline-marker-value">{previewDocument.size}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Загрузил')}</span>
              <span className="timeline-marker-value">{previewDocument.uploadedBy}</span>
            </div>
            <div className="timeline-marker-row">
              <span className="timeline-marker-label">{t('Дата')}</span>
              <span className="timeline-marker-value">{previewDocument.uploadedAt}</span>
            </div>
            <div className="form-helper">{t('Предпросмотр содержимого документа появится здесь.')}</div>
          </div>
        )}
      </Modal>

      <Modal
        title={t('Маркер')}
        isOpen={showBodyMarkerModal}
        onClose={() => {
          setShowBodyMarkerModal(false);
          setBodyMarkerEditId(null);
        }}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowBodyMarkerModal(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleAddBodyMarker}>
              {t('Добавить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название')}
          value={bodyMarkerDraft.title}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, title: e.target.value })}
        />
        <input
          className="form-input"
          placeholder={t('Часть тела')}
          value={bodyMarkerDraft.bodyPart}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, bodyPart: e.target.value })}
        />
        <input
          className="form-input"
          placeholder={t('Время (сек или мм:сс)')}
          value={bodyMarkerDraft.time}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, time: e.target.value })}
        />
        <select
          className="form-input"
          value={bodyMarkerDraft.personId}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, personId: Number(e.target.value) })}
        >
          {bodySilhouettes.map((person) => (
            <option key={`person-option-${person.id}`} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <textarea
          className="form-input"
          placeholder={t('Описание')}
          rows={3}
          value={bodyMarkerDraft.description}
          onChange={(e) => setBodyMarkerDraft({ ...bodyMarkerDraft, description: e.target.value })}
        />
      </Modal>

      <Modal
        title={t('Настройки проекта')}
        isOpen={showProjectSettings}
        onClose={() => setShowProjectSettings(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowProjectSettings(false)}>
              {t('Отмена')}
            </button>
            <button className="primary-btn" onClick={handleSaveProjectSettings}>
              {t('Сохранить')}
            </button>
          </>
        }
      >
        <input
          className="form-input"
          placeholder={t('Название проекта')}
          value={projectDraft.name}
          onChange={(e) => setProjectDraft({ ...projectDraft, name: e.target.value })}
        />
        <textarea
          className="form-input"
          placeholder={t('Описание')}
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
