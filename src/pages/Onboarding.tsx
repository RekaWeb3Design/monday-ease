import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

export default function Onboarding() {
  const navigate = useNavigate();
  const { organization, createOrganization, loading: authLoading } = useAuth();

  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Redirect to dashboard if user already has an organization
  useEffect(() => {
    if (!authLoading && organization) {
      navigate("/", { replace: true });
    }
  }, [organization, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = orgName.trim();
    if (!trimmedName) {
      setError("Please enter an organization name");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Organization name must be at least 2 characters");
      return;
    }

    setIsCreating(true);
    try {
      await createOrganization(trimmedName);
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Error creating organization:", err);
      setError(err.message || "Failed to create organization. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Show loading while checking auth/org status
  if (authLoading) {
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
          <img
            src={mondayeaseLogo}
            alt="MondayEase"
            className="h-auto w-[180px]"
          />
          <p className="text-sm text-muted-foreground">
            Streamline your Monday.com experience
          </p>
        </div>

        {/* Onboarding Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Create Your Organization</CardTitle>
            <CardDescription>
              Set up your workspace to start inviting team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  type="text"
                  placeholder="e.g., Acme Corp"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isCreating}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
