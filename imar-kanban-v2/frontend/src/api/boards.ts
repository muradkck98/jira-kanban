import client from './client';
import type {
  APIResponse,
  Board,
  CreateBoardRequest,
  CreateColumnRequest,
  UpdateColumnRequest,
  ReorderColumnsRequest,
} from '../types';

/**
 * Backend NestJS DTOs expect camelCase keys (e.g. wipLimit, columnIds).
 * The Axios response interceptor converts responses to snake_case,
 * but there is NO request interceptor — so we must send camelCase in bodies.
 */
function columnToBackend(data: CreateColumnRequest | UpdateColumnRequest) {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.category !== undefined) body.category = data.category;
  if (data.color !== undefined) body.color = data.color;
  if ((data as any).wip_limit !== undefined) body.wipLimit = (data as any).wip_limit;
  if ((data as any).wipLimit !== undefined) body.wipLimit = (data as any).wipLimit;
  return body;
}

export const boardAPI = {
  listByProject: (projectId: string) =>
    client.get<APIResponse<Board[]>>(`/projects/${projectId}/boards`),

  getById: (_projectId: string, boardId: string) =>
    client.get<APIResponse<Board>>(`/boards/${boardId}`),

  create: (projectId: string, data: CreateBoardRequest) =>
    client.post<APIResponse<Board>>(`/projects/${projectId}/boards`, data),

  update: (_projectId: string, boardId: string, data: Partial<CreateBoardRequest>) =>
    client.patch<APIResponse<Board>>(`/boards/${boardId}`, data),

  delete: (_projectId: string, boardId: string) =>
    client.delete<APIResponse<void>>(`/boards/${boardId}`),

  // Kolonlar
  createColumn: (_projectId: string, boardId: string, data: CreateColumnRequest) =>
    client.post<APIResponse<void>>(`/boards/${boardId}/columns`, columnToBackend(data)),

  updateColumn: (_projectId: string, _boardId: string, columnId: string, data: UpdateColumnRequest) =>
    client.patch<APIResponse<void>>(`/columns/${columnId}`, columnToBackend(data)),

  deleteColumn: (_projectId: string, _boardId: string, columnId: string) =>
    client.delete<APIResponse<void>>(`/columns/${columnId}`),

  reorderColumns: (_projectId: string, boardId: string, data: ReorderColumnsRequest) =>
    client.patch<APIResponse<void>>(`/boards/${boardId}/columns/reorder`, {
      columnIds: data.column_ids,
    }),
};
