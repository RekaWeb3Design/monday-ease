import { createContext, useState, useCallback, useEffect, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, Organization, MemberRole, AuthContextType } from "@/types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [activatingMembership, setActivatingMembership] = useState(false);

  // Fetch user profile from user_profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as UserProfile | null;
  }, []);

  // Fetch organization for user
  const fetchOrganization = useCallback(async (userId: string) => {
    // First check if user owns an organization
    const { data: ownedOrg, error: ownedError } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    if (ownedError && ownedError.code !== "PGRST116") {
      console.error("Error fetching owned organization:", ownedError);
    }

    if (ownedOrg) {
      setOrganization(ownedOrg as Organization);
      setMemberRole("owner");
      return;
    }

    // Otherwise check membership
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (memberError && memberError.code !== "PGRST116") {
      console.error("Error fetching membership:", memberError);
    }

    if (membership && membership.organizations) {
      setOrganization(membership.organizations as unknown as Organization);
      setMemberRole(membership.role as MemberRole);
    } else {
      setOrganization(null);
      setMemberRole(null);
    }
  }, []);

  // Activate invited member via edge function
  const activateInvitedMember = useCallback(async (currentUser: User) => {
    const invitedOrgId = currentUser.user_metadata?.invited_to_organization;
    
    if (!invitedOrgId) {
      return false; // Not an invited member
    }
    
    console.log("Detected invited member, activating membership...");
    setActivatingMembership(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('activate-invited-member');
      
      if (error) {
        console.error("Error activating membership:", error);
        return false;
      }
      
      if (data?.success) {
        console.log("Membership activated, refreshing organization data...");
        // Refresh organization data to pick up the new membership
        await fetchOrganization(currentUser.id);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Failed to activate invited member:", err);
      return false;
    } finally {
      setActivatingMembership(false);
    }
  }, [fetchOrganization]);

  // Refresh organization data
  const refreshOrganization = useCallback(async () => {
    if (user) {
      await fetchOrganization(user.id);
    }
  }, [user, fetchOrganization]);

  // Create organization function
  const createOrganization = useCallback(async (name: string): Promise<Organization> => {
    if (!user || !profile) {
      throw new Error("User must be authenticated to create an organization");
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const uniqueSlug = `${slug}-${Date.now()}`;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug: uniqueSlug,
        owner_id: user.id,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Also create owner as member
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
        status: "active",
        email: profile.email,
        display_name: profile.full_name,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error("Error creating owner membership:", memberError);
    }

    // Update user profile with primary organization
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ primary_organization_id: org.id })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile with organization:", profileError);
    }

    const typedOrg = org as Organization;
    setOrganization(typedOrg);
    setMemberRole("owner");

    return typedOrg;
  }, [user, profile]);

  // Effect 1: Listen for auth state changes — synchronous state updates only.
  // Avoids calling async Supabase methods inside the callback (deadlock risk).
  // The INITIAL_SESSION event fires on mount with the existing session if any.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (!newSession?.user) {
          setProfile(null);
          setOrganization(null);
          setMemberRole(null);
        }

        setAuthInitialized(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Effect 2: Once auth is initialized, load profile + org data for the user.
  // Also activates invited members if they have invitation metadata.
  useEffect(() => {
    if (!authInitialized) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const userProfile = await fetchProfile(user.id);
        if (cancelled) return;
        setProfile(userProfile);
        
        await fetchOrganization(user.id);
        
        // If user has invitation metadata, activate their membership
        // This happens when an invited user confirms their account
        if (!cancelled) {
          const invitedOrgId = user.user_metadata?.invited_to_organization;
          if (invitedOrgId) {
            await activateInvitedMember(user);
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, user, fetchProfile, fetchOrganization, activateInvitedMember]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        organization,
        memberRole,
        loading: loading || activatingMembership,
        signIn,
        signUp,
        signOut,
        createOrganization,
        refreshOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
