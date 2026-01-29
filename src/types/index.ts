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

// Auth context types
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
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
