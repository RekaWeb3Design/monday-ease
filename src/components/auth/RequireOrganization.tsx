import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireOrganizationProps {
  children: ReactNode;
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { user, organization, pendingOrganization, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if this is an invited member being activated
  // The AuthContext's handleInvitedMemberActivation will process this
  // We need to wait for it to complete before redirecting to onboarding
  const isInvitedMember = user?.user_metadata?.invited_to_organization;
  
  if (isInvitedMember && !organization) {
    // Still processing the invited member activation
    // Show loading state while AuthContext activates the membership
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Activating your membership...</p>
        </div>
      </div>
    );
  }

  // Redirect pending members (self-registered) to pending approval page
  if (pendingOrganization && !organization) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Redirect users without org to onboarding (only for non-invited users)
  if (!organization) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
