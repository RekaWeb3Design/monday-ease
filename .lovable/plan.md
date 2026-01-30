
# Fix: Invited Members See "Create Organization" Instead of Member Dashboard

## Problem Summary

When an invited member clicks the email link and lands on `/auth`, they are immediately redirected to `/` (then to `/onboarding`) because:

1. **Auth page auto-redirects**: Lines 52-56 in `Auth.tsx` redirect ANY logged-in user to `/` immediately
2. **No invite detection**: The page doesn't check if user came from an invitation
3. **No password-setting flow**: Invited users have no dedicated form to set their password
4. **No membership activation**: Nobody updates `organization_members.status` from `pending` to `active`

---

## Solution Overview

Modify the `/auth` page to detect invited users and show a dedicated "Set Your Password" flow that activates their membership before redirecting to the member dashboard.

---

## Implementation Steps

### Step 1: Add Invited User Detection State

Add state and effect to detect if the current user is an invited member:

```text
New state variables:
- isInvitedUser: boolean
- invitedOrganizationId: string | null
- isActivatingMembership: boolean
- activationError: string

Detection logic (in useEffect):
- Check user.user_metadata.invited_to_organization
- If present, set isInvitedUser = true
- Show "Set Your Password" form instead of normal tabs
```

### Step 2: Create "Set Your Password" Form

Add a new form component that appears for invited users:

```text
Form fields:
- New Password (with visibility toggle)
- Confirm Password (with visibility toggle)

Validation:
- Passwords must match
- Minimum 6 characters
```

### Step 3: Implement Password Update + Membership Activation

After password is set successfully:

```text
1. Call supabase.auth.updateUser({ password: newPassword })

2. Query organization_members to find the pending record:
   - Match by email (user.email)
   - AND organization_id = invited_to_organization (from metadata)
   - AND status = 'pending'

3. If found:
   - Update status to 'active'
   - Set joined_at to now()
   - Update user_id to current user's id
   - Redirect to /member

4. If not found:
   - Log error (this shouldn't happen)
   - Redirect to /onboarding as fallback
```

### Step 4: Modify Redirect Logic

Update the existing useEffect that redirects logged-in users:

```text
Current (problematic):
if (!loading && user) {
  navigate("/", { replace: true });
}

New logic:
if (!loading && user) {
  // Check if this is an invited user who needs to set password
  const invitedOrgId = user.user_metadata?.invited_to_organization;
  
  if (invitedOrgId) {
    // Don't redirect - show password setup form
    setIsInvitedUser(true);
    setInvitedOrganizationId(invitedOrgId);
    return;
  }
  
  // Normal user - redirect to dashboard
  navigate("/", { replace: true });
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Add invited user detection, password setup form, membership activation logic |

---

## UI Flow for Invited Users

```text
1. User clicks invite link in email
           ↓
2. Supabase verifies token, creates session
           ↓
3. Redirect to /auth with logged-in user
           ↓
4. Auth page detects invited_to_organization in user_metadata
           ↓
5. Shows "Set Your Password" card (not tabs)
   - Welcome message with their name
   - New password field
   - Confirm password field
   - "Complete Setup" button
           ↓
6. User sets password
           ↓
7. supabase.auth.updateUser({ password })
           ↓
8. Query organization_members by email + org_id + status='pending'
           ↓
9. Update record: status='active', joined_at=now(), user_id=user.id
           ↓
10. Redirect to /member dashboard
```

---

## Technical Details

### Detection Logic

```typescript
// In Auth.tsx useEffect
useEffect(() => {
  if (!loading && user) {
    const invitedOrgId = user.user_metadata?.invited_to_organization;
    
    if (invitedOrgId) {
      // This is an invited user - show password setup
      setIsInvitedUser(true);
      setInvitedOrganizationId(invitedOrgId);
    } else {
      // Normal authenticated user - go to dashboard
      navigate("/", { replace: true });
    }
  }
}, [user, loading, navigate]);
```

### Password Setup Handler

```typescript
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

  setIsActivatingMembership(true);
  
  try {
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (updateError) throw updateError;

    // Find and activate membership
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("email", user.email)
      .eq("organization_id", invitedOrganizationId)
      .eq("status", "pending")
      .single();

    if (memberError || !member) {
      console.error("No pending membership found:", memberError);
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

    if (activateError) throw activateError;

    // Clear the invited metadata (optional)
    await supabase.auth.updateUser({
      data: { invited_to_organization: null },
    });

    // Redirect to member dashboard
    navigate("/member", { replace: true });
    
  } catch (err) {
    setActivationError(err.message || "Failed to complete setup");
  } finally {
    setIsActivatingMembership(false);
  }
};
```

### UI Component for Invited Users

```typescript
// Render this instead of Tabs when isInvitedUser is true
{isInvitedUser ? (
  <Card>
    <CardHeader className="text-center">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <UserPlus className="h-6 w-6 text-primary" />
      </div>
      <CardTitle>Welcome to the Team!</CardTitle>
      <CardDescription>
        Set your password to complete your account setup
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={handleSetPassword} className="space-y-4">
        {/* Password fields */}
        <Button type="submit" className="w-full">
          {isActivatingMembership ? "Setting up..." : "Complete Setup"}
        </Button>
      </form>
    </CardContent>
  </Card>
) : (
  // Existing Tabs for sign in/sign up
)}
```

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| User already activated | They won't have `invited_to_organization` in metadata (cleared after activation) |
| Membership record not found | Fallback redirect to `/onboarding` with error logged |
| Password update fails | Show error message, allow retry |
| User refreshes page mid-flow | Detection re-runs, shows password form again |

---

## Testing Checklist

After implementation:
1. Invite a new member from Organization page
2. Check email arrives with correct invite link
3. Click link - should land on `/auth` with "Set Your Password" form
4. Set password - should redirect to `/member` dashboard
5. Verify `organization_members` record has `status: active` and `joined_at` set
6. Sign out and sign back in - should go to `/member` (not show password form again)
