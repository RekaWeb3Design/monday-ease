import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIntegration } from "@/hooks/useIntegration";
import { useToast } from "@/hooks/use-toast";
import type { BoardConfig, MemberBoardAccess, BoardConfigWithAccess } from "@/types";

interface CreateConfigInput {
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  filter_column_type: string | null;
  visible_columns: string[];
  memberMappings: { member_id: string; filter_value: string }[];
}

interface UpdateConfigInput {
  filter_column_id?: string | null;
  filter_column_name?: string | null;
  filter_column_type?: string | null;
  visible_columns?: string[];
  memberMappings?: { member_id: string; filter_value: string }[];
}

interface UseBoardConfigsReturn {
  configs: BoardConfigWithAccess[];
  inactiveConfigs: BoardConfigWithAccess[];
  isLoading: boolean;
  createConfig: (input: CreateConfigInput) => Promise<boolean>;
  updateConfig: (id: string, updates: UpdateConfigInput) => Promise<boolean>;
  deleteConfig: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useBoardConfigs(): UseBoardConfigsReturn {
  const { organization } = useAuth();
  const { integration } = useIntegration();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<BoardConfigWithAccess[]>([]);
  const [inactiveConfigs, setInactiveConfigs] = useState<BoardConfigWithAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to map raw config to typed config
  const mapConfigFields = (config: any): Omit<BoardConfigWithAccess, 'memberAccess'> => ({
    id: config.id,
    organization_id: config.organization_id,
    monday_board_id: config.monday_board_id,
    board_name: config.board_name,
    filter_column_id: config.filter_column_id,
    filter_column_name: config.filter_column_name,
    filter_column_type: config.filter_column_type,
    visible_columns: (config.visible_columns as string[]) || [],
    is_active: config.is_active ?? true,
    monday_account_id: config.monday_account_id || null,
    workspace_name: config.workspace_name || null,
    target_audience: config.target_audience || null,
    created_at: config.created_at,
    updated_at: config.updated_at,
  });

  const fetchConfigs = useCallback(async () => {
    if (!organization) {
      setConfigs([]);
      setInactiveConfigs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch ALL configs for this organization (no account filter in query)
      const { data: allConfigsData, error: configsError } = await supabase
        .from("board_configs")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (configsError) throw configsError;

      const allConfigs = allConfigsData || [];
      const currentAccountId = integration?.monday_account_id;

      // JavaScript filtering - 100% reliable
      // ACTIVE: monday_account_id is NULL (legacy) OR matches current account
      const activeConfigsRaw = allConfigs.filter(config => 
        config.monday_account_id === null || 
        config.monday_account_id === currentAccountId
      );

      // INACTIVE: monday_account_id is NOT NULL AND does NOT match current account
      const inactiveConfigsRaw = allConfigs.filter(config => 
        config.monday_account_id !== null && 
        config.monday_account_id !== currentAccountId
      );

      // Fetch member access for ACTIVE configs only
      const activeConfigIds = activeConfigsRaw.map(c => c.id);
      let accessData: MemberBoardAccess[] = [];
      
      if (activeConfigIds.length > 0) {
        const { data: accessResult, error: accessError } = await supabase
          .from("member_board_access")
          .select("*")
          .in("board_config_id", activeConfigIds);

        if (accessError) throw accessError;
        accessData = (accessResult || []) as MemberBoardAccess[];
      }

      // Map active configs with member access
      const activeConfigs: BoardConfigWithAccess[] = activeConfigsRaw.map(config => ({
        ...mapConfigFields(config),
        memberAccess: accessData.filter(a => a.board_config_id === config.id),
      }));

      // Map inactive configs (no member access needed - read-only)
      const inactiveConfigsMapped: BoardConfigWithAccess[] = inactiveConfigsRaw.map(config => ({
        ...mapConfigFields(config),
        memberAccess: [],
      }));

      setConfigs(activeConfigs);
      setInactiveConfigs(inactiveConfigsMapped);
    } catch (err) {
      console.error("Error fetching board configs:", err);
      toast({
        title: "Error",
        description: "Failed to load board configurations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [organization, integration?.monday_account_id, toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const createConfig = useCallback(
    async (input: CreateConfigInput): Promise<boolean> => {
      if (!organization) {
        toast({
          title: "Error",
          description: "No organization selected.",
          variant: "destructive",
        });
        return false;
      }

      try {
        // Insert board config with workspace_name for display purposes
        const { data: configData, error: configError } = await supabase
          .from("board_configs")
          .insert({
            organization_id: organization.id,
            monday_board_id: input.monday_board_id,
            board_name: input.board_name,
            filter_column_id: input.filter_column_id,
            filter_column_name: input.filter_column_name,
            filter_column_type: input.filter_column_type,
            visible_columns: input.visible_columns,
            monday_account_id: integration?.monday_account_id || null,
            workspace_name: integration?.workspace_name || null,
            is_active: true,
          })
          .select()
          .single();

        if (configError) throw configError;

        // Insert member mappings
        if (input.memberMappings.length > 0) {
          const mappings = input.memberMappings
            .filter((m) => m.filter_value.trim() !== "")
            .map((m) => ({
              board_config_id: configData.id,
              member_id: m.member_id,
              filter_value: m.filter_value.trim(),
            }));

          if (mappings.length > 0) {
            const { error: mappingError } = await supabase
              .from("member_board_access")
              .insert(mappings);

            if (mappingError) throw mappingError;
          }
        }

        toast({
          title: "Board Added",
          description: `${input.board_name} has been configured successfully.`,
        });

        await fetchConfigs();
        return true;
      } catch (err) {
        console.error("Error creating board config:", err);
        toast({
          title: "Error",
          description: "Failed to create board configuration.",
          variant: "destructive",
        });
        return false;
      }
    },
    [organization, integration?.monday_account_id, toast, fetchConfigs]
  );

  const updateConfig = useCallback(
    async (id: string, updates: UpdateConfigInput): Promise<boolean> => {
      try {
        // Build the config update object (only include defined fields)
        const configUpdate: Partial<BoardConfig> = {};
        if (updates.filter_column_id !== undefined) {
          configUpdate.filter_column_id = updates.filter_column_id;
        }
        if (updates.filter_column_name !== undefined) {
          configUpdate.filter_column_name = updates.filter_column_name;
        }
        if (updates.filter_column_type !== undefined) {
          configUpdate.filter_column_type = updates.filter_column_type;
        }
        if (updates.visible_columns !== undefined) {
          configUpdate.visible_columns = updates.visible_columns;
        }

        // Update board_configs table if there are config changes
        if (Object.keys(configUpdate).length > 0) {
          const { error: configError } = await supabase
            .from("board_configs")
            .update(configUpdate)
            .eq("id", id);

          if (configError) throw configError;
        }

        // Handle member mappings if provided (delete + insert pattern)
        if (updates.memberMappings !== undefined) {
          // Delete existing mappings
          const { error: deleteError } = await supabase
            .from("member_board_access")
            .delete()
            .eq("board_config_id", id);

          if (deleteError) throw deleteError;

          // Insert new mappings
          if (updates.memberMappings.length > 0) {
            const mappings = updates.memberMappings
              .filter((m) => m.filter_value.trim() !== "")
              .map((m) => ({
                board_config_id: id,
                member_id: m.member_id,
                filter_value: m.filter_value.trim(),
              }));

            if (mappings.length > 0) {
              const { error: insertError } = await supabase
                .from("member_board_access")
                .insert(mappings);

              if (insertError) throw insertError;
            }
          }
        }

        toast({
          title: "Board Updated",
          description: "Board configuration has been updated.",
        });

        await fetchConfigs();
        return true;
      } catch (err) {
        console.error("Error updating board config:", err);
        toast({
          title: "Error",
          description: "Failed to update board configuration.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, fetchConfigs]
  );

  const deleteConfig = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // Delete member access first (cascade should handle this, but being explicit)
        await supabase
          .from("member_board_access")
          .delete()
          .eq("board_config_id", id);

        // Delete the config
        const { error } = await supabase
          .from("board_configs")
          .delete()
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Board Removed",
          description: "Board configuration has been removed.",
        });

        await fetchConfigs();
        return true;
      } catch (err) {
        console.error("Error deleting board config:", err);
        toast({
          title: "Error",
          description: "Failed to delete board configuration.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, fetchConfigs]
  );

  return {
    configs,
    inactiveConfigs,
    isLoading,
    createConfig,
    updateConfig,
    deleteConfig,
    refetch: fetchConfigs,
  };
}
