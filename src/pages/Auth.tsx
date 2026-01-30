import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Eye, EyeOff, Building2, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

interface Organization {
  id: string;
  name: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up form state
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Registration type state (NEW)
  const [registrationType, setRegistrationType] = useState<"owner" | "member">("owner");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Fetch organizations when member type is selected
  useEffect(() => {
    async function fetchOrganizations() {
      if (registrationType !== "member") return;
      
      setOrgsLoading(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("id, name")
          .order("name");

        if (error) throw error;
        setOrganizations(data || []);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setOrganizations([]);
      } finally {
        setOrgsLoading(false);
      }
    }

    fetchOrganizations();
  }, [registrationType]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError("");

    if (!signInEmail || !signInPassword) {
      setSignInError("Please fill in all fields");
      return;
    }

    setSignInLoading(true);
    try {
      await signIn(signInEmail, signInPassword);
      navigate("/");
    } catch (error: any) {
      setSignInError(error.message || "Failed to sign in. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess(false);

    if (!signUpFullName || !signUpEmail || !signUpPassword || !signUpConfirmPassword) {
      setSignUpError("Please fill in all fields");
      return;
    }

    if (registrationType === "member" && !selectedOrgId) {
      setSignUpError("Please select an organization to join");
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setSignUpError("Passwords do not match");
      return;
    }

    if (signUpPassword.length < 6) {
      setSignUpError("Password must be at least 6 characters");
      return;
    }

    setSignUpLoading(true);
    try {
      // Store the registration intent in user metadata for member registrations
      const metadata: Record<string, any> = {
        full_name: signUpFullName,
      };
      
      if (registrationType === "member") {
        metadata.registration_type = "member";
        metadata.requested_org_id = selectedOrgId;
      } else {
        metadata.registration_type = "owner";
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) throw error;

      // If member registration and user was created (email confirmation might be disabled)
      if (registrationType === "member" && data.user) {
        // Create pending membership record
        const { error: memberError } = await supabase
          .from("organization_members")
          .insert({
            organization_id: selectedOrgId,
            user_id: data.user.id,
            email: signUpEmail,
            display_name: signUpFullName,
            role: "member",
            status: "pending",
          });

        if (memberError) {
          console.error("Error creating membership:", memberError);
          // Don't throw - the user account was created, they just need manual membership
        }
      }

      setSignUpSuccess(true);
      // Clear form
      setSignUpFullName("");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpConfirmPassword("");
      setSelectedOrgId("");
      setRegistrationType("owner");
    } catch (error: any) {
      setSignUpError(error.message || "Failed to sign up. Please try again.");
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);

    if (!forgotPasswordEmail) {
      setForgotPasswordError("Please enter your email");
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setForgotPasswordSuccess(true);
      setForgotPasswordEmail("");
    } catch (error: any) {
      setForgotPasswordError(error.message || "Failed to send reset link. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordOpenChange = (open: boolean) => {
    setForgotPasswordOpen(open);
    if (!open) {
      // Reset state when closing
      setForgotPasswordEmail("");
      setForgotPasswordError("");
      setForgotPasswordSuccess(false);
    }
  };

  // Don't render auth page if already logged in
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
          <p className="text-sm text-muted-foreground">
            Streamline your Monday.com experience
          </p>
        </div>

        {/* Auth Card */}
        <Card>
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* Sign In Tab */}
              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                      >
                        {showSignInPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {signInError && (
                    <p className="text-sm text-destructive">{signInError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={signInLoading}>
                    {signInLoading ? "Signing in..." : "Sign In"}
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <Dialog open={forgotPasswordOpen} onOpenChange={handleForgotPasswordOpenChange}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                          Forgot password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        {forgotPasswordSuccess ? (
                          <Alert className="border-primary/50 bg-primary/10">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-foreground">
                              Check your email for the reset link.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="forgot-email">Email</Label>
                              <Input
                                id="forgot-email"
                                type="email"
                                placeholder="you@example.com"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              />
                            </div>
                            {forgotPasswordError && (
                              <p className="text-sm text-destructive">{forgotPasswordError}</p>
                            )}
                            <Button type="submit" className="w-full" disabled={forgotPasswordLoading}>
                              {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="mt-0">
                {signUpSuccess ? (
                  <Alert className="border-primary/50 bg-primary/10">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-foreground">
                      {registrationType === "member" 
                        ? "Account created! Check your email to confirm, then wait for organization approval."
                        : "Check your email to confirm your account before signing in."
                      }
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullname">Full Name</Label>
                      <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="John Doe"
                        value={signUpFullName}
                        onChange={(e) => setSignUpFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignUpPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        >
                          {showSignUpPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm"
                          type={showSignUpConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                        >
                          {showSignUpConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Registration Type Selector */}
                    <div className="space-y-3 rounded-lg border p-4">
                      <Label>I want to...</Label>
                      <RadioGroup 
                        value={registrationType} 
                        onValueChange={(value) => setRegistrationType(value as "owner" | "member")}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="owner" id="reg-owner" />
                          <Label htmlFor="reg-owner" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Building2 className="h-4 w-4 text-primary" />
                            <div>
                              <p className="font-medium">Create my organization</p>
                              <p className="text-xs text-muted-foreground">Set up a new workspace</p>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="member" id="reg-member" />
                          <Label htmlFor="reg-member" className="flex items-center gap-2 cursor-pointer flex-1">
                            <UserPlus className="h-4 w-4 text-primary" />
                            <div>
                              <p className="font-medium">Join existing organization</p>
                              <p className="text-xs text-muted-foreground">Request to join a team</p>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Organization Selector (only for member registration) */}
                    {registrationType === "member" && (
                      <div className="space-y-2">
                        <Label htmlFor="org-select">Organization</Label>
                        <Select 
                          value={selectedOrgId} 
                          onValueChange={setSelectedOrgId}
                          disabled={orgsLoading}
                        >
                          <SelectTrigger id="org-select">
                            <SelectValue placeholder={orgsLoading ? "Loading organizations..." : "Select organization to join..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No organizations available
                              </div>
                            ) : (
                              organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {signUpError && (
                      <p className="text-sm text-destructive">{signUpError}</p>
                    )}
                    <Button type="submit" className="w-full" disabled={signUpLoading}>
                      {signUpLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
