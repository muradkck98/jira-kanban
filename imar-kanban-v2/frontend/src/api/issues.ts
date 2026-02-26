import client from './client';
import type {
  APIResponse,
  Issue,
  CreateIssueRequest,
  UpdateIssueRequest,
  MoveIssueRequest,
  Comment,
  CreateCommentRequest,
  Attachment,
} from '../types';

export const issueAPI = {
  list: (projectId: string, params?: Record<string, string>) =>
    client.get<APIResponse<Issue[]>>(`/projects/${projectId}/issues`, { params }),

  getById: (_projectId: string, issueId: string) =>
    client.get<APIResponse<Issue>>(`/issues/${issueId}`),

  getBacklog: (projectId: string) =>
    client.get<APIResponse<Issue[]>>(`/projects/${projectId}/backlog`),

  create: (_projectId: string, data: CreateIssueRequest) =>
    client.post<APIResponse<Issue>>(`/issues`, data),

  update: (_projectId: string, issueId: string, data: UpdateIssueRequest) =>
    client.patch<APIResponse<Issue>>(`/issues/${issueId}`, data),

  move: (_projectId: string, issueId: string, data: MoveIssueRequest) =>
    client.patch<APIResponse<Issue>>(`/issues/${issueId}/move`, data),

  delete: (_projectId: string, issueId: string) =>
    client.delete<APIResponse<void>>(`/issues/${issueId}`),

  // Yorumlar
  listComments: (_projectId: string, issueId: string) =>
    client.get<APIResponse<Comment[]>>(`/issues/${issueId}/comments`),

  createComment: (_projectId: string, issueId: string, data: CreateCommentRequest) =>
    client.post<APIResponse<Comment>>(`/issues/${issueId}/comments`, data),

  updateComment: (_projectId: string, commentId: string, data: CreateCommentRequest) =>
    client.patch<APIResponse<Comment>>(`/comments/${commentId}`, data),

  deleteComment: (_projectId: string, commentId: string) =>
    client.delete<APIResponse<void>>(`/comments/${commentId}`),

  // Dosya ekleri
  listAttachments: (issueId: string) =>
    client.get<APIResponse<Attachment[]>>(`/issues/${issueId}/attachments`),

  uploadAttachment: (issueId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<APIResponse<Attachment>>(`/issues/${issueId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAttachment: (attachmentId: string) =>
    client.delete<APIResponse<void>>(`/attachments/${attachmentId}`),
};
