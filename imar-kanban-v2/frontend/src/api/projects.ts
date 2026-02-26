import client from './client';
import type {
  APIResponse,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectMember,
  AddMemberRequest,
} from '../types';

export const projectAPI = {
  list: () =>
    client.get<APIResponse<Project[]>>('/projects'),

  getById: (id: string) =>
    client.get<APIResponse<Project>>(`/projects/${id}`),

  create: (data: CreateProjectRequest) =>
    client.post<APIResponse<Project>>('/projects', data),

  update: (id: string, data: UpdateProjectRequest) =>
    client.patch<APIResponse<Project>>(`/projects/${id}`, data),

  delete: (id: string) =>
    client.delete<APIResponse<void>>(`/projects/${id}`),

  archive: (id: string) =>
    client.patch<APIResponse<Project>>(`/projects/${id}`, { isArchived: true }),

  // Members
  listMembers: (projectId: string) =>
    client.get<APIResponse<ProjectMember[]>>(`/projects/${projectId}/members`),

  addMember: (projectId: string, data: AddMemberRequest) =>
    client.post<APIResponse<ProjectMember>>(`/projects/${projectId}/members`, data),

  updateMemberRole: (projectId: string, memberId: string, role: string) =>
    client.patch<APIResponse<ProjectMember>>(`/projects/${projectId}/members/${memberId}/role`, { role }),

  removeMember: (projectId: string, userId: string) =>
    client.delete<APIResponse<void>>(`/projects/${projectId}/members/${userId}`),
};
