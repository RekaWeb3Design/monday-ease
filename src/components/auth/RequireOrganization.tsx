import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireOrganizationProps {
  children: ReactNode;
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { user, organization, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has an organization, render children
  if (organization) {
    return <>{children}</>;
  }

  // Check if user registered as a member - they shouldn't go to onboarding
  const registrationType = user?.user_metadata?.registration_type;
  
  if (registrationType === "member") {
    // Member without organization - redirect to auth to sign up again
    return <Navigate to="/auth" replace />;
  }
  
  // Owner registration - send to onboarding to create org
  return <Navigate to="/onboarding" replace />;
}
