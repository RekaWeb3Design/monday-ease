import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface RequireOrganizationProps {
  children: ReactNode;
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { user, organization, loading, profile } = useAuth();
  const [hasPendingMembership, setHasPendingMembership] = useState<boolean | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(true);

  useEffect(() => {
    async function checkPendingMembership() {
      if (!user || loading) {
        setCheckingMembership(false);
        return;
      }

      // If user already has an organization, no need to check pending
      if (organization) {
        setHasPendingMembership(false);
        setCheckingMembership(false);
        return;
      }

      try {
        const { data: pendingMembership } = await supabase
          .from("organization_members")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle();

        setHasPendingMembership(!!pendingMembership);
      } catch (error) {
        console.error("Error checking pending membership:", error);
        setHasPendingMembership(false);
      } finally {
        setCheckingMembership(false);
      }
    }

    checkPendingMembership();
  }, [user, organization, loading]);

  if (loading || checkingMembership) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has a pending membership, redirect to pending approval page
  if (!organization && hasPendingMembership) {
    return <Navigate to="/pending-approval" replace />;
  }

  // If user has no organization and no pending membership, redirect to onboarding
  // But only if they registered as an owner (check user metadata)
  if (!organization) {
    // Check if user registered as a member - they shouldn't go to onboarding
    const registrationType = user?.user_metadata?.registration_type;
    
    if (registrationType === "member") {
      // Member without pending membership - something went wrong, send to pending anyway
      return <Navigate to="/pending-approval" replace />;
    }
    
    // Owner registration - send to onboarding to create org
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
