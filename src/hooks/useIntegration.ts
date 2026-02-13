import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserIntegration } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface UseIntegrationReturn {
  /** First connected integration (backward compat) */
  integration: UserIntegration | null;
  /** All Monday.com integrations for the current user */
  integrations: UserIntegration[];
  isLoading: boolean;
  /** True if at least one integration is connected */
  isConnected: boolean;
  refetch: () => Promise<void>;
  /** Look up a specific integration by Monday account ID */
  getIntegrationByAccountId: (accountId: string) => UserIntegration | undefined;
}

export function useIntegration(): UseIntegrationReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    if (!user) {
      setIntegrations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("integration_type", "monday")
        .order("connected_at", { ascending: false });

      if (error) {
        console.error("Error fetching integrations:", error);
        toast({
          title: "Error",
          description: "Failed to fetch integration status",
          variant: "destructive",
        });
        return;
      }

      setIntegrations((data as UserIntegration[]) || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Backward compat: first connected integration, or first overall
  const integration = useMemo(() => {
    const connected = integrations.find((i) => i.status === "connected");
    return connected || integrations[0] || null;
  }, [integrations]);

  const isConnected = integrations.some((i) => i.status === "connected");

  const getIntegrationByAccountId = useCallback(
    (accountId: string) => {
      return integrations.find((i) => i.monday_account_id === accountId);
    },
    [integrations]
  );

  return {
    integration,
    integrations,
    isLoading,
    isConnected,
    refetch: fetchIntegrations,
    getIntegrationByAccountId,
  };
}
