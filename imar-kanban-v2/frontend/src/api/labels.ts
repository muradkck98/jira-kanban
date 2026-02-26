import client from './client';
import type { APIResponse, Label } from '../types';

export const labelAPI = {
  list: (projectId: string) =>
    client.get<APIResponse<Label[]>>(`/projects/${projectId}/labels`),

  create: (projectId: string, data: { name: string; color?: string }) =>
    client.post<APIResponse<Label>>(`/projects/${projectId}/labels`, data),

  update: (id: string, data: { name?: string; color?: string }) =>
    client.patch<APIResponse<Label>>(`/labels/${id}`, data),

  delete: (id: string) =>
    client.delete<APIResponse<{ deleted: boolean }>>(`/labels/${id}`),
};
