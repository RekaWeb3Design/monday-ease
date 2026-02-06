
# Fix Plan: Password Reset Blank Page and Add Board Dialog Stability

## Issues Identified

### Issue 1: Password Reset Link Shows Blank Page
When users click the password reset link from their email, they land on `/auth#` and see a completely blank page instead of the password reset form.

**Root Cause:** 
- The Auth page renders `null` during the loading state (line 330-332)
- When users arrive via the password recovery link, Supabase automatically exchanges the token in the URL hash for a session
- During this exchange, the AuthContext is in a loading state, so the page shows nothing
- The current detection logic only checks for `type=recovery` in the hash, but after Supabase processes the token, the hash format changes

**Solution:**
- Check for password recovery scenario in multiple ways:
  1. Check the URL hash for `type=recovery` (current method)
  2. Also check if the URL hash contains recovery-related fragments like `access_token` with `type=recovery`
  3. Show a loading spinner instead of a blank page while auth is processing
- Add better handling for the PKCE flow where Supabase clears the hash after processing

### Issue 2: Add Board Modal Closes on Tab Switch
The AddBoardDialog closes unexpectedly when users switch to another browser tab and return.

**Root Cause:**
- The `useOrganizationMembers` hook uses plain `useState/useEffect` instead of React Query
- When `organization` reference changes (from AuthContext re-renders), `fetchMembers` is called again
- The recent AuthContext changes added `user?.id` to dependencies which can trigger cascading updates
- When switching tabs, browser visibility changes combined with state updates cause the dialog parent to re-render

**Solution:**
- Convert `useOrganizationMembers` to use React Query with `refetchOnWindowFocus: false`
- Use memoized dependency checks to prevent unnecessary re-fetches
- Ensure stable organization ID reference rather than the full organization object

---

## Technical Implementation

### Part 1: Fix Password Reset Blank Page

**File: `src/pages/Auth.tsx`**

1. Add a dedicated loading state for recovery mode detection:
```typescript
const [isRecoveryMode, setIsRecoveryMode] = useState(false);
const [checkingRecovery, setCheckingRecovery] = useState(true);
```

2. Enhance the recovery detection useEffect to handle multiple scenarios:
```typescript
useEffect(() => {
  const detectRecoveryMode = async () => {
    const hash = window.location.hash;
    
    // Check for recovery type in hash
    if (hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
      setShowPasswordSetup(true);
    }
    
    // Also check for recovery after token exchange
    // (user might already have a session from the recovery flow)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Check if this is a recovery session by looking at the aal claim
      // or by checking if we just came from a recovery link
      const urlHadRecovery = sessionStorage.getItem('recovery_flow');
      if (urlHadRecovery) {
        setShowPasswordSetup(true);
        sessionStorage.removeItem('recovery_flow');
      }
    }
    
    setCheckingRecovery(false);
  };
  
  // Store recovery intent before Supabase clears the hash
  if (window.location.hash.includes('type=recovery')) {
    sessionStorage.setItem('recovery_flow', 'true');
  }
  
  detectRecoveryMode();
}, []);
```

3. Update the render logic to show a proper loading state instead of blank:
```typescript
if (loading || checkingRecovery) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

### Part 2: Fix Add Board Dialog Closing on Tab Switch

**File: `src/hooks/useOrganizationMembers.ts`**

Convert from `useState/useEffect` pattern to React Query:

```typescript
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationMember, MemberRole } from "@/types";

export function useOrganizationMembers(): UseOrganizationMembersReturn {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use organization ID directly (stable primitive)
  const orgId = organization?.id;

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!orgId) return [];

      const { data, error: fetchError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgId)
        .order("role", { ascending: true })
        .order("display_name", { ascending: true });

      if (fetchError) throw fetchError;

      return (data || []).map((member) => ({
        ...member,
        role: member.role as MemberRole,
        status: member.status as "active" | "pending" | "disabled",
      }));
    },
    enabled: !!orgId,
    // CRITICAL: Prevent refetch on window focus
    refetchOnWindowFocus: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // ... rest of mutation functions
}
```

### Part 3: Stabilize AuthContext Dependencies

**File: `src/contexts/AuthContext.tsx`**

The recent change added `user?.id` to the auth listener useEffect dependency array, which causes it to re-subscribe on every user change. This is problematic:

```typescript
// Current (problematic):
}, [user?.id]);

// Fixed:
}, []); // Auth listener should only run once on mount
```

The auth listener doesn't need `user?.id` as a dependency because it receives the new user in the callback. Adding it causes duplicate subscriptions and potential race conditions.

---

## Files to Modify

1. **`src/pages/Auth.tsx`**
   - Add recovery flow detection with sessionStorage
   - Show loading spinner instead of blank page
   - Handle edge cases where hash is consumed before React mounts

2. **`src/hooks/useOrganizationMembers.ts`**
   - Convert to React Query with `refetchOnWindowFocus: false`
   - Use stable `orgId` primitive instead of full organization object

3. **`src/contexts/AuthContext.tsx`**
   - Remove `user?.id` from auth listener dependency array
   - Keep the `initialDataLoaded` logic for token refresh handling

---

## Expected Outcome

After implementing these changes:
- Password reset links will show a loading spinner briefly, then the password reset form
- The Add Board dialog will remain open when switching browser tabs
- Auth state changes from token refreshes won't cause unnecessary re-renders
