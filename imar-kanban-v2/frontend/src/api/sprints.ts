import client from './client';
import type { APIResponse, Sprint, CreateSprintRequest } from '../types';

export const sprintAPI = {
  listByProject: (projectId: string) =>
    client.get<APIResponse<Sprint[]>>(`/projects/${projectId}/sprints`),

  getById: (_projectId: string, sprintId: string) =>
    client.get<APIResponse<Sprint>>(`/sprints/${sprintId}`),

  create: (projectId: string, data: CreateSprintRequest) =>
    client.post<APIResponse<Sprint>>(`/projects/${projectId}/sprints`, data),

  update: (_projectId: string, sprintId: string, data: Partial<CreateSprintRequest>) =>
    client.patch<APIResponse<Sprint>>(`/sprints/${sprintId}`, data),

  start: (_projectId: string, sprintId: string) =>
    client.post<APIResponse<Sprint>>(`/sprints/${sprintId}/start`),

  complete: (_projectId: string, sprintId: string) =>
    client.post<APIResponse<Sprint>>(`/sprints/${sprintId}/complete`),

  remove: (_projectId: string, sprintId: string) =>
    client.delete<APIResponse<void>>(`/sprints/${sprintId}`),
};
