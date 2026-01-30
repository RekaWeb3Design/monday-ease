import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle, Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();

  // Invited user state
  const [isInvitedUser, setIsInvitedUser] = useState(false);
  const [invitedOrganizationId, setInvitedOrganizationId] = useState<string | null>(null);
  const [invitedUserName, setInvitedUserName] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isActivatingMembership, setIsActivatingMembership] = useState(false);
  const [activationError, setActivationError] = useState("");

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

  // Forgot password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Detect invited users and redirect authenticated non-invited users
  useEffect(() => {
    if (!loading && user) {
      const invitedOrgId = user.user_metadata?.invited_to_organization;
      
      if (invitedOrgId) {
        // This is an invited user - show password setup
        setIsInvitedUser(true);
        setInvitedOrganizationId(invitedOrgId);
        setInvitedUserName(user.user_metadata?.full_name || "");
      } else {
        // Normal authenticated user - go to dashboard
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError("");

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      setActivationError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setActivationError("Password must be at least 6 characters");
      return;
    }

    if (!user?.email || !invitedOrganizationId) {
      setActivationError("Missing user information. Please try again.");
      return;
    }

    setIsActivatingMembership(true);

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Find the pending membership record
      const { data: member, error: memberError } = await supabase
        .from("organization_members")
        .select("id")
        .eq("email", user.email)
        .eq("organization_id", invitedOrganizationId)
        .eq("status", "pending")
        .maybeSingle();

      if (memberError) {
        console.error("Error finding membership:", memberError);
        throw new Error("Failed to find your membership. Please contact support.");
      }

      if (!member) {
        console.warn("No pending membership found, redirecting to onboarding");
        navigate("/onboarding", { replace: true });
        return;
      }

      // Activate membership
      const { error: activateError } = await supabase
        .from("organization_members")
        .update({
          status: "active",
          user_id: user.id,
          joined_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (activateError) {
        console.error("Error activating membership:", activateError);
        throw new Error("Failed to activate your membership. Please try again.");
      }

      // Clear the invited metadata so they won't see this form again
      await supabase.auth.updateUser({
        data: { invited_to_organization: null },
      });

      // Redirect to member dashboard
      navigate("/member", { replace: true });
    } catch (err: any) {
      setActivationError(err.message || "Failed to complete setup. Please try again.");
    } finally {
      setIsActivatingMembership(false);
    }
  };

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
      await signUp(signUpEmail, signUpPassword, signUpFullName);
      setSignUpSuccess(true);
      // Clear form
      setSignUpFullName("");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpConfirmPassword("");
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

  // Don't render auth page if loading
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

        {/* Invited User Password Setup */}
        {isInvitedUser ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Welcome to the Team!</CardTitle>
              <CardDescription>
                {invitedUserName ? `Hi ${invitedUserName}, set` : "Set"} your password to complete your account setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                {activationError && (
                  <p className="text-sm text-destructive">{activationError}</p>
                )}
                <Button type="submit" className="w-full" disabled={isActivatingMembership}>
                  {isActivatingMembership ? "Setting up..." : "Complete Setup"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Auth Card with Tabs */
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
                        Check your email to confirm your account before signing in.
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
        )}
      </div>
    </div>
  );
}
