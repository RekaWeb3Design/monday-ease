

# Change Invite Flow: Password Reset Instead of Magic Link

## Problem

When invited users click the magic link email, they're auto-logged in but have **no password**. If the link expires or they log out, they're permanently locked out of their account.

## Solution Overview

Replace `inviteUserByEmail()` with a two-step approach:
1. Create user with temporary password (auto-confirm email)
2. Generate password recovery link and send it

The user receives a "Set up your account" email, clicks the link, sets their password, and is then activated as a member.

---

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/invite-member/index.ts` | UPDATE | Replace invite API with createUser + generateLink |
| `src/pages/Auth.tsx` | UPDATE | Add password setup form for recovery sessions |

---

## 1. Edge Function Changes (`invite-member/index.ts`)

### Current Flow (Lines 68-80)
```typescript
// Current: Magic link invite
const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
  email.toLowerCase().trim(),
  {
    redirectTo: `${siteUrl}/auth`,
    data: {
      invited_to_organization: organizationId,
      display_name: displayName.trim(),
    },
  }
);
```

### New Flow
```typescript
// Step 1: Create user with temp password (email auto-confirmed)
const tempPassword = crypto.randomUUID();
const normalizedEmail = email.toLowerCase().trim();

const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
  email: normalizedEmail,
  password: tempPassword,
  email_confirm: true, // Skip email confirmation
  user_metadata: {
    invited_to_organization: organizationId,
    display_name: displayName.trim(),
  },
});

if (createError) {
  // Rollback member record
  await adminClient.from("organization_members").delete().eq("id", newMember.id);
  console.error("User creation error:", createError);
  return jsonResponse({ error: "Failed to create user account" }, 500);
}

// Step 2: Generate password recovery link
const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
  type: 'recovery',
  email: normalizedEmail,
  options: {
    redirectTo: `${siteUrl}/auth`,
  },
});

if (linkError) {
  // Full cleanup: delete user and member record
  await adminClient.auth.admin.deleteUser(newUser.user.id);
  await adminClient.from("organization_members").delete().eq("id", newMember.id);
  console.error("Link generation error:", linkError);
  return jsonResponse({ error: "Failed to generate invitation link" }, 500);
}

// The auth-email-hook will intercept and send the branded email
// Since we're using 'recovery' type, it will use the password reset template
console.log(`Invitation created for ${email}, recovery link generated`);
```

---

## 2. Auth.tsx Changes

### Add State for Password Setup

```typescript
// NEW: Password setup state for invited members
const [showPasswordSetup, setShowPasswordSetup] = useState(false);
const [setupPassword, setSetupPassword] = useState("");
const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
const [setupError, setSetupError] = useState("");
const [setupLoading, setSetupLoading] = useState(false);
const [showSetupPassword, setShowSetupPassword] = useState(false);
const [showSetupConfirmPassword, setShowSetupConfirmPassword] = useState(false);
```

### Add Recovery Detection Effect

```typescript
// Detect if user arrived via password recovery link
useEffect(() => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const type = hashParams.get('type');
  
  if (type === 'recovery') {
    // User came from password reset/setup link
    setShowPasswordSetup(true);
  }
}, []);
```

### Add Password Setup Handler

```typescript
const handlePasswordSetup = async (e: React.FormEvent) => {
  e.preventDefault();
  setSetupError("");

  if (!setupPassword || !setupConfirmPassword) {
    setSetupError("Please fill in all fields");
    return;
  }

  if (setupPassword !== setupConfirmPassword) {
    setSetupError("Passwords do not match");
    return;
  }

  if (setupPassword.length < 6) {
    setSetupError("Password must be at least 6 characters");
    return;
  }

  setSetupLoading(true);
  try {
    const { error } = await supabase.auth.updateUser({ 
      password: setupPassword 
    });
    
    if (error) throw error;
    
    // Password set! AuthContext will detect invited_to_organization
    // and call activate-invited-member, then redirect appropriately
    navigate("/", { replace: true });
  } catch (error: any) {
    setSetupError(error.message || "Failed to set password. Please try again.");
  } finally {
    setSetupLoading(false);
  }
};
```

### Add Password Setup UI

Render this when `showPasswordSetup` is true (before the main Tabs component):

```tsx
{showPasswordSetup ? (
  <Card>
    <CardHeader className="text-center pb-2">
      <h2 className="text-xl font-semibold">Set Your Password</h2>
      <p className="text-sm text-muted-foreground">
        Create a password to complete your account setup
      </p>
    </CardHeader>
    <CardContent>
      <form onSubmit={handlePasswordSetup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="setup-password">New Password</Label>
          <div className="relative">
            <Input
              id="setup-password"
              type={showSetupPassword ? "text" : "password"}
              placeholder="••••••••"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowSetupPassword(!showSetupPassword)}
            >
              {showSetupPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-confirm">Confirm Password</Label>
          <div className="relative">
            <Input
              id="setup-confirm"
              type={showSetupConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={setupConfirmPassword}
              onChange={(e) => setSetupConfirmPassword(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowSetupConfirmPassword(!showSetupConfirmPassword)}
            >
              {showSetupConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        {setupError && (
          <p className="text-sm text-destructive">{setupError}</p>
        )}
        <Button type="submit" className="w-full" disabled={setupLoading}>
          {setupLoading ? "Setting password..." : "Set Password & Continue"}
        </Button>
      </form>
    </CardContent>
  </Card>
) : (
  // Existing Card with Tabs
)}
```

---

## Complete Flow After Changes

```text
1. Owner invites member@email.com via Organization page
   ↓
2. invite-member edge function:
   a. Creates pending membership record
   b. Creates user with temp password (email auto-confirmed)
   c. Generates recovery link → triggers auth-email-hook
   ↓
3. Member receives email with "Reset your password" link
   (auth-email-hook formats this as branded email)
   ↓
4. Member clicks link → lands on /auth with #type=recovery in URL
   ↓
5. Auth page detects recovery type → shows "Set Your Password" form
   ↓
6. Member enters password → supabase.auth.updateUser({ password })
   ↓
7. Navigation to "/" triggers AuthContext:
   a. Detects user.user_metadata.invited_to_organization
   b. Calls activate-invited-member edge function
   c. Membership activated, metadata cleared
   ↓
8. User redirected to /member dashboard ✅
   ↓
9. Future logins: Member uses email + password normally ✅
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Link expires before password set | User can request new "Forgot Password" link |
| User logs out after setting password | Normal email/password login works |
| Email already exists in system | createUser will fail, proper error returned |
| User tries to visit /auth normally | Shows regular sign in/up tabs |

---

## Files Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `supabase/functions/invite-member/index.ts` | ~30 lines | Replace inviteUserByEmail with createUser + generateLink |
| `src/pages/Auth.tsx` | ~80 lines | Add recovery detection and password setup form |

