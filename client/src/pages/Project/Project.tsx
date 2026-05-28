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
  LookStatus,
  MakeupLook,
  MakeupZone,
  CostumeOutfit,
  GarmentCategory,
  GarmentAcquisition,

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

import ScriptTab from './tabs/ScriptTab';
import DirectorTab from './tabs/DirectorTab';
import CostumesTab from './tabs/CostumesTab';
import MakeupTab from './tabs/MakeupTab';
import EditTab from './tabs/EditTab';
import SoundTab from './tabs/SoundTab';
import ManagerTab from './tabs/ManagerTab';

// Импорт иконок
import {
  Play, Pause, Music, MapPin, MapPinPlus,
  ArrowLeft, Clapperboard, Sparkles,
  ScrollText, Shirt, Zap, ClipboardList, Clock, CalendarDays,
  type LucideIcon
} from 'lucide-react';

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

const mobileTabs: Array<{ id: TabType; label: string; Icon: LucideIcon }> = [
  { id: 'script', label: 'Сценарий', Icon: ScrollText },
  { id: 'director', label: 'Режиссёр', Icon: Clapperboard },
  { id: 'costumes', label: 'Костюмер', Icon: Shirt },
  { id: 'makeup', label: 'Визажист', Icon: Sparkles },
  { id: 'edit', label: 'Монтажер', Icon: Zap },
  { id: 'sound', label: 'Звукорежиссёр', Icon: Music },
  { id: 'manager', label: 'Менеджер', Icon: ClipboardList }
];


const iconMap: Record<string, LucideIcon> = {
  director: Clapperboard,
  script: ScrollText,
  makeup: Sparkles,
  costumes: Shirt,
  edit: Zap,
  sound: Music,
  manager: ClipboardList
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
  const [kanbanDragOver, setKanbanDragOver] = useState<TaskStatus | null>(null);
  const [managerView, setManagerView] = useState<'list' | 'kanban'>('list');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDraft, setTaskDraft] = useState<{ title: string; description: string; status: TaskStatus; priority: TaskPriority; department: TabType; assignee: string; sceneRef: string; dueDate: string }>({
    title: '', description: '', status: 'todo', priority: 'medium', department: 'edit', assignee: '', sceneRef: '', dueDate: ''
  });
  const [taskEditId, setTaskEditId] = useState<string | null>(null);

  // Makeup looks
  const [makeupLooks, setMakeupLooks] = useState<MakeupLook[]>([]);
  const [selectedLookId, setSelectedLookId] = useState<number | null>(null);
  const [showLookModal, setShowLookModal] = useState(false);
  const [lookEditId, setLookEditId] = useState<number | null>(null);
  const [lookDraft, setLookDraft] = useState<{ name: string; characterName: string; sceneRefs: string; applyTimeMin: number; skinNotes: string; status: LookStatus }>({
    name: '', characterName: '', sceneRefs: '', applyTimeMin: 30, skinNotes: '', status: 'todo'
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [productEditId, setProductEditId] = useState<number | null>(null);
  const [productTargetLookId, setProductTargetLookId] = useState<number | null>(null);
  const [productDraft, setProductDraft] = useState<{ zone: MakeupZone; productName: string; colorHex: string; technique: string }>({
    zone: 'skin', productName: '', colorHex: '#F5D5C0', technique: ''
  });

  // Costume outfits
  const [costumeOutfits, setCostumeOutfits] = useState<CostumeOutfit[]>([]);
  const [selectedOutfitId, setSelectedOutfitId] = useState<number | null>(null);
  const [showOutfitModal, setShowOutfitModal] = useState(false);
  const [outfitEditId, setOutfitEditId] = useState<number | null>(null);
  const [outfitDraft, setOutfitDraft] = useState<{ name: string; characterName: string; sceneRefs: string; outfitNotes: string; status: LookStatus }>({
    name: '', characterName: '', sceneRefs: '', outfitNotes: '', status: 'todo'
  });
  const [showGarmentModal, setShowGarmentModal] = useState(false);
  const [garmentEditId, setGarmentEditId] = useState<number | null>(null);
  const [garmentTargetOutfitId, setGarmentTargetOutfitId] = useState<number | null>(null);
  const [garmentDraft, setGarmentDraft] = useState<{ category: GarmentCategory; name: string; colorHex: string; material: string; brand: string; acquisition: GarmentAcquisition; price: number; notes: string }>({
    category: 'top', name: '', colorHex: '#333333', material: '', brand: '', acquisition: 'to_buy', price: 0, notes: ''
  });

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
    setMakeupLooks(Array.isArray((project as any).makeupLooks) ? (project as any).makeupLooks : []);
    setCostumeOutfits(Array.isArray((project as any).costumeOutfits) ? (project as any).costumeOutfits : []);
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

  const resolveMarkerIcon = (marker: ProjectMarker): LucideIcon => {
    return iconMap[marker.icon] || MapPin;
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
    setTaskDraft({ title: '', description: '', status: 'todo', priority: 'medium', department: 'edit', assignee: '', sceneRef: '', dueDate: '' });
    setTaskEditId(null);
    setShowTaskModal(true);
  };

  // ── Makeup helpers ───────────────────────────────────────────────────────────

  const saveMakeupLooks = async (looks: MakeupLook[]) => {
    setMakeupLooks(looks);
    await saveProject({ makeupLooks: looks } as Partial<Project>);
  };

  const handleSaveLook = async () => {
    if (!lookDraft.name.trim()) { showToast(t('Введите название образа'), 'error'); return; }
    const now = Date.now();
    const updatedLooks = lookEditId
      ? makeupLooks.map(l => l.id === lookEditId ? { ...l, ...lookDraft } : l)
      : [...makeupLooks, { id: now, ...lookDraft, products: [], referenceImage: '' }];
    await saveMakeupLooks(updatedLooks);
    if (!lookEditId) setSelectedLookId(now);
    setShowLookModal(false);
  };

  const handleDeleteLook = async (id: number) => {
    const updated = makeupLooks.filter(l => l.id !== id);
    if (selectedLookId === id) setSelectedLookId(updated[0]?.id ?? null);
    await saveMakeupLooks(updated);
  };

  const handleSaveProduct = async () => {
    if (!productDraft.productName.trim()) { showToast(t('Введите название продукта'), 'error'); return; }
    if (productTargetLookId == null) return;
    const now = Date.now();
    const updatedLooks = makeupLooks.map(l => {
      if (l.id !== productTargetLookId) return l;
      const products = productEditId
        ? l.products.map(p => p.id === productEditId ? { ...p, ...productDraft } : p)
        : [...l.products, { id: now, ...productDraft }];
      return { ...l, products };
    });
    await saveMakeupLooks(updatedLooks);
    setShowProductModal(false);
  };

  const handleDeleteProduct = async (lookId: number, productId: number) => {
    const updatedLooks = makeupLooks.map(l =>
      l.id === lookId ? { ...l, products: l.products.filter(p => p.id !== productId) } : l
    );
    await saveMakeupLooks(updatedLooks);
  };

  const handleLookRefImage = async (lookId: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const img = await compressImage(file, 480, 320);
        const updatedLooks = makeupLooks.map(l => l.id === lookId ? { ...l, referenceImage: img } : l);
        await saveMakeupLooks(updatedLooks);
      } catch { showToast(t('Ошибка загрузки изображения'), 'error'); }
    };
    input.click();
  };

  const handleLookStatusChange = async (lookId: number, status: LookStatus) => {
    const updatedLooks = makeupLooks.map(l => l.id === lookId ? { ...l, status } : l);
    await saveMakeupLooks(updatedLooks);
  };

  // ── Costumes helpers ─────────────────────────────────────────────────────────

  const saveCostumeOutfits = async (outfits: CostumeOutfit[]) => {
    setCostumeOutfits(outfits);
    await saveProject({ costumeOutfits: outfits } as Partial<Project>);
  };

  const handleSaveOutfit = async () => {
    if (!outfitDraft.name.trim()) { showToast(t('Введите название образа'), 'error'); return; }
    const now = Date.now();
    const updatedOutfits = outfitEditId
      ? costumeOutfits.map(o => o.id === outfitEditId ? { ...o, ...outfitDraft } : o)
      : [...costumeOutfits, { id: now, ...outfitDraft, garments: [], referenceImage: '' }];
    await saveCostumeOutfits(updatedOutfits);
    if (!outfitEditId) setSelectedOutfitId(now);
    setShowOutfitModal(false);
  };

  const handleDeleteOutfit = async (id: number) => {
    const updated = costumeOutfits.filter(o => o.id !== id);
    if (selectedOutfitId === id) setSelectedOutfitId(updated[0]?.id ?? null);
    await saveCostumeOutfits(updated);
  };

  const handleSaveGarment = async () => {
    if (!garmentDraft.name.trim()) { showToast(t('Введите название элемента'), 'error'); return; }
    if (garmentTargetOutfitId == null) return;
    const now = Date.now();
    const updatedOutfits = costumeOutfits.map(o => {
      if (o.id !== garmentTargetOutfitId) return o;
      const garments = garmentEditId
        ? o.garments.map(g => g.id === garmentEditId ? { ...g, ...garmentDraft } : g)
        : [...o.garments, { id: now, ...garmentDraft }];
      return { ...o, garments };
    });
    await saveCostumeOutfits(updatedOutfits);
    setShowGarmentModal(false);
  };

  const handleDeleteGarment = async (outfitId: number, garmentId: number) => {
    const updatedOutfits = costumeOutfits.map(o =>
      o.id === outfitId ? { ...o, garments: o.garments.filter(g => g.id !== garmentId) } : o
    );
    await saveCostumeOutfits(updatedOutfits);
  };

  const handleOutfitRefImage = async (outfitId: number) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const img = await compressImage(file, 480, 320);
        const updatedOutfits = costumeOutfits.map(o => o.id === outfitId ? { ...o, referenceImage: img } : o);
        await saveCostumeOutfits(updatedOutfits);
      } catch { showToast(t('Ошибка загрузки изображения'), 'error'); }
    };
    input.click();
  };

  const handleOutfitStatusChange = async (outfitId: number, status: LookStatus) => {
    const updatedOutfits = costumeOutfits.map(o => o.id === outfitId ? { ...o, status } : o);
    await saveCostumeOutfits(updatedOutfits);
  };

  const handleOpenEditTask = (task: Task) => {
    setTaskDraft({ title: task.title, description: task.description, status: task.status, priority: task.priority, department: task.department, assignee: task.assignee || '', sceneRef: task.sceneRef || '', dueDate: task.dueDate || '' });
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

  const handleUploadMedia = async (file: File, duration: string) => {
    if (!project) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duration', duration);
      const result = await projectsApi.uploadMedia(project.id, formData);
      if (result.project) setProject(result.project);
      showToast(t('Файл загружен'), 'success');
    } catch {
      showToast(t('Ошибка загрузки файла'), 'error');
    }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (!project) return;
    try {
      const result = await projectsApi.deleteMedia(project.id, mediaId);
      if (result.project) setProject(result.project);
      if (selectedMediaId === mediaId) setSelectedMediaId(null);
      showToast(t('Файл удалён'), 'success');
    } catch {
      showToast(t('Ошибка удаления файла'), 'error');
    }
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
        backButtonIcon={ArrowLeft}
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
            {isPlaying ? <Pause size={14} className="play-icon" /> : <Play size={14} className="play-icon" />}
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
                  {(() => { const MIcon = resolveMarkerIcon(marker); return <MIcon size={13} className="marker-icon" />; })()}
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
            <MapPinPlus size={15} className="tl-action-icon" />
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
              {(() => { const TIcon = iconMap[tabId]; return TIcon ? <TIcon size={16} className="tab-btn-icon" /> : null; })()}
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
            <ScriptTab
              t={t}
              scriptParams={scriptParams}
              scriptFileInputRef={scriptFileInputRef}
              handleScriptFileUpload={handleScriptFileUpload}
              handleRemoveScriptFile={handleRemoveScriptFile}
              updateScriptParam={updateScriptParam}
              setScriptParamsDraft={setScriptParamsDraft}
            />
          )}

          {activeTab === 'director' && (
            <DirectorTab
              t={t}
              storyboardGrid={storyboardGrid}
              timelineDuration={timelineDuration}
              timelineDurationInput={timelineDurationInput}
              setTimelineDurationInput={setTimelineDurationInput}
              handleSaveTimelineDuration={handleSaveTimelineDuration}
              handleAddStoryboardRow={handleAddStoryboardRow}
              handleRemoveStoryboardRow={handleRemoveStoryboardRow}
              handleAddStoryboardColumn={handleAddStoryboardColumn}
              handleRemoveStoryboardColumn={handleRemoveStoryboardColumn}
              renameStoryboardRow={renameStoryboardRow}
              saveStoryboardGrid={saveStoryboardGrid}
              openCellEditor={openCellEditor}
              directorNotes={directorNotes}
              setDirectorNotes={setDirectorNotes}
              handleSaveNotes={handleSaveNotes}
              handleShareNotes={handleShareNotes}
            />
          )}

          {activeTab === 'costumes' && (
            <CostumesTab
              t={t}
              costumeOutfits={costumeOutfits}
              setCostumeOutfits={setCostumeOutfits}
              selectedOutfitId={selectedOutfitId}
              setSelectedOutfitId={setSelectedOutfitId}
              setOutfitDraft={setOutfitDraft}
              setOutfitEditId={setOutfitEditId}
              setShowOutfitModal={setShowOutfitModal}
              setGarmentDraft={setGarmentDraft}
              setGarmentEditId={setGarmentEditId}
              setGarmentTargetOutfitId={setGarmentTargetOutfitId}
              setShowGarmentModal={setShowGarmentModal}
              handleOutfitStatusChange={handleOutfitStatusChange}
              handleDeleteOutfit={handleDeleteOutfit}
              handleDeleteGarment={handleDeleteGarment}
              saveCostumeOutfits={saveCostumeOutfits}
              handleOutfitRefImage={handleOutfitRefImage}
            />
          )}

          {activeTab === 'makeup' && (
            <MakeupTab
              t={t}
              makeupLooks={makeupLooks}
              setMakeupLooks={setMakeupLooks}
              selectedLookId={selectedLookId}
              setSelectedLookId={setSelectedLookId}
              setLookDraft={setLookDraft}
              setLookEditId={setLookEditId}
              setShowLookModal={setShowLookModal}
              setProductDraft={setProductDraft}
              setProductEditId={setProductEditId}
              setProductTargetLookId={setProductTargetLookId}
              setShowProductModal={setShowProductModal}
              handleLookStatusChange={handleLookStatusChange}
              handleDeleteLook={handleDeleteLook}
              handleDeleteProduct={handleDeleteProduct}
              saveMakeupLooks={saveMakeupLooks}
              handleLookRefImage={handleLookRefImage}
            />
          )}

          {activeTab === 'edit' && (
            <EditTab
              t={t}
              projectId={project?.id ?? ''}
              mediaFiles={mediaFiles}
              selectedMedia={selectedMedia}
              setSelectedMediaId={setSelectedMediaId}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              timelineDuration={timelineDuration}
              commentsByTabEdit={commentsByTab.edit}
              handleToggleResolved={handleToggleResolved}
              openCommentModal={openCommentModal}
              documents={documents}
              setPreviewDocument={setPreviewDocument}
              openDocModal={() => setShowDocModal(true)}
              onUploadMedia={handleUploadMedia}
              onDeleteMedia={handleDeleteMedia}
            />
          )}

          {activeTab === 'sound' && (
            <SoundTab
              t={t}
              soundMarkers={soundMarkers}
              commentsByTabSound={commentsByTab.sound}
              handleToggleResolved={handleToggleResolved}
              openCommentModal={openCommentModal}
              openMarkerModal={() => setShowMarkerModal(true)}
              handleOpenTimelineMarkerDetails={handleOpenTimelineMarkerDetails}
            />
          )}

          {activeTab === 'manager' && (
            <ManagerTab
              t={t}
              tasks={tasks}
              taskFilterStatus={taskFilterStatus}
              setTaskFilterStatus={setTaskFilterStatus}
              taskFilterDept={taskFilterDept}
              setTaskFilterDept={setTaskFilterDept}
              managerView={managerView}
              setManagerView={setManagerView}
              dragTaskId={dragTaskId}
              setDragTaskId={setDragTaskId}
              kanbanDragOver={kanbanDragOver}
              setKanbanDragOver={setKanbanDragOver}
              handleOpenNewTask={handleOpenNewTask}
              handleOpenEditTask={handleOpenEditTask}
              handleDeleteTask={handleDeleteTask}
              handleTaskStatusChange={handleTaskStatusChange}
              saveTasks={saveTasks}
            />
          )}
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
            <tab.Icon size={20} className="project-mobile-tab-icon" />
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
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Сцена / тайм-код')}</div>
            <input className="form-input" placeholder={t('Сц. 3, 0:45')} value={taskDraft.sceneRef} onChange={e => setTaskDraft(prev => ({ ...prev, sceneRef: e.target.value }))} />
          </div>
          <div>
            <div className="form-label"><CalendarDays size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />{t('Дедлайн')}</div>
            <input className="form-input" type="date" value={taskDraft.dueDate} onChange={e => setTaskDraft(prev => ({ ...prev, dueDate: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Makeup look modal */}
      <Modal
        title={lookEditId ? t('Редактировать образ') : t('Новый образ визажа')}
        isOpen={showLookModal}
        onClose={() => setShowLookModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowLookModal(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveLook}>{t('Сохранить')}</button>
          </>
        }
      >
        <input className="form-input" placeholder={t('Название образа')} value={lookDraft.name} onChange={e => setLookDraft(p => ({ ...p, name: e.target.value }))} />
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Персонаж')}</div>
            <input className="form-input" placeholder={t('Алекс')} value={lookDraft.characterName} onChange={e => setLookDraft(p => ({ ...p, characterName: e.target.value }))} />
          </div>
          <div>
            <div className="form-label"><Clock size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />{t('Время нанесения (мин)')}</div>
            <input className="form-input" type="number" min={0} value={lookDraft.applyTimeMin} onChange={e => setLookDraft(p => ({ ...p, applyTimeMin: Math.max(0, parseInt(e.target.value)||0) }))} />
          </div>
        </div>
        <div className="form-label">{t('Сцены')}</div>
        <input className="form-input" placeholder={t('Сц. 1, 3, 7')} value={lookDraft.sceneRefs} onChange={e => setLookDraft(p => ({ ...p, sceneRefs: e.target.value }))} />
        <div className="form-label">{t('Статус')}</div>
        <select className="form-input" value={lookDraft.status} onChange={e => setLookDraft(p => ({ ...p, status: e.target.value as LookStatus }))}>
          <option value="todo">{t('Не начато')}</option>
          <option value="in_progress">{t('В работе')}</option>
          <option value="ready">{t('Готово')}</option>
          <option value="approved">{t('Утверждено')}</option>
        </select>
      </Modal>

      {/* Makeup product modal */}
      <Modal
        title={productEditId ? t('Редактировать продукт') : t('Добавить продукт')}
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowProductModal(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveProduct}>{t('Сохранить')}</button>
          </>
        }
      >
        <div className="form-label">{t('Зона')}</div>
        <select className="form-input" value={productDraft.zone} onChange={e => setProductDraft(p => ({ ...p, zone: e.target.value as MakeupZone }))}>
          {(['skin','eyes','brows','lips','cheeks','contour','neck','other'] as MakeupZone[]).map(z => (
            <option key={z} value={z}>{{ skin:'Кожа', eyes:'Глаза', brows:'Брови', lips:'Губы', cheeks:'Скулы', contour:'Контур', neck:'Шея', other:'Другое' }[z]}</option>
          ))}
        </select>
        <input className="form-input" placeholder={t('Название продукта')} value={productDraft.productName} onChange={e => setProductDraft(p => ({ ...p, productName: e.target.value }))} />
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Цвет')}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={productDraft.colorHex} onChange={e => setProductDraft(p => ({ ...p, colorHex: e.target.value }))} style={{ width:40, height:36, padding:2, border:'1px solid var(--border-muted)', borderRadius:6, background:'none', cursor:'pointer' }} />
              <input className="form-input" style={{ flex:1 }} placeholder="#F5D5C0" value={productDraft.colorHex} onChange={e => setProductDraft(p => ({ ...p, colorHex: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="form-label">{t('Техника нанесения')}</div>
            <input className="form-input" placeholder={t('Кисть, растушевка...')} value={productDraft.technique} onChange={e => setProductDraft(p => ({ ...p, technique: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Costume outfit modal */}
      <Modal
        title={outfitEditId ? t('Редактировать образ') : t('Новый образ костюма')}
        isOpen={showOutfitModal}
        onClose={() => setShowOutfitModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowOutfitModal(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveOutfit}>{t('Сохранить')}</button>
          </>
        }
      >
        <input className="form-input" placeholder={t('Название образа')} value={outfitDraft.name} onChange={e => setOutfitDraft(p => ({ ...p, name: e.target.value }))} />
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Персонаж')}</div>
            <input className="form-input" placeholder={t('Алекс')} value={outfitDraft.characterName} onChange={e => setOutfitDraft(p => ({ ...p, characterName: e.target.value }))} />
          </div>
          <div>
            <div className="form-label">{t('Статус')}</div>
            <select className="form-input" value={outfitDraft.status} onChange={e => setOutfitDraft(p => ({ ...p, status: e.target.value as LookStatus }))}>
              <option value="todo">{t('Не начато')}</option>
              <option value="in_progress">{t('В работе')}</option>
              <option value="ready">{t('Готово')}</option>
              <option value="approved">{t('Утверждено')}</option>
            </select>
          </div>
        </div>
        <div className="form-label">{t('Сцены')}</div>
        <input className="form-input" placeholder={t('Сц. 1, 3, 7')} value={outfitDraft.sceneRefs} onChange={e => setOutfitDraft(p => ({ ...p, sceneRefs: e.target.value }))} />
      </Modal>

      {/* Garment modal */}
      <Modal
        title={garmentEditId ? t('Редактировать элемент') : t('Добавить элемент гардероба')}
        isOpen={showGarmentModal}
        onClose={() => setShowGarmentModal(false)}
        actions={
          <>
            <button className="secondary-btn" onClick={() => setShowGarmentModal(false)}>{t('Отмена')}</button>
            <button className="primary-btn" onClick={handleSaveGarment}>{t('Сохранить')}</button>
          </>
        }
      >
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Категория')}</div>
            <select className="form-input" value={garmentDraft.category} onChange={e => setGarmentDraft(p => ({ ...p, category: e.target.value as GarmentCategory }))}>
              <option value="top">👕 {t('Верх')}</option>
              <option value="bottom">👖 {t('Низ')}</option>
              <option value="outerwear">🧥 {t('Верхняя одежда')}</option>
              <option value="shoes">👟 {t('Обувь')}</option>
              <option value="accessories">💍 {t('Аксессуары')}</option>
              <option value="headwear">🎩 {t('Головной убор')}</option>
              <option value="underwear">🩲 {t('Бельё')}</option>
            </select>
          </div>
          <div>
            <div className="form-label">{t('Название')}</div>
            <input className="form-input" placeholder={t('Белая рубашка')} value={garmentDraft.name} onChange={e => setGarmentDraft(p => ({ ...p, name: e.target.value }))} />
          </div>
        </div>
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Цвет')}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={garmentDraft.colorHex} onChange={e => setGarmentDraft(p => ({ ...p, colorHex: e.target.value }))} style={{ width:40, height:36, padding:2, border:'1px solid var(--border-muted)', borderRadius:6, background:'none', cursor:'pointer' }} />
              <input className="form-input" style={{ flex:1 }} value={garmentDraft.colorHex} onChange={e => setGarmentDraft(p => ({ ...p, colorHex: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="form-label">{t('Материал')}</div>
            <input className="form-input" placeholder={t('Шерсть, хлопок...')} value={garmentDraft.material} onChange={e => setGarmentDraft(p => ({ ...p, material: e.target.value }))} />
          </div>
        </div>
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Бренд')}</div>
            <input className="form-input" placeholder={t('Zara, H&M...')} value={garmentDraft.brand} onChange={e => setGarmentDraft(p => ({ ...p, brand: e.target.value }))} />
          </div>
          <div>
            <div className="form-label">{t('Статус')}</div>
            <select className="form-input" value={garmentDraft.acquisition} onChange={e => setGarmentDraft(p => ({ ...p, acquisition: e.target.value as GarmentAcquisition }))}>
              <option value="owned">✅ {t('Есть')}</option>
              <option value="rented">🔄 {t('Аренда')}</option>
              <option value="to_buy">🛒 {t('Купить')}</option>
              <option value="to_make">✂️ {t('Сшить')}</option>
            </select>
          </div>
        </div>
        <div className="form-row-2col">
          <div>
            <div className="form-label">{t('Цена (₽)')}</div>
            <input className="form-input" type="number" min={0} value={garmentDraft.price} onChange={e => setGarmentDraft(p => ({ ...p, price: Math.max(0, parseInt(e.target.value)||0) }))} />
          </div>
          <div>
            <div className="form-label">{t('Заметки')}</div>
            <input className="form-input" placeholder={t('Примерка 15.05...')} value={garmentDraft.notes} onChange={e => setGarmentDraft(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
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

      {/* Media upload is handled directly in EditTab via file input */}

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
