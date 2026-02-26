import client from './client';
import type { APIResponse } from '../types';

export interface Page {
  id: string;
  projectId: string;
  title: string;
  content: string;
  emoji?: string;
  isStarred: boolean;
  shareToken?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    username: string;
  };
}

export const pagesAPI = {
  listByProject: (projectId: string, search?: string) =>
    client.get<APIResponse<Page[]>>(`/projects/${projectId}/pages`, {
      params: search ? { search } : undefined,
    }),

  getById: (id: string) =>
    client.get<APIResponse<Page>>(`/pages/${id}`),

  getByShareToken: (token: string) =>
    client.get<APIResponse<Page>>(`/share/${token}`),

  create: (projectId: string, data: {
    title: string;
    content?: string;
    emoji?: string;
    tags?: string[];
  }) =>
    client.post<APIResponse<Page>>(`/projects/${projectId}/pages`, data),

  update: (id: string, data: {
    title?: string;
    content?: string;
    emoji?: string;
    tags?: string[];
    isStarred?: boolean;
  }) =>
    client.patch<APIResponse<Page>>(`/pages/${id}`, data),

  toggleStar: (id: string) =>
    client.post<APIResponse<Page>>(`/pages/${id}/star`, {}),

  generateShareLink: (id: string) =>
    client.post<APIResponse<{ id: string; shareToken: string }>>(`/pages/${id}/share`, {}),

  revokeShareLink: (id: string) =>
    client.delete<APIResponse<void>>(`/pages/${id}/share`),

  remove: (id: string) =>
    client.delete<APIResponse<void>>(`/pages/${id}`),
};
