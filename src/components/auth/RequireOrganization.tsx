import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireOrganizationProps {
  children: ReactNode;
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { organization, pendingOrganization, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect pending members to pending approval page
  if (pendingOrganization && !organization) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Redirect users without org to onboarding
  if (!organization) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
