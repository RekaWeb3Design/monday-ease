import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationMember, MemberRole } from "@/types";

interface UseOrganizationMembersReturn {
  members: OrganizationMember[];
  isLoading: boolean;
  error: Error | null;
  inviteMember: (email: string, displayName: string) => Promise<void>;
  updateMember: (memberId: string, updates: { displayName?: string; role?: MemberRole }) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  resetMemberPassword: (memberId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useOrganizationMembers(): UseOrganizationMembersReturn {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use organization ID directly (stable primitive) to prevent re-renders
  const orgId = organization?.id;

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!orgId) return [];

      const { data, error: fetchError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgId)
        .order("role", { ascending: true })
        .order("display_name", { ascending: true });

      if (fetchError) throw fetchError;

      // Cast the data to match our OrganizationMember type
      return (data || []).map((member) => ({
        ...member,
        role: member.role as MemberRole,
        status: member.status as "active" | "pending" | "disabled",
      }));
    },
    enabled: !!orgId,
    // CRITICAL: Prevent refetch on window focus - this prevents dialog closing on tab switch
    refetchOnWindowFocus: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["organization-members", orgId] });
  }, [queryClient, orgId]);

  const inviteMember = useCallback(
    async (email: string, displayName: string) => {
      if (!organization || !user) {
        throw new Error("Organization or user not available");
      }

      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: {
          email: email.toLowerCase().trim(),
          displayName: displayName.trim(),
          organizationId: organization.id,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to invite member.",
          variant: "destructive",
        });
        throw error;
      }

      if (!data?.success) {
        const errorMessage = data?.error || "Failed to invite member.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw new Error(errorMessage);
      }

      toast({
        title: "Invitation Sent",
        description: `${displayName} has been invited to join your organization.`,
      });

      await refetch();
    },
    [organization, user, toast, refetch]
  );

  const updateMember = useCallback(
    async (memberId: string, updates: { displayName?: string; role?: MemberRole }) => {
      const updateData: Record<string, string> = {};
      if (updates.displayName !== undefined) {
        updateData.display_name = updates.displayName.trim();
      }
      if (updates.role !== undefined) {
        updateData.role = updates.role;
      }

      const { error: updateError } = await supabase
        .from("organization_members")
        .update(updateData)
        .eq("id", memberId);

      if (updateError) {
        toast({
          title: "Error",
          description: updateError.message || "Failed to update member.",
          variant: "destructive",
        });
        throw updateError;
      }

      toast({
        title: "Member Updated",
        description: "Team member has been updated successfully.",
      });

      await refetch();
    },
    [toast, refetch]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const { error: deleteError } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

      if (deleteError) {
        toast({
          title: "Error",
          description: deleteError.message || "Failed to remove member.",
          variant: "destructive",
        });
        throw deleteError;
      }

      toast({
        title: "Member Removed",
        description: "Team member has been removed from the organization.",
      });

      await refetch();
    },
    [toast, refetch]
  );

  const resetMemberPassword = useCallback(
    async (memberId: string) => {
      if (!organization) {
        throw new Error("Organization not available");
      }

      const { data, error } = await supabase.functions.invoke("reset-member-password", {
        body: { memberId, organizationId: organization.id },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send password reset email",
          variant: "destructive",
        });
        throw error;
      }

      if (!data?.success) {
        const errorMessage = data?.error || "Failed to send password reset email";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        throw new Error(errorMessage);
      }

      toast({
        title: "Password Reset Sent",
        description: "A password reset email has been sent to the team member.",
      });
    },
    [organization, toast]
  );

  return {
    members,
    isLoading,
    error: error as Error | null,
    inviteMember,
    updateMember,
    removeMember,
    resetMemberPassword,
    refetch,
  };
}
