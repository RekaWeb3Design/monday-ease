

# Fix: Invited Members See "Create Organization" Instead of Password Setup

## Problem Summary

When invited users click "Accept Invitation" from their email, they land on `/onboarding` and see "Create Your Organization" instead of being activated as members. The `activate-invited-member` edge function is never called.

**Root cause:** The `RequireOrganization` guard checks for `registration_type === "member"` but invited members have `invited_to_organization` in their metadata instead.

---

## Solution Overview

1. **AuthContext**: After user data loads, detect `invited_to_organization` metadata and call the edge function to activate membership
2. **RequireOrganization**: Add check for `invited_to_organization` metadata to prevent premature redirect to onboarding
3. **Onboarding page**: Add safeguard to redirect invited users away from this page

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/AuthContext.tsx` | UPDATE | Add invited member detection and activation logic |
| `src/components/auth/RequireOrganization.tsx` | UPDATE | Add check for `invited_to_organization` metadata |
| `src/pages/Onboarding.tsx` | UPDATE | Add redirect for invited users |

---

## 1. AuthContext.tsx Changes

Add a function to check and activate invited members after user data loads:

```typescript
// NEW: State to track activation in progress
const [activatingMembership, setActivatingMembership] = useState(false);

// NEW: Function to activate invited member
const activateInvitedMember = useCallback(async (currentUser: User) => {
  const invitedOrgId = currentUser.user_metadata?.invited_to_organization;
  
  if (!invitedOrgId) {
    return false; // Not an invited member
  }
  
  console.log("Detected invited member, activating membership...");
  setActivatingMembership(true);
  
  try {
    const { data, error } = await supabase.functions.invoke('activate-invited-member');
    
    if (error) {
      console.error("Error activating membership:", error);
      return false;
    }
    
    if (data?.success) {
      console.log("Membership activated, refreshing organization data...");
      // Refresh organization data to pick up the new membership
      await fetchOrganization(currentUser.id);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("Failed to activate invited member:", err);
    return false;
  } finally {
    setActivatingMembership(false);
  }
}, [fetchOrganization]);
```

Update Effect 2 to call activation:

```typescript
// Effect 2: Once auth is initialized, load profile + org data for the user.
useEffect(() => {
  if (!authInitialized) return;

  if (!user) {
    setLoading(false);
    return;
  }

  let cancelled = false;
  setLoading(true);

  (async () => {
    try {
      const userProfile = await fetchProfile(user.id);
      if (cancelled) return;
      setProfile(userProfile);
      
      await fetchOrganization(user.id);
      
      // NEW: If user has no org but has invitation metadata, activate them
      // We need to check AFTER fetchOrganization to see if they already have one
      if (!cancelled) {
        const invitedOrgId = user.user_metadata?.invited_to_organization;
        // Only activate if they have the metadata (meaning activation hasn't happened yet)
        if (invitedOrgId) {
          await activateInvitedMember(user);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, [authInitialized, user, fetchProfile, fetchOrganization, activateInvitedMember]);
```

Include `activatingMembership` in the loading state exposed to components:

```typescript
// Update the loading value to include activation state
value={{
  // ... existing values
  loading: loading || activatingMembership,
}}
```

---

## 2. RequireOrganization.tsx Changes

Add detection for `invited_to_organization` metadata to show loading state while activation happens:

```typescript
export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { user, organization, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has an organization, render children
  if (organization) {
    return <>{children}</>;
  }

  // NEW: Check if user is an invited member (has invitation metadata)
  // If so, AuthContext should be activating them - show loading
  const invitedOrgId = user?.user_metadata?.invited_to_organization;
  if (invitedOrgId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Activating your membership...</p>
        </div>
      </div>
    );
  }

  // Check if user registered as a member - they shouldn't go to onboarding
  const registrationType = user?.user_metadata?.registration_type;
  
  if (registrationType === "member") {
    return <Navigate to="/auth" replace />;
  }
  
  // Owner registration - send to onboarding to create org
  return <Navigate to="/onboarding" replace />;
}
```

---

## 3. Onboarding.tsx Changes

Add a safeguard to redirect invited users away from this page:

```typescript
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, organization, createOrganization, loading: authLoading } = useAuth();

  // ... existing state ...

  // Redirect to dashboard if user already has an organization
  useEffect(() => {
    if (!authLoading && organization) {
      navigate("/", { replace: true });
    }
  }, [organization, authLoading, navigate]);

  // NEW: Redirect invited members to member dashboard
  // They should never see the "Create Organization" page
  useEffect(() => {
    if (!authLoading && user) {
      const invitedOrgId = user.user_metadata?.invited_to_organization;
      if (invitedOrgId) {
        // This user is an invited member - redirect to member dashboard
        // The activation should happen via AuthContext
        navigate("/member", { replace: true });
      }
    }
  }, [authLoading, user, navigate]);

  // ... rest of component ...
}
```

---

## Flow After Fix

```text
1. Invited user clicks "Accept Invitation" in email
   ↓
2. User lands on /auth page (Supabase magic link flow)
   ↓
3. User sets their password (new account created)
   ↓
4. Auth state changes → AuthContext loads user data
   ↓
5. AuthContext detects user.user_metadata.invited_to_organization
   ↓
6. AuthContext calls activate-invited-member edge function
   ↓
7. Edge function activates membership, clears metadata
   ↓
8. AuthContext refreshes organization data
   ↓
9. User now has organization → redirected to /member dashboard
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Invited user visits `/onboarding` directly | Redirected to `/member` |
| Activation fails | User stays on loading, error logged |
| User already activated (no metadata) | Normal flow, no activation called |
| Owner signs up | Normal onboarding flow unchanged |

---

## Files Changed

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/contexts/AuthContext.tsx` | ~30 lines | Add activation logic and state |
| `src/components/auth/RequireOrganization.tsx` | ~15 lines | Add invitation metadata check |
| `src/pages/Onboarding.tsx` | ~10 lines | Add redirect for invited users |

