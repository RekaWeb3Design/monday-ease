import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import { Loader2 } from "lucide-react";

export function DashboardRedirect() {
  const { memberRole, loading } = useAuth();

  // Show loading while determining role
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Members (non-owners) go to /member dashboard
  if (memberRole !== "owner") {
    return <Navigate to="/member" replace />;
  }

  // Owners see the main dashboard
  return (
    <AppLayout pageTitle="Dashboard">
      <Dashboard />
    </AppLayout>
  );
}
