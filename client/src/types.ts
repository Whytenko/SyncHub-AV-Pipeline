export type TabType = 'edit' | 'script' | 'director' | 'costumes' | 'makeup';

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
