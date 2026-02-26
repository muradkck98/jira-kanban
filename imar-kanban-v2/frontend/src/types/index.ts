// ============ API Response Types ============
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
}

// ============ Auth ============
export interface User {
  id: string;
  username?: string;
  email?: string;
  full_name?: string;     // backend: fullName → snake_case
  display_name?: string;  // backend: displayName → snake_case
  avatar_url?: string;
  auth_provider?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ============ Project ============
export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  owner_id: string;
  owner?: User;
  issue_counter: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  key: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  user?: User;
  created_at: string;
}

export interface AddMemberRequest {
  user_id: string;
  role: string;
}

// ============ Board ============
export interface Board {
  id: string;
  project_id: string;
  name: string;
  description: string;
  analytics_enabled: boolean;
  columns?: Column[];
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  category: 'todo' | 'in_progress' | 'done';
  position: number;
  wip_limit: number;
  color: string;
  issues?: Issue[];
  created_at: string;
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
}

export interface CreateColumnRequest {
  name: string;
  category: string;
  wip_limit?: number;
  color?: string;
}

export interface UpdateColumnRequest {
  name?: string;
  category?: string;
  wip_limit?: number;
  color?: string;
}

export interface ReorderColumnsRequest {
  column_ids: string[];
}

// ============ Issue ============
export interface IssueParentRef {
  id: string;
  issue_key?: string;
  title?: string;
  issue_type?: { name: string };
}

export interface Issue {
  id: string;
  project_id: string;
  board_id: string;
  column_id: string;
  issue_key: string;
  issue_number: number;
  title: string;
  description: string;
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  story_points?: number | null;
  position: number;
  issue_type_id?: string;
  issue_type?: IssueType;
  assignee_id?: string;
  assignee?: User;
  reporter_id?: string;
  reporter?: User;
  sprint_id?: string;
  sprint?: Sprint;
  epic_id?: string;
  epic?: Epic;
  parent_id?: string;
  parent?: IssueParentRef;
  due_date?: string | null;
  labels?: Label[];
  comments?: Comment[];
  created_at: string;
  updated_at: string;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  priority?: string;
  story_points?: number;
  issue_type_id?: string;
  column_id: string;
  assignee_id?: string;
  sprint_id?: string;
  epic_id?: string;
  parent_id?: string;
  label_ids?: string[];
  due_date?: string;
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  priority?: string;
  story_points?: number;
  issue_type_id?: string;
  assignee_id?: string;
  sprint_id?: string;
  epic_id?: string;
  label_ids?: string[];
}

export interface MoveIssueRequest {
  columnId: string; // camelCase to match backend @Body('columnId') decorator
  position: number;
}

// ============ IssueType ============
export interface IssueType {
  id: string;
  project_id: string;
  name: string;
  icon: string;
  color: string;
}

// ============ Sprint ============
export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  status: 'planning' | 'active' | 'completed';
  start_date?: string;
  end_date?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateSprintRequest {
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
}

// ============ Epic ============
export interface EpicIssueRef {
  id: string;
  issue_key?: string;
  title?: string;
  priority?: string;
  story_points?: number | null;
  column?: { name?: string; category?: string };
  assignee?: { id: string; display_name?: string; avatar_url?: string };
  issue_type?: { name: string; icon: string; color: string };
}

export interface Epic {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: string;
  color: string;
  start_date?: string;
  target_date?: string;
  created_at: string;
  issues?: EpicIssueRef[];
  _count?: { issues: number };
}

export interface CreateEpicRequest {
  name: string;
  description?: string;
  color?: string;
  start_date?: string;
  target_date?: string;
}

// ============ Label ============
export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateLabelRequest {
  name: string;
  color?: string;
}

// ============ Attachment ============
export interface Attachment {
  id: string;
  issue_id: string;
  uploader_id: string;
  uploader?: User;
  filename: string;
  mime_type: string;
  size: number;
  url: string;
  is_image: boolean;
  created_at: string;
}

// ============ Comment ============
export interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  user?: User;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
}
