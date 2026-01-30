import { useState, useEffect, useCallback } from "react";
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
  refetch: () => Promise<void>;
}

export function useOrganizationMembers(): UseOrganizationMembersReturn {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!organization) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organization.id)
        .order("role", { ascending: true })
        .order("display_name", { ascending: true });

      if (fetchError) throw fetchError;

      // Cast the data to match our OrganizationMember type
      const typedMembers: OrganizationMember[] = (data || []).map((member) => ({
        ...member,
        role: member.role as MemberRole,
        status: member.status as "active" | "pending" | "disabled",
      }));

      setMembers(typedMembers);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch members");
      setError(error);
      toast({
        title: "Error",
        description: "Failed to load team members. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [organization, toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = useCallback(
    async (email: string, displayName: string) => {
      if (!organization || !user) {
        throw new Error("Organization or user not available");
      }

      // Call the invite-member Edge Function
      const { data, error: invokeError } = await supabase.functions.invoke("invite-member", {
        body: {
          email: email.toLowerCase().trim(),
          displayName: displayName.trim(),
          organizationId: organization.id,
        },
      });

      if (invokeError) {
        toast({
          title: "Error",
          description: invokeError.message || "Failed to invite member.",
          variant: "destructive",
        });
        throw invokeError;
      }

      // Check for error in response body
      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        throw new Error(data.error);
      }

      toast({
        title: "Invitation Sent",
        description: `An invitation email has been sent to ${email}.`,
      });

      await fetchMembers();
    },
    [organization, user, toast, fetchMembers]
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

      await fetchMembers();
    },
    [toast, fetchMembers]
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

      await fetchMembers();
    },
    [toast, fetchMembers]
  );

  return {
    members,
    isLoading,
    error,
    inviteMember,
    updateMember,
    removeMember,
    refetch: fetchMembers,
  };
}
