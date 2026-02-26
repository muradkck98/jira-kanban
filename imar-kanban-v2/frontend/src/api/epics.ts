import client from './client';
import type { APIResponse, Epic, CreateEpicRequest } from '../types';

export const epicAPI = {
  list: (projectId: string) =>
    client.get<APIResponse<Epic[]>>(`/projects/${projectId}/epics`),

  getById: (id: string) =>
    client.get<APIResponse<Epic>>(`/epics/${id}`),

  create: (projectId: string, data: CreateEpicRequest) =>
    client.post<APIResponse<Epic>>(`/projects/${projectId}/epics`, data),

  update: (id: string, data: Partial<CreateEpicRequest> & { status?: string }) =>
    client.patch<APIResponse<Epic>>(`/epics/${id}`, data),

  delete: (id: string) =>
    client.delete<APIResponse<void>>(`/epics/${id}`),
};
