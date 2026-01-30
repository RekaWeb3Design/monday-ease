import { ReactNode, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireOrganizationProps {
  children: ReactNode;
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { user, organization, pendingOrganization, loading } = useAuth();
  const [activationTimeout, setActivationTimeout] = useState(false);

  // Check if this is an invited member
  const isInvitedMember = user?.user_metadata?.invited_to_organization;

  // Set a timeout for invited member activation
  // If activation doesn't complete within 5 seconds, stop waiting
  useEffect(() => {
    if (isInvitedMember && !organization && !loading) {
      const timer = setTimeout(() => {
        console.log("Invited member activation timeout - redirecting to onboarding");
        setActivationTimeout(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isInvitedMember, organization, loading]);

  // Reset timeout if organization becomes available
  useEffect(() => {
    if (organization) {
      setActivationTimeout(false);
    }
  }, [organization]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // For invited members: show brief loading while activation processes
  // But if timeout occurs or there's no pending membership, redirect to onboarding
  if (isInvitedMember && !organization && !activationTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Activating your membership...</p>
        </div>
      </div>
    );
  }

  // If invited member activation timed out, redirect to onboarding
  // This handles cases where no pending membership exists
  if (isInvitedMember && !organization && activationTimeout) {
    console.log("Invited member has no valid pending membership - redirecting to onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect pending members (self-registered) to pending approval page
  if (pendingOrganization && !organization) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Redirect users without org to onboarding
  if (!organization) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
