export type TabType = 'edit' | 'script' | 'director' | 'costumes' | 'makeup' | 'sound';

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
}

export interface DocumentFile {
  id: number;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
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
}

export interface StoryboardGrid {
  locationNames: string[];
  columnCount: number;
  cells: Record<string, StoryboardCell>;
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
