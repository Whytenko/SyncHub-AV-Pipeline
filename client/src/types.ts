export type TabType = 'edit' | 'script' | 'director' | 'costumes' | 'makeup' | 'sound' | 'manager';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'approved' | 'changes' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  department: TabType;
  assignee?: string;
  sceneRef?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Makeup ────────────────────────────────────────────────────────────────────
export type MakeupZone = 'skin' | 'eyes' | 'brows' | 'lips' | 'cheeks' | 'contour' | 'neck' | 'other';
export type LookStatus = 'todo' | 'in_progress' | 'ready' | 'approved';

export interface MakeupProduct {
  id: number;
  zone: MakeupZone;
  productName: string;
  colorHex: string;
  technique: string;
}

export interface MakeupLook {
  id: number;
  name: string;
  characterName: string;
  sceneRefs: string;
  applyTimeMin: number;
  products: MakeupProduct[];
  skinNotes: string;
  referenceImage: string;
  status: LookStatus;
}

// ── Costumes ──────────────────────────────────────────────────────────────────
export type GarmentCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessories' | 'headwear' | 'underwear';
export type GarmentAcquisition = 'owned' | 'rented' | 'to_buy' | 'to_make';

export interface CostumeGarment {
  id: number;
  category: GarmentCategory;
  name: string;
  colorHex: string;
  material: string;
  brand: string;
  acquisition: GarmentAcquisition;
  price: number;
  notes: string;
}

export interface CostumeOutfit {
  id: number;
  name: string;
  characterName: string;
  sceneRefs: string;
  garments: CostumeGarment[];
  referenceImage: string;
  outfitNotes: string;
  status: LookStatus;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  role: string;
  avatar: string;
  gender?: string;
  birthdate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  nickname: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  avatar?: string;
}

export interface ProjectMarker {
  id: number;
  time: number;
  color: string;
  title: string;
  comment: string;
  user: string;
  icon: string;
  tabId: TabType;
}

export interface ProjectComment {
  id: number;
  tabId: TabType;
  user: string;
  text: string;
  timestamp: string;
  resolved?: boolean;
}

export interface BodyMarker {
  id: number;
  x: number;
  y: number;
  time?: number;
  title: string;
  description: string;
  bodyPart: string;
  images: string[];
  comments: ProjectComment[];
  color: string;
  tabId: TabType;
  personId?: number;
  status?: 'todo' | 'in_progress' | 'ready' | 'approved';
}

export interface BodySilhouette {
  id: number;
  name: string;
}

export interface Shot {
  id: number;
  time: number;
  title: string;
  description: string;
  image: string;
}

export interface Location {
  id: number;
  name: string;
  description: string;
  shots: Shot[];
}

export interface MediaFile {
  id: number;
  name: string;
  type: 'audio' | 'video' | 'other';
  duration: string;
  size: string;
  url?: string;
}

export interface DocumentFile {
  id: number;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
  url?: string;
}

export interface ScriptFile {
  name: string;
  type: string;
  size: string;
  dataUrl?: string;
}

export interface ScriptParams {
  scriptFile: ScriptFile | null;
  actorsCount: number;
  extraActorsCount: number;
  childActorsCount: number;
  animalsCount: number;
  locationsCount: number;
  exteriorScenesCount: number;
  interiorScenesCount: number;
  nightScenesCount: number;
  shootingDaysCount: number;
  totalDurationMin: number;
  propsCount: number;
  costumeSetsCount: number;
  makeupLooksCount: number;
  wigs: boolean;
  prosthetics: boolean;
  vfxShotsCount: number;
  practicalEffectsCount: number;
  stuntsCount: number;
  weaponProps: boolean;
  pyrotechnics: boolean;
  rainScenes: boolean;
  snowScenes: boolean;
  vehiclesCount: number;
  vehicleChases: boolean;
  droneShots: boolean;
  underwaterShots: boolean;
  aerialShots: boolean;
  craneShots: boolean;
  productionFormat: string;
  aspectRatio: string;
  handheldStyle: boolean;
  steadicam: boolean;
  originalMusicTracks: number;
  voiceOverPresent: boolean;
  silentScenes: boolean;
  musicGenre: string;
  genre: string;
  ageRating: string;
  targetAudience: string;
  dialogLanguage: string;
  subtitlesNeeded: boolean;
  weatherDependentDays: number;
  hazardousConditions: boolean;
  internationalShoot: boolean;
  remoteLocations: boolean;
  militaryEquipment: boolean;
  logline: string;
  budgetTier: string;
  colorGrading: string;
}

export interface StoryboardCell {
  description: string;
  imageUrl: string;
  shotType: string;
  duration?: number;
}

export interface StoryboardFrame {
  shotType: string;
  description: string;
  imageUrl: string;
  duration?: number;
}

export interface StoryboardGrid {
  locationNames: string[];
  columnCount: number;
  cells: Record<string, StoryboardCell>;
}

// ── Pipeline: Production stages ───────────────────────────────────────────────
export type ProductionStage =
  | 'development'     // Разработка: сценарист работает над сценами
  | 'pre_production'  // Пре-продакшн: раскадровка, образы, подготовка
  | 'production'      // Съёмки: по календарю съёмочного плана
  | 'post_production' // Пост-продакшн: монтаж, звук, цвет
  | 'delivery';       // Сдача: финальная версия утверждена

// Scene — созданная сценаристом, живёт через все вкладки
export type SceneStatus = 'draft' | 'locked' | 'shot' | 'edited' | 'approved';

export interface Scene {
  id: string;
  number: number;               // Сц. 1, Сц. 2...
  title: string;                // "ИНТ. КВАРТИРА АЛЕКСА — ДЕНЬ"
  location: string;             // название локации
  interiorExterior: 'INT' | 'EXT';
  dayNight: 'DAY' | 'NIGHT';
  characters: string[];         // имена персонажей
  description: string;          // краткое описание действия
  estimatedMinutes: number;     // расчётное время съёмки
  pageCount: number;            // страниц сценария
  status: SceneStatus;
  shootingDayId?: string;       // назначена ли на день съёмок
  storyboardRef?: string;       // legacy: ключ в storyboardGrid.cells
  storyboardFrameCount?: number; // кол-во кадров раскадровки (0 = не задано)
  frames?: StoryboardFrame[];   // кадры раскадровки, привязанные к сцене
}

// Shooting day — создаётся менеджером, объединяет сцены
export type ShootingDayStatus = 'planned' | 'shooting' | 'wrapped' | 'postponed';

export interface ShootingDay {
  id: string;
  dayNumber: number;            // Съёмочный день №1, №2...
  date: string;                 // YYYY-MM-DD
  callTime: string;             // 08:00
  wrapTime: string;             // 19:00
  location: string;             // адрес/название
  sceneIds: string[];           // id сцен в этот день
  status: ShootingDayStatus;
  notes: string;
  totalMinutes: number;         // авто-сумма estimatedMinutes сцен
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[] | UserSummary[];
  deadline: string;
  timelineDuration: number;
  createdAt: string;
  updatedAt: string;
  scriptText: string;
  directorNotes: string;
  markers: ProjectMarker[];
  bodyMarkers: BodyMarker[];
  bodySilhouettes?: BodySilhouette[];
  locations: Location[];
  mediaFiles: MediaFile[];
  documents: DocumentFile[];
  comments: ProjectComment[];
  scriptParams?: ScriptParams;
  storyboardGrid?: StoryboardGrid;
  tasks?: Task[];
  makeupLooks?: MakeupLook[];
  costumeOutfits?: CostumeOutfit[];
  // Pipeline
  productionStage?: ProductionStage;
  scenes?: Scene[];
  shootingDays?: ShootingDay[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  members: UserSummary[];
  mediaCount: number;
  editsCount: number;
  commentsCount: number;
}
