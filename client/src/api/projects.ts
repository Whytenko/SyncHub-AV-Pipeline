import { apiRequest } from './client';
import type { Project, ProjectSummary } from '../types';

const LOCAL_KEY = 'synchub_projects';

const readLocalProjects = (): Project[] => {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
};

const writeLocalProjects = (projects: Project[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(projects));
};

const toSummary = (project: Project): ProjectSummary => ({
  id: project.id,
  name: project.name,
  description: project.description,
  deadline: project.deadline,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  members: Array.isArray(project.members) ? (project.members as any) : [],
  mediaCount: project.mediaFiles?.length || 0,
  editsCount: project.markers?.length || 0,
  commentsCount: project.comments?.length || 0
});

const buildLocalProject = (payload: { name: string; description?: string; deadline?: string }): Project => {
  const now = new Date().toISOString();
  return {
    id: `local_prj_${Date.now()}`,
    name: payload.name,
    description: payload.description || '',
    ownerId: 'local',
    members: [],
    deadline: payload.deadline || '',
    createdAt: now,
    updatedAt: now,
    scriptText: '',
    directorNotes: '',
    markers: [],
    bodyMarkers: [],
    bodySilhouettes: [{ id: 1, name: 'Человек 1' }],
    locations: [],
    mediaFiles: [],
    documents: [],
    comments: []
  };
};

export const projectsApi = {
  async list() {
    try {
      return await apiRequest<{ success: boolean; projects: ProjectSummary[] }>('/api/projects');
    } catch {
      const projects = readLocalProjects();
      return { success: true, projects: projects.map(toSummary) };
    }
  },

  async create(payload: { name: string; description?: string; deadline?: string }) {
    try {
      return await apiRequest<{ success: boolean; project: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      const projects = readLocalProjects();
      const project = buildLocalProject(payload);
      const updated = [project, ...projects];
      writeLocalProjects(updated);
      return { success: true, project };
    }
  },

  async get(id: string) {
    try {
      return await apiRequest<{ success: boolean; project: Project }>(`/api/projects/${id}`);
    } catch {
      const project = readLocalProjects().find((item) => item.id === id);
      if (!project) {
        throw new Error('Проект не найден');
      }
      return { success: true, project };
    }
  },

  async update(id: string, payload: Partial<Project>) {
    try {
      return await apiRequest<{ success: boolean; project: Project }>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    } catch {
      const projects = readLocalProjects();
      const index = projects.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error('Проект не найден');
      }
      const updatedProject = { ...projects[index], ...payload, updatedAt: new Date().toISOString() } as Project;
      const next = [...projects];
      next[index] = updatedProject;
      writeLocalProjects(next);
      return { success: true, project: updatedProject };
    }
  },

  async remove(id: string) {
    try {
      return await apiRequest<{ success: boolean }>(`/api/projects/${id}`, {
        method: 'DELETE'
      });
    } catch {
      const projects = readLocalProjects().filter((item) => item.id !== id);
      writeLocalProjects(projects);
      return { success: true };
    }
  },

  async exportProject(id: string) {
    try {
      return await apiRequest<{ success: boolean; exportedAt: string; project: Project }>(`/api/projects/${id}/export`);
    } catch {
      const project = readLocalProjects().find((item) => item.id === id);
      if (!project) {
        throw new Error('Проект не найден');
      }
      return { success: true, exportedAt: new Date().toISOString(), project };
    }
  }
};
