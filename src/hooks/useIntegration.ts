import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserIntegration } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface UseIntegrationReturn {
  integration: UserIntegration | null;
  isLoading: boolean;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

export function useIntegration(): UseIntegrationReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integration, setIntegration] = useState<UserIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIntegration = useCallback(async () => {
    if (!user) {
      setIntegration(null);
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
        .maybeSingle();

      if (error) {
        console.error("Error fetching integration:", error);
        toast({
          title: "Error",
          description: "Failed to fetch integration status",
          variant: "destructive",
        });
        return;
      }

      setIntegration(data as UserIntegration | null);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const isConnected = integration?.status === "connected";

  return {
    integration,
    isLoading,
    isConnected,
    refetch: fetchIntegration,
  };
}
