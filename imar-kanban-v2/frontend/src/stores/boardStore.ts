import { create } from 'zustand';
import type { Board, Issue } from '../types';
import { boardAPI, issueAPI } from '../api';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  loading: boolean;
  lastIssueUpdate: number;

  fetchBoards: (projectId: string) => Promise<void>;
  fetchBoard: (projectId: string, boardId: string) => Promise<void>;
  moveIssue: (projectId: string, issueId: string, data: { columnId: string; position: number }) => Promise<void>;
  optimisticMove: (issueId: string, fromColumnId: string, toColumnId: string, newPosition: number) => void;
  addIssueToBoard: (issue: Issue) => void;
  removeIssueFromBoard: (issueId: string, columnId: string) => void;
  signalIssueUpdate: () => void;
}

// Map backend field names to frontend field names
function mapBoard(board: any): Board {
  if (!board) return board;
  return {
    ...board,
    project_id: board.projectId || board.project_id,
    analytics_enabled: board.analyticsEnabled ?? board.analytics_enabled,
    created_at: board.createdAt || board.created_at,
    updated_at: board.updatedAt || board.updated_at,
    columns: (board.columns || []).map((col: any) => ({
      ...col,
      board_id: col.boardId || col.board_id,
      wip_limit: col.wipLimit ?? col.wip_limit ?? 0,
      created_at: col.createdAt || col.created_at,
      updated_at: col.updatedAt || col.updated_at,
      issues: (col.issues || []).map((issue: any) => mapIssue(issue)),
    })),
  };
}

function mapIssue(issue: any): Issue {
  if (!issue) return issue;
  return {
    ...issue,
    project_id: issue.projectId || issue.project_id,
    board_id: issue.boardId || issue.board_id,
    column_id: issue.columnId || issue.column_id,
    sprint_id: issue.sprintId || issue.sprint_id,
    epic_id: issue.epicId || issue.epic_id,
    parent_id: issue.parentId || issue.parent_id,
    issue_type_id: issue.issueTypeId || issue.issue_type_id,
    issue_number: issue.issueNumber || issue.issue_number,
    issue_key: issue.issueKey || issue.issue_key,
    story_points: issue.storyPoints ?? issue.story_points,
    due_date: issue.dueDate || issue.due_date,
    reporter_id: issue.reporterId || issue.reporter_id,
    assignee_id: issue.assigneeId || issue.assignee_id,
    created_at: issue.createdAt || issue.created_at,
    updated_at: issue.updatedAt || issue.updated_at,
    deleted_at: issue.deletedAt || issue.deleted_at,
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  loading: false,
  lastIssueUpdate: 0,

  fetchBoards: async (projectId: string) => {
    set({ loading: true });
    try {
      const res = await boardAPI.listByProject(projectId);
      const boards = (res.data.data || []).map(mapBoard);
      set({ boards, loading: false });
    } catch (err) {
      console.error('Panolar yüklenemedi:', err);
      set({ loading: false });
    }
  },

  fetchBoard: async (projectId: string, boardId: string) => {
    set({ loading: true });
    try {
      let board: Board | null = null;
      if (boardId && boardId !== 'first') {
        const res = await boardAPI.getById(projectId, boardId);
        board = mapBoard(res.data.data);
      } else {
        // Get first board
        const res = await boardAPI.listByProject(projectId);
        const boards = res.data.data || [];
        if (boards.length > 0) {
          // The list endpoint includes columns+issues
          board = mapBoard(boards[0]);
        }
      }
      set({ currentBoard: board, loading: false });
    } catch (err) {
      console.error('Pano yüklenemedi:', err);
      set({ loading: false });
    }
  },

  moveIssue: async (projectId: string, issueId: string, data: { columnId: string; position: number }) => {
    try {
      await issueAPI.move(projectId, issueId, { columnId: data.columnId, position: data.position });
      get().signalIssueUpdate();
    } catch (err) {
      console.error('Issue taşıma başarısız:', err);
      throw err; // re-throw so caller can rollback optimistic update
    }
  },

  optimisticMove: (issueId: string, fromColumnId: string, toColumnId: string, newPosition: number) => {
    set((state) => {
      if (!state.currentBoard?.columns) return state;

      const columns = state.currentBoard.columns.map((col) => ({
        ...col,
        issues: col.issues ? [...col.issues] : [],
      }));

      const fromCol = columns.find((c) => c.id === fromColumnId);
      const toCol = columns.find((c) => c.id === toColumnId);
      if (!fromCol || !toCol) return state;

      const issueIndex = fromCol.issues!.findIndex((i) => i.id === issueId);
      if (issueIndex === -1) return state;

      const [movedIssue] = fromCol.issues!.splice(issueIndex, 1);
      movedIssue.column_id = toColumnId;
      movedIssue.position = newPosition;

      toCol.issues!.splice(newPosition, 0, movedIssue);

      toCol.issues!.forEach((issue, idx) => {
        issue.position = idx;
      });

      return {
        currentBoard: { ...state.currentBoard, columns },
      };
    });
  },

  addIssueToBoard: (issue: Issue) => {
    const mapped = mapIssue(issue);
    set((state) => {
      if (!state.currentBoard?.columns) return state;
      const columns = state.currentBoard.columns.map((col) => {
        if (col.id === mapped.column_id) {
          return { ...col, issues: [...(col.issues || []), mapped] };
        }
        return col;
      });
      return { currentBoard: { ...state.currentBoard, columns } };
    });
  },

  removeIssueFromBoard: (issueId: string, columnId: string) => {
    set((state) => {
      if (!state.currentBoard?.columns) return state;
      const columns = state.currentBoard.columns.map((col) => {
        if (col.id === columnId) {
          return { ...col, issues: (col.issues || []).filter((i) => i.id !== issueId) };
        }
        return col;
      });
      return { currentBoard: { ...state.currentBoard, columns } };
    });
  },

  signalIssueUpdate: () => {
    set({ lastIssueUpdate: Date.now() });
  },
}));
