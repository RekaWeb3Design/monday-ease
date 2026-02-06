
# Fix Plan: Password Reset Form Not Appearing After Clicking Email Link

## Problem Summary

When users click the password reset link from their email, the page shows an infinite loading spinner instead of the password reset form. The URL shows `/auth#` (empty hash) after loading.

## Root Cause Analysis

The issue is a **race condition** between Supabase's URL token processing and React's component mounting:

1. **Supabase processes the URL before React renders**: When the page loads, Supabase's JS client immediately detects the recovery token in the URL hash and exchanges it for a session. **Critically, it clears the URL hash after processing.**

2. **The detection logic runs too late**: By the time React's `useEffect` in `Auth.tsx` runs, the URL hash has already been cleared by Supabase. The current code checks for `type=recovery` in the hash, but it's already gone.

3. **The sessionStorage fallback is in the wrong place**: The code tries to save `recovery_flow` to sessionStorage *inside* the same `useEffect` that checks for it. But this only happens if the hash contains `type=recovery`, which it doesn't (Supabase already cleared it).

4. **Immediate redirect occurs**: Since `showPasswordSetup` stays `false`, and the user now has a valid session, the redirect logic (`if (!loading && user && !showPasswordSetup) navigate("/")`) kicks in, but the home page's data loading keeps spinning.

## Solution

Move the recovery detection to the **earliest possible point** - before React renders, and before Supabase clears the hash. This requires:

1. **Capture the recovery intent immediately on page load** - before any React effects or Supabase processing
2. **Store it in sessionStorage synchronously** - outside of React's effect lifecycle
3. **Check sessionStorage in the Auth component** - as the primary source of truth

## Implementation Details

### File 1: `src/pages/Auth.tsx`

**Changes:**

1. **Add synchronous detection at module level** (runs when the file is first imported, before component renders):

```typescript
// At the top of the file, outside the component:
// Capture recovery intent IMMEDIATELY before Supabase clears the hash
// This runs synchronously when the module loads
const initialHash = window.location.hash;
if (initialHash.includes('type=recovery')) {
  sessionStorage.setItem('recovery_flow', 'true');
}
```

2. **Simplify the useEffect to just read from sessionStorage**:

```typescript
useEffect(() => {
  const detectRecoveryMode = () => {
    // Check sessionStorage for recovery intent (set by module-level code)
    const savedRecoveryIntent = sessionStorage.getItem('recovery_flow');
    if (savedRecoveryIntent) {
      setShowPasswordSetup(true);
      sessionStorage.removeItem('recovery_flow');
    }
    setCheckingRecovery(false);
  };
  
  detectRecoveryMode();
}, []);
```

3. **Add listener for Supabase PASSWORD_RECOVERY event** as backup:

The Supabase `onAuthStateChange` fires a `PASSWORD_RECOVERY` event specifically for this case. We should also listen for this:

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setShowPasswordSetup(true);
      setCheckingRecovery(false);
    }
  });
  
  return () => subscription.unsubscribe();
}, []);
```

4. **Prevent redirect when in recovery mode**: The redirect effect already has `!showPasswordSetup` condition, but we need to ensure `checkingRecovery` also blocks it:

```typescript
useEffect(() => {
  if (!loading && !checkingRecovery && user && !showPasswordSetup) {
    navigate("/", { replace: true });
  }
}, [user, loading, navigate, showPasswordSetup, checkingRecovery]);
```

### Complete Code Changes

**src/pages/Auth.tsx (lines 1-30 area):**

Add after imports, before component:
```typescript
// CRITICAL: Capture recovery intent IMMEDIATELY before Supabase clears the hash
// This code runs synchronously when the module is first imported
const initialHash = typeof window !== 'undefined' ? window.location.hash : '';
if (initialHash.includes('type=recovery')) {
  sessionStorage.setItem('recovery_flow', 'true');
}
```

**src/pages/Auth.tsx (lines 85-110 area):**

Replace the recovery detection useEffect:
```typescript
// Listen for Supabase PASSWORD_RECOVERY event
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      console.log('PASSWORD_RECOVERY event detected');
      setShowPasswordSetup(true);
      setCheckingRecovery(false);
    }
  });
  
  return () => subscription.unsubscribe();
}, []);

// Check sessionStorage for recovery intent (set by module-level code or previous page load)
useEffect(() => {
  const detectRecoveryMode = () => {
    const savedRecoveryIntent = sessionStorage.getItem('recovery_flow');
    if (savedRecoveryIntent) {
      console.log('Recovery flow detected from sessionStorage');
      setShowPasswordSetup(true);
      sessionStorage.removeItem('recovery_flow');
    }
    setCheckingRecovery(false);
  };
  
  // Small delay to ensure Supabase has processed the token
  // but the PASSWORD_RECOVERY event listener above is the primary method
  const timer = setTimeout(detectRecoveryMode, 100);
  return () => clearTimeout(timer);
}, []);
```

**src/pages/Auth.tsx (lines 137-142 area):**

Update redirect effect to also check `checkingRecovery`:
```typescript
useEffect(() => {
  if (!loading && !checkingRecovery && user && !showPasswordSetup) {
    navigate("/", { replace: true });
  }
}, [user, loading, navigate, showPasswordSetup, checkingRecovery]);
```

## Technical Summary

| Component | Change |
|-----------|--------|
| Module-level code | Synchronously capture `type=recovery` from URL hash before React renders |
| PASSWORD_RECOVERY listener | Add Supabase auth event listener for the `PASSWORD_RECOVERY` event |
| Recovery detection effect | Read from sessionStorage, remove dependency on URL hash |
| Redirect effect | Block redirect while `checkingRecovery` is true |

## Expected Outcome

After implementing these changes:
- The password reset link will be captured before Supabase clears the URL hash
- The `PASSWORD_RECOVERY` event from Supabase will trigger the password setup form
- Users will see the password reset form instead of an infinite loading spinner
- The loading spinner will only show briefly while checking for recovery mode
