import client from './client';
import type { APIResponse } from '../types';

export interface FormSubmission {
  id: string;
  projectId: string;
  issueTypeKey: string;
  title: string;
  description: string;
  priority: string;
  assigneeId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewNote?: string;
  createdIssueId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    username: string;
  };
  reviewedBy?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export const formsAPI = {
  listByProject: (projectId: string, status?: string) =>
    client.get<APIResponse<FormSubmission[]>>(`/projects/${projectId}/form-submissions`, {
      params: status ? { status } : undefined,
    }),

  getById: (id: string) =>
    client.get<APIResponse<FormSubmission>>(`/form-submissions/${id}`),

  getPendingCount: (projectId: string) =>
    client.get<APIResponse<{ count: number }>>(`/projects/${projectId}/form-submissions/pending-count`),

  create: (projectId: string, data: {
    issueTypeKey: string;
    title: string;
    description: string;
    priority?: string;
    assigneeId?: string;
  }) =>
    client.post<APIResponse<FormSubmission>>(`/projects/${projectId}/form-submissions`, data),

  accept: (id: string, reviewNote?: string) =>
    client.post<APIResponse<any>>(`/form-submissions/${id}/accept`, { reviewNote }),

  reject: (id: string, reviewNote?: string) =>
    client.post<APIResponse<FormSubmission>>(`/form-submissions/${id}/reject`, { reviewNote }),

  remove: (id: string) =>
    client.delete<APIResponse<void>>(`/form-submissions/${id}`),
};
