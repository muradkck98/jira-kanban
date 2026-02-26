import { create } from 'zustand';
import type { Project, CreateProjectRequest } from '../types';
import { projectAPI } from '../api';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await projectAPI.list();
      const projects = res.data.data || [];
      set({ projects, loading: false });
    } catch (err) {
      console.error('Projeler yüklenemedi:', err);
      set({ loading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ loading: true });
    try {
      const res = await projectAPI.getById(id);
      const project = res.data.data || null;
      set({ currentProject: project, loading: false });
    } catch (err) {
      console.error('Proje yüklenemedi:', err);
      set({ loading: false });
    }
  },

  createProject: async (data: CreateProjectRequest) => {
    const res = await projectAPI.create(data);
    const project = res.data.data!;
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  setCurrentProject: (project) => set({ currentProject: project }),
}));
