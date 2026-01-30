import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPendingMembership() {
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (membership?.organizations) {
        setOrganizationName((membership.organizations as any).name);
      }
    }

    fetchPendingMembership();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <img 
            src={mondayeaseLogo} 
            alt="MondayEase" 
            className="w-[180px] h-auto"
          />
        </div>

        {/* Pending Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffcd03]/20">
              <Clock className="h-6 w-6 text-[#ffcd03]" />
            </div>
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              Your request to join is being reviewed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              {organizationName ? (
                <>
                  Your request to join <span className="font-medium text-foreground">{organizationName}</span> is pending approval. The organization owner will review your request.
                </>
              ) : (
                <>
                  Your request to join the organization is pending approval. The organization owner will review your request.
                </>
              )}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              You'll be notified once your request is approved.
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
