import type { Session, User } from "@supabase/supabase-js";

// User profile from database (user_profiles table)
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string | null;
  avatar_url: string | null;
  primary_organization_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Organization from database (organizations table)
export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  monday_workspace_id: string | null;
  settings: Record<string, any> | null;
  max_members: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Organization member from database (organization_members table)
export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  status: 'active' | 'pending' | 'disabled';
  display_name: string | null;
  email: string;
  invited_at: string | null;
  joined_at: string | null;
}

// Member role type
export type MemberRole = 'owner' | 'admin' | 'member';

// Auth context types
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organization: Organization | null;
  memberRole: MemberRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  createOrganization: (name: string) => Promise<Organization>;
  refreshOrganization: () => Promise<void>;
}

// Navigation types
export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Stat card types for dashboard
export interface StatCard {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// User integration from database (user_integrations table)
export interface UserIntegration {
  id: string;
  user_id: string;
  integration_type: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  workspace_name: string | null;
  monday_account_id: string | null;
  monday_user_id: string | null;
  access_token: string;
  scopes: string[] | null;
  connected_at: string | null;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Board config from database (board_configs table)
export interface BoardConfig {
  id: string;
  organization_id: string;
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  filter_column_type: string | null;
  visible_columns: string[];
  is_active: boolean;
  monday_account_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Monday.com user from API
export interface MondayUser {
  id: string;
  name: string;
  email: string;
}

// Member board access from database (member_board_access table)
export interface MemberBoardAccess {
  id: string;
  board_config_id: string;
  member_id: string;
  filter_value: string;
  created_at: string | null;
  updated_at: string | null;
}

// Monday.com board from API
export interface MondayBoard {
  id: string;
  name: string;
  board_kind: string;
  columns: MondayColumn[];
}

// Monday.com column from API
export interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

// Board config with member access (for UI)
export interface BoardConfigWithAccess extends BoardConfig {
  memberAccess: MemberBoardAccess[];
}

// Monday.com task item from API (for member dashboard)
export interface MondayTask {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
}

// Column value from Monday.com (for member dashboard)
export interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string | null;
  value: any;
}

// Workflow template from database (workflow_templates table)
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  n8n_webhook_url: string;
  input_schema: Record<string, any>;
  is_active: boolean | null;
  is_premium: boolean | null;
  execution_count: number | null;
  created_at: string | null;
}

// Workflow execution record from database (workflow_executions table)
export interface WorkflowExecution {
  id: string;
  template_id: string | null;
  organization_id: string | null;
  user_id: string | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  input_params: Record<string, any> | null;
  output_result: Record<string, any> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  execution_time_ms: number | null;
  created_at: string | null;
  workflow_templates?: WorkflowTemplate;
}

// ============== Custom Board Views ==============

// Custom board view configuration
export interface CustomBoardView {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  monday_board_id: string;
  monday_board_name: string | null;
  selected_columns: ViewColumn[];
  settings: ViewSettings;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ViewColumn {
  id: string;
  title: string;
  type: string;
  width?: number;
}

export interface ViewSettings {
  show_item_name: boolean;
  row_height: 'compact' | 'default' | 'comfortable';
  enable_search: boolean;
  enable_filters: boolean;
  default_sort_column: string | null;
  default_sort_order: 'asc' | 'desc';
  view_mode: 'table' | 'cards' | 'gallery';
}

export interface ViewDataResponse {
  view: {
    name: string;
    icon: string;
    settings: ViewSettings;
    columns: ViewColumn[];
  };
  items: ViewDataItem[];
  total_count: number;
  page: number;
  limit: number;
}

export interface ViewDataItem {
  id: string;
  name: string;
  column_values: Record<string, ViewColumnValue>;
}

export interface ViewColumnValue {
  text: string | null;
  value: any;
  type: string;
  label?: string;
  label_style?: { color?: string };
}
