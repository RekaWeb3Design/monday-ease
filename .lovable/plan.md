

# Fix Monday OAuth: Change Popup to Direct Redirect

## Problem

The Monday OAuth popup window returns a 400 error, but the same authorization URL works correctly when opened in a regular browser tab. This is a known issue with some OAuth providers that block or restrict popup windows.

## Solution

Change from popup-based OAuth to direct page redirect. The user will be redirected to Monday's authorization page in the same tab, then returned to the app after authorizing.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useMondayOAuth.ts` | Replace `window.open()` with `window.location.href` |

---

## Implementation Details

### Update useMondayOAuth.ts

The hook currently:
- Uses `window.open()` to create a popup (lines 71-75)
- Has a message listener for popup communication (lines 15-42)
- Maintains popup state with `popupRef` (line 13)

After the fix:
- Use `window.location.href` for direct redirect
- Remove popup-related code (popupRef, message listener)
- Simplify the hook since callback handling is already in Integrations page

### Changes

**Remove:**
- `popupRef` ref (line 13)
- `useEffect` with message listener (lines 15-42)
- Popup window sizing/positioning code (lines 66-75)

**Replace with:**
```typescript
// Direct redirect instead of popup
window.location.href = authUrl;
```

### Simplified Hook

```typescript
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const MONDAY_CLIENT_ID = '6f701c9989acf31a7af8a9c497016ce6';
const MONDAY_OAUTH_URL = 'https://auth.monday.com/oauth2/authorize';
const REDIRECT_URI = 'https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/monday-oauth-callback';

export function useMondayOAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const connectMonday = () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to connect Monday.com",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    const params = new URLSearchParams({
      client_id: MONDAY_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: user.id,
      scope: 'me:read boards:read boards:write',
    });

    const authUrl = `${MONDAY_OAUTH_URL}?${params.toString()}`;

    // Direct redirect instead of popup
    window.location.href = authUrl;
  };

  return { connectMonday, isConnecting };
}
```

---

## Flow Comparison

### Before (Popup)

```text
User clicks Connect
       ↓
Popup opens → Monday auth page
       ↓
User authorizes
       ↓
Popup redirects to /oauth-callback
       ↓
Callback sends postMessage to parent
       ↓
Parent window shows toast, reloads
```

### After (Direct Redirect)

```text
User clicks Connect
       ↓
Same tab redirects → Monday auth page
       ↓
User authorizes
       ↓
Redirects to edge function
       ↓
Edge function redirects to /oauth-callback
       ↓
/oauth-callback redirects to /integrations?success=true
       ↓
Integrations page shows toast (existing code, lines 42-63)
```

---

## No Changes Needed

| Component | Reason |
|-----------|--------|
| `src/pages/OAuthCallback.tsx` | Already has fallback redirect logic (lines 18-21) |
| `src/pages/Integrations.tsx` | Already handles URL params for success/error (lines 42-63) |
| Edge function | Returns redirect URL that works with both flows |
| Scope parameter | Already correct: `'me:read boards:read boards:write'` |
| Redirect URI | Already correct |

---

## Technical Notes

- The `isConnecting` state becomes less useful since the page navigates away, but keeping it ensures the button shows loading state briefly before redirect
- The OAuthCallback page's fallback logic (line 18-21) handles the case when there's no opener window, which is exactly what happens with direct redirect
- Integrations page already has the `useEffect` to read success/error from URL params and show toasts

