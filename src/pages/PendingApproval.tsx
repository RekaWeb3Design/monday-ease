import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { pendingOrganization, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <img src={mondayeaseLogo} alt="MondayEase" className="h-auto w-[180px]" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <CardTitle className="text-xl">Pending Approval</CardTitle>
            <CardDescription>
              Your request to join{" "}
              <span className="font-medium text-foreground">
                {pendingOrganization?.name || "the organization"}
              </span>{" "}
              is pending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The organization owner will review your request. You'll gain access once approved.
            </p>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
