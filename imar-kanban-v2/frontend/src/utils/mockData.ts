import type { Project, Board, Column, Issue, Sprint, Epic, Label, IssueType, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============ HELPERS ============
let _counter = 0;
export function genId(): string {
  return uuidv4?.() ?? `id-${++_counter}-${Date.now()}`;
}

// Basit uuid polyfill (uuid paketi yoksa)
function fakeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function makeId(): string {
  try {
    return genId();
  } catch {
    return fakeUUID();
  }
}

const now = new Date().toISOString();

// ============ USERS ============
export const DEMO_USERS: User[] = [
  { id: makeId(), email: 'ahmet@imar.dev', full_name: 'Ahmet Yılmaz', display_name: 'Ahmet', avatar_url: '', auth_provider: 'local', is_active: true, created_at: now, updated_at: now },
  { id: makeId(), email: 'elif@imar.dev', full_name: 'Elif Demir', display_name: 'Elif', avatar_url: '', auth_provider: 'local', is_active: true, created_at: now, updated_at: now },
  { id: makeId(), email: 'can@imar.dev', full_name: 'Can Kaya', display_name: 'Can', avatar_url: '', auth_provider: 'local', is_active: true, created_at: now, updated_at: now },
  { id: makeId(), email: 'zeynep@imar.dev', full_name: 'Zeynep Aksoy', display_name: 'Zeynep', avatar_url: '', auth_provider: 'local', is_active: true, created_at: now, updated_at: now },
];

// ============ ISSUE TYPES ============
const ISSUE_TYPES: IssueType[] = [
  { id: makeId(), project_id: '', name: 'Görev', icon: '✅', color: '#4BADE8' },
  { id: makeId(), project_id: '', name: 'Hata', icon: '🔴', color: '#E5493A' },
  { id: makeId(), project_id: '', name: 'Hikaye', icon: '📗', color: '#63BA3C' },
  { id: makeId(), project_id: '', name: 'Alt Görev', icon: '🔷', color: '#4BADE8' },
];

// ============ LABELS ============
const LABELS: Label[] = [
  { id: makeId(), project_id: '', name: 'FRONTEND', color: '#0052CC', created_at: now },
  { id: makeId(), project_id: '', name: 'BACKEND', color: '#36B37E', created_at: now },
  { id: makeId(), project_id: '', name: 'BUG', color: '#FF5630', created_at: now },
  { id: makeId(), project_id: '', name: 'UX', color: '#6554C0', created_at: now },
  { id: makeId(), project_id: '', name: 'DEVOPS', color: '#00B8D9', created_at: now },
];

// ============ DEMO PROJECT FACTORY ============
function createDemoProject(name: string, key: string, description: string): {
  project: Project;
  board: Board;
  sprints: Sprint[];
  epics: Epic[];
} {
  const projectId = makeId();
  const boardId = makeId();
  const sprint1Id = makeId();
  const sprint2Id = makeId();

  // Columns
  const col1Id = makeId();
  const col2Id = makeId();
  const col3Id = makeId();
  const col4Id = makeId();

  const columns: Column[] = [
    { id: col1Id, board_id: boardId, name: 'TO DO', category: 'todo', position: 0, wip_limit: 0, color: '#DFE1E6', issues: [], created_at: now },
    { id: col2Id, board_id: boardId, name: 'IN PROGRESS', category: 'in_progress', position: 1, wip_limit: 5, color: '#0052CC', issues: [], created_at: now },
    { id: col3Id, board_id: boardId, name: 'IN REVIEW', category: 'in_progress', position: 2, wip_limit: 3, color: '#FF8B00', issues: [], created_at: now },
    { id: col4Id, board_id: boardId, name: 'DONE', category: 'done', position: 3, wip_limit: 0, color: '#36B37E', issues: [], created_at: now },
  ];

  const sprints: Sprint[] = [
    { id: sprint1Id, project_id: projectId, name: 'Sprint 3', goal: 'MVP tamamlama', status: 'active', start_date: '2026-02-10', end_date: '2026-02-24', created_at: now },
    { id: sprint2Id, project_id: projectId, name: 'Sprint 4', goal: 'UI/UX iyileştirme', status: 'planning', start_date: '2026-02-24', end_date: '2026-03-10', created_at: now },
  ];

  const epics: Epic[] = [
    { id: makeId(), project_id: projectId, name: 'Authentication', description: 'Kullanıcı kimlik doğrulama', status: 'in_progress', color: '#0052CC', created_at: now },
    { id: makeId(), project_id: projectId, name: 'Dashboard', description: 'Ana panel', status: 'todo', color: '#36B37E', created_at: now },
  ];

  let issueNum = 0;
  const makeIssue = (
    title: string,
    colId: string,
    pos: number,
    opts?: {
      priority?: string;
      assigneeIdx?: number;
      typeIdx?: number;
      labelIdxs?: number[];
      storyPoints?: number;
      sprintId?: string;
      description?: string;
    }
  ): Issue => {
    issueNum++;
    return {
      id: makeId(),
      project_id: projectId,
      board_id: boardId,
      column_id: colId,
      issue_key: `${key}-${issueNum}`,
      issue_number: issueNum,
      title,
      description: opts?.description || '',
      priority: (opts?.priority || 'medium') as Issue['priority'],
      story_points: opts?.storyPoints || 0,
      position: pos,
      issue_type_id: ISSUE_TYPES[opts?.typeIdx || 0]?.id,
      issue_type: ISSUE_TYPES[opts?.typeIdx || 0],
      assignee_id: opts?.assigneeIdx !== undefined ? DEMO_USERS[opts.assigneeIdx]?.id : undefined,
      assignee: opts?.assigneeIdx !== undefined ? DEMO_USERS[opts.assigneeIdx] : undefined,
      reporter_id: DEMO_USERS[0].id,
      reporter: DEMO_USERS[0],
      sprint_id: opts?.sprintId || sprint1Id,
      labels: opts?.labelIdxs?.map((i) => LABELS[i]) || [],
      created_at: now,
      updated_at: now,
    };
  };

  // TO DO issues
  columns[0].issues = [
    makeIssue('Kullanıcı profil sayfası tasarla', col1Id, 0, { priority: 'high', assigneeIdx: 1, typeIdx: 2, labelIdxs: [0, 3], storyPoints: 5 }),
    makeIssue('API rate limiting ekle', col1Id, 1, { priority: 'medium', assigneeIdx: 2, typeIdx: 0, labelIdxs: [1], storyPoints: 3 }),
    makeIssue('E-posta bildirim sistemi kur', col1Id, 2, { priority: 'low', typeIdx: 2, labelIdxs: [1], storyPoints: 8 }),
  ];

  // IN PROGRESS issues
  columns[1].issues = [
    makeIssue('Dashboard istatistik kartları', col2Id, 0, { priority: 'highest', assigneeIdx: 0, typeIdx: 0, labelIdxs: [0], storyPoints: 5 }),
    makeIssue('Login sayfası responsive düzenleme', col2Id, 1, { priority: 'high', assigneeIdx: 3, typeIdx: 1, labelIdxs: [0, 3], storyPoints: 2 }),
  ];

  // IN REVIEW issues
  columns[2].issues = [
    makeIssue('JWT token yenileme mekanizması', col3Id, 0, { priority: 'highest', assigneeIdx: 2, typeIdx: 0, labelIdxs: [1], storyPoints: 5 }),
    makeIssue('Proje oluşturma formu validasyonu', col3Id, 1, { priority: 'medium', assigneeIdx: 1, typeIdx: 0, labelIdxs: [0], storyPoints: 3 }),
    makeIssue('Docker compose health check düzelt', col3Id, 2, { priority: 'high', assigneeIdx: 0, typeIdx: 1, labelIdxs: [4], storyPoints: 2 }),
  ];

  // DONE issues
  columns[3].issues = [
    makeIssue('Veritabanı migration sistemi kur', col4Id, 0, { priority: 'high', assigneeIdx: 2, typeIdx: 0, labelIdxs: [1, 4], storyPoints: 3 }),
    makeIssue('CI/CD pipeline oluştur', col4Id, 1, { priority: 'medium', assigneeIdx: 0, typeIdx: 0, labelIdxs: [4], storyPoints: 5 }),
  ];

  const project: Project = {
    id: projectId,
    name,
    key,
    description,
    owner_id: DEMO_USERS[0].id,
    owner: DEMO_USERS[0],
    issue_counter: issueNum,
    created_at: now,
    updated_at: now,
  };

  const board: Board = {
    id: boardId,
    project_id: projectId,
    name: `${name} Board`,
    description: '',
    analytics_enabled: true,
    columns,
    created_at: now,
    updated_at: now,
  };

  return { project, board, sprints, epics };
}

// ============ GENERATE ALL DEMO DATA ============
const demo1 = createDemoProject('İMAR Kanban', 'IMAR', 'Jira benzeri proje yönetim sistemi');
const demo2 = createDemoProject('E-Commerce Platform', 'ECOM', 'Online alışveriş platformu');
const demo3 = createDemoProject('Mobile App', 'MOB', 'iOS ve Android mobil uygulama');

export const DEMO_PROJECTS: Project[] = [demo1.project, demo2.project, demo3.project];

export const DEMO_BOARDS: Record<string, Board[]> = {
  [demo1.project.id]: [demo1.board],
  [demo2.project.id]: [demo2.board],
  [demo3.project.id]: [demo3.board],
};

export const DEMO_SPRINTS: Record<string, Sprint[]> = {
  [demo1.project.id]: demo1.sprints,
  [demo2.project.id]: demo2.sprints,
  [demo3.project.id]: demo3.sprints,
};

export const DEMO_LABELS = LABELS;
export const DEMO_ISSUE_TYPES = ISSUE_TYPES;

// Tüm issue'ları düz liste olarak çıkar (backlog için)
export function getAllIssuesForProject(projectId: string): Issue[] {
  const boards = DEMO_BOARDS[projectId];
  if (!boards) return [];
  const issues: Issue[] = [];
  for (const board of boards) {
    for (const col of board.columns || []) {
      issues.push(...(col.issues || []));
    }
  }
  return issues;
}
