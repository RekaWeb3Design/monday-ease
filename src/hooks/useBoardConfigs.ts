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

interface UseBoardConfigsReturn {
  configs: BoardConfigWithAccess[];
  inactiveConfigs: BoardConfigWithAccess[];
  isLoading: boolean;
  createConfig: (input: CreateConfigInput) => Promise<boolean>;
  updateConfig: (id: string, updates: Partial<BoardConfig>) => Promise<boolean>;
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

  const fetchConfigs = useCallback(async () => {
    if (!organization) {
      setConfigs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Build the query
      let query = supabase
        .from("board_configs")
        .select("*")
        .eq("organization_id", organization.id);

      // Filter by monday_account_id: match current account OR null (legacy)
      // Note: String values in .or() must be quoted for Supabase to parse correctly
      if (integration?.monday_account_id) {
        query = query.or(
          `monday_account_id.eq."${integration.monday_account_id}",monday_account_id.is.null`
        );
      }

      const { data: configsData, error: configsError } = await query
        .order("created_at", { ascending: false });

      if (configsError) throw configsError;

      // Fetch member access for all configs
      const configIds = (configsData || []).map((c) => c.id);
      
      let accessData: MemberBoardAccess[] = [];
      if (configIds.length > 0) {
        const { data: accessResult, error: accessError } = await supabase
          .from("member_board_access")
          .select("*")
          .in("board_config_id", configIds);

        if (accessError) throw accessError;
        accessData = (accessResult || []) as MemberBoardAccess[];
      }

      // Combine configs with their member access
      const configsWithAccess: BoardConfigWithAccess[] = (configsData || []).map((config) => ({
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
        created_at: config.created_at,
        updated_at: config.updated_at,
        memberAccess: accessData.filter((a) => a.board_config_id === config.id),
      }));

      setConfigs(configsWithAccess);

      // Fetch inactive configs (different monday_account_id, not null)
      let inactiveData: BoardConfigWithAccess[] = [];
      if (integration?.monday_account_id) {
        const { data: inactiveConfigsData } = await supabase
          .from("board_configs")
          .select("*")
          .eq("organization_id", organization.id)
          .not("monday_account_id", "is", null)
          .neq("monday_account_id", integration.monday_account_id)
          .order("created_at", { ascending: false });

        if (inactiveConfigsData) {
          inactiveData = inactiveConfigsData.map((config) => ({
            id: config.id,
            organization_id: config.organization_id,
            monday_board_id: config.monday_board_id,
            board_name: config.board_name,
            filter_column_id: config.filter_column_id,
            filter_column_name: config.filter_column_name,
            filter_column_type: config.filter_column_type,
            visible_columns: (config.visible_columns as string[]) || [],
            is_active: config.is_active ?? true,
            monday_account_id: config.monday_account_id,
            created_at: config.created_at,
            updated_at: config.updated_at,
            memberAccess: [], // No need to load member access for inactive
          }));
        }
      }
      setInactiveConfigs(inactiveData);
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
        // Insert board config
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
    async (id: string, updates: Partial<BoardConfig>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("board_configs")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

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
