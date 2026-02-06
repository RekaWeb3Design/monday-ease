import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Client, ClientWithAccessCount, ClientBoardAccess, CreateClientResponse } from "@/types";

interface CreateClientInput {
  companyName: string;
  contactName: string;
  contactEmail: string;
  phone?: string | null;
  clientType?: string | null;
  notes?: string | null;
  boardConfigs: { boardConfigId: string; filterValue: string | null }[];
}

interface UpdateClientInput {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string | null;
  clientType?: string | null;
  notes?: string | null;
  status?: 'active' | 'inactive' | 'archived';
}

export function useClients() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all clients for the organization
  const {
    data: clients = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["clients", organization?.id],
    queryFn: async (): Promise<ClientWithAccessCount[]> => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("clients")
        .select("*, client_board_access(count)")
        .eq("organization_id", organization.id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map the count from the nested relation
      return (data || []).map((client: any) => ({
        ...client,
        board_access_count: client.client_board_access?.[0]?.count || 0,
      }));
    },
    enabled: !!organization?.id,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (input: CreateClientInput): Promise<CreateClientResponse> => {
      if (!organization?.id) throw new Error("No organization selected");

      const { data, error } = await supabase.functions.invoke("create-client", {
        body: {
          organizationId: organization.id,
          companyName: input.companyName,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          phone: input.phone || null,
          clientType: input.clientType || null,
          notes: input.notes || null,
          boardConfigs: input.boardConfigs,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create client");

      return data as CreateClientResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", organization?.id] });
      toast.success("Client created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating client:", error);
      toast.error(error.message || "Failed to create client");
    },
  });

  // Update client mutation
  const updateClientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateClientInput }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          company_name: updates.companyName,
          contact_name: updates.contactName,
          contact_email: updates.contactEmail,
          phone: updates.phone,
          client_type: updates.clientType,
          notes: updates.notes,
          status: updates.status,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", organization?.id] });
      toast.success("Client updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating client:", error);
      toast.error("Failed to update client");
    },
  });

  // Delete client mutation (soft delete - set status to archived)
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .update({ status: "archived" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", organization?.id] });
      toast.success("Client deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    },
  });

  // Regenerate password mutation
  const regeneratePasswordMutation = useMutation({
    mutationFn: async (clientId: string): Promise<{ password: string }> => {
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: {
          regeneratePassword: true,
          clientId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to regenerate password");

      return { password: data.password };
    },
    onSuccess: () => {
      toast.success("Password regenerated successfully");
    },
    onError: (error: Error) => {
      console.error("Error regenerating password:", error);
      toast.error("Failed to regenerate password");
    },
  });

  // Fetch client board access
  const fetchClientBoardAccess = async (clientId: string): Promise<ClientBoardAccess[]> => {
    const { data, error } = await supabase
      .from("client_board_access")
      .select("*")
      .eq("client_id", clientId);

    if (error) throw error;
    return data || [];
  };

  // Update client board access
  const updateBoardAccessMutation = useMutation({
    mutationFn: async ({
      clientId,
      boardConfigs,
    }: {
      clientId: string;
      boardConfigs: { boardConfigId: string; filterValue: string | null }[];
    }) => {
      // Delete existing access
      await supabase.from("client_board_access").delete().eq("client_id", clientId);

      // Insert new access
      if (boardConfigs.length > 0) {
        const { error } = await supabase.from("client_board_access").insert(
          boardConfigs.map((bc) => ({
            client_id: clientId,
            board_config_id: bc.boardConfigId,
            filter_value: bc.filterValue,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", organization?.id] });
      toast.success("Board access updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating board access:", error);
      toast.error("Failed to update board access");
    },
  });

  return {
    clients,
    isLoading,
    error,
    refetch,
    createClient: createClientMutation.mutateAsync,
    isCreating: createClientMutation.isPending,
    updateClient: updateClientMutation.mutateAsync,
    isUpdating: updateClientMutation.isPending,
    deleteClient: deleteClientMutation.mutateAsync,
    isDeleting: deleteClientMutation.isPending,
    regeneratePassword: regeneratePasswordMutation.mutateAsync,
    isRegenerating: regeneratePasswordMutation.isPending,
    fetchClientBoardAccess,
    updateBoardAccess: updateBoardAccessMutation.mutateAsync,
    isUpdatingAccess: updateBoardAccessMutation.isPending,
  };
}
