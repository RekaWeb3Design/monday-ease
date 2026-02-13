import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UseDisconnectIntegrationReturn {
  /** Disconnect ALL integrations of a given type (backward compat) */
  disconnect: (integrationType: string) => Promise<boolean>;
  /** Disconnect a specific integration by its row ID */
  disconnectById: (integrationId: string) => Promise<boolean>;
  isDisconnecting: boolean;
}

export function useDisconnectIntegration(): UseDisconnectIntegrationReturn {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const disconnect = async (integrationType: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to disconnect integrations",
        variant: "destructive",
      });
      return false;
    }

    setIsDisconnecting(true);

    try {
      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("user_id", user.id)
        .eq("integration_type", integrationType);

      if (error) {
        console.error("Error disconnecting integration:", error);
        toast({
          title: "Error",
          description: "Failed to disconnect integration",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: `${integrationType === 'monday' ? 'Monday.com' : integrationType} disconnected successfully`,
      });
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  };

  const disconnectById = async (integrationId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to disconnect integrations",
        variant: "destructive",
      });
      return false;
    }

    setIsDisconnecting(true);

    try {
      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("id", integrationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error disconnecting integration:", error);
        toast({
          title: "Error",
          description: "Failed to disconnect integration",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Monday.com account disconnected successfully",
      });
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  };

  return { disconnect, disconnectById, isDisconnecting };
}
