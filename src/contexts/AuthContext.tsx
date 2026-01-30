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
  const [pendingOrganization, setPendingOrganization] = useState<Organization | null>(null);
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

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
      setPendingOrganization(null);
      setMemberRole("owner");
      return;
    }

    // Check for active membership
    const { data: activeMembership, error: activeError } = await supabase
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (activeError && activeError.code !== "PGRST116") {
      console.error("Error fetching active membership:", activeError);
    }

    if (activeMembership && activeMembership.organizations) {
      setOrganization(activeMembership.organizations as unknown as Organization);
      setPendingOrganization(null);
      setMemberRole(activeMembership.role as MemberRole);
      return;
    }

    // Check for pending membership
    const { data: pendingMembership, error: pendingError } = await supabase
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError && pendingError.code !== "PGRST116") {
      console.error("Error fetching pending membership:", pendingError);
    }

    if (pendingMembership && pendingMembership.organizations) {
      // Set pending state
      setPendingOrganization(pendingMembership.organizations as unknown as Organization);
      setOrganization(null);
      setMemberRole(null);
      return;
    }

    // No org at all
    setOrganization(null);
    setPendingOrganization(null);
    setMemberRole(null);
  }, []);

  // Handle invited member activation (from email invite link)
  const handleInvitedMemberActivation = useCallback(async (currentUser: User): Promise<boolean> => {
    const metadata = currentUser.user_metadata;

    // Check if this user was invited to an organization
    if (!metadata?.invited_to_organization) {
      return false;
    }

    const orgId = metadata.invited_to_organization;
    console.log("Detected invited member, org:", orgId);

    // Find the pending membership record by email and organization
    const { data: pendingMember, error: findError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email", currentUser.email!)
      .eq("status", "pending")
      .maybeSingle();

    if (findError) {
      console.error("Error finding pending membership:", findError);
      return false;
    }

    if (!pendingMember) {
      console.log("No pending membership found for invited user");
      return false;
    }

    console.log("Activating membership:", pendingMember.id);

    // Activate the membership
    const { error: updateMemberError } = await supabase
      .from("organization_members")
      .update({
        user_id: currentUser.id,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .eq("id", pendingMember.id);

    if (updateMemberError) {
      console.error("Error activating membership:", updateMemberError);
      return false;
    }

    // Update user profile to mark as member
    const { error: updateProfileError } = await supabase
      .from("user_profiles")
      .update({
        user_type: "member",
        primary_organization_id: orgId,
      })
      .eq("id", currentUser.id);

    if (updateProfileError) {
      console.error("Error updating user profile:", updateProfileError);
      // Don't return false here - membership was activated successfully
    }

    console.log("Invited member activated successfully");
    return true;
  }, []);

  // Handle pending membership creation for self-registration
  const handleMemberRegistration = useCallback(async (currentUser: User) => {
    const metadata = currentUser.user_metadata;

    // Skip if this is an invited member (handled by handleInvitedMemberActivation)
    if (metadata?.invited_to_organization) {
      return;
    }
    
    if (metadata?.registration_type === 'member' && metadata?.requested_org_id) {
      // Check if membership already exists
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('organization_id', metadata.requested_org_id)
        .maybeSingle();

      if (!existingMembership) {
        // Create pending membership
        const { error } = await supabase.from('organization_members').insert({
          organization_id: metadata.requested_org_id,
          user_id: currentUser.id,
          email: currentUser.email!,
          display_name: metadata.full_name || null,
          role: 'member',
          status: 'pending',
        });

        if (error) {
          console.error('Error creating pending membership:', error);
        }
      }
    }
  }, []);

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
    setPendingOrganization(null);
    setMemberRole("owner");

    return typedOrg;
  }, [user, profile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Defer profile and org fetching with setTimeout to prevent deadlock
        if (newSession?.user) {
          setTimeout(async () => {
            try {
              const userProfile = await fetchProfile(newSession.user.id);
              setProfile(userProfile);
              
              // Handle invited member activation FIRST (highest priority)
              const wasInvited = await handleInvitedMemberActivation(newSession.user);
              
              // Only handle self-registration if not an invited member
              if (!wasInvited) {
                await handleMemberRegistration(newSession.user);
              }
              
              await fetchOrganization(newSession.user.id);
            } catch (error) {
              console.error('Error loading user data:', error);
            } finally {
              // Only set loading false AFTER org is fetched to prevent flash
              if (event === "INITIAL_SESSION") {
                setLoading(false);
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setOrganization(null);
          setPendingOrganization(null);
          setMemberRole(null);
          // Set loading false when there's no user
          if (event === "INITIAL_SESSION") {
            setLoading(false);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        const userProfile = await fetchProfile(existingSession.user.id);
        setProfile(userProfile);
        
        // Handle invited member activation FIRST (highest priority)
        const wasInvited = await handleInvitedMemberActivation(existingSession.user);
        
        // Only handle self-registration if not an invited member
        if (!wasInvited) {
          await handleMemberRegistration(existingSession.user);
        }
        
        await fetchOrganization(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchOrganization, handleInvitedMemberActivation, handleMemberRegistration]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string,
    registrationType: 'owner' | 'member' = 'owner',
    requestedOrgId?: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          registration_type: registrationType,
          requested_org_id: registrationType === 'member' ? requestedOrgId : null,
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
        pendingOrganization,
        memberRole,
        loading,
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
