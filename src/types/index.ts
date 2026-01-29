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
