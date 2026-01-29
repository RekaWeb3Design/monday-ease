

## Add Monday.com OAuth Functionality (Frontend Only)

### Overview
Implement the frontend OAuth flow for connecting Monday.com accounts. The Edge Function `monday-oauth-callback` already exists and is deployed, so we only need to create the frontend components.

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useMondayOAuth.ts` | **Create** | Hook to handle OAuth popup flow |
| `src/pages/Integrations.tsx` | **Modify** | Add OAuth functionality to Connect button |
| `src/hooks/useIntegration.ts` | No changes | Already exports `refetch` (line 64) |

---

### Implementation Details

**1. Create OAuth Hook: `src/hooks/useMondayOAuth.ts`**

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
      scopes: 'boards:read boards:write',
    });

    const authUrl = `${MONDAY_OAUTH_URL}?${params.toString()}`;

    // Open popup window centered on screen
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'monday-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    // Poll for popup close
    const pollTimer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollTimer);
        setIsConnecting(false);
        window.location.reload();
      }
    }, 500);
  };

  return { connectMonday, isConnecting };
}
```

**2. Update Integrations Page: `src/pages/Integrations.tsx`**

Changes needed:
- Add imports: `useMondayOAuth`, `useEffect`, `useSearchParams`, `Loader2`, `useToast`
- Use `useMondayOAuth` hook for OAuth flow
- Use `useSearchParams` to read success/error from URL after callback
- Add `useEffect` to handle OAuth callback results with toasts
- Replace disabled "Connect Monday.com" button with functional button
- Show loading spinner when `isConnecting` is true

Key changes to the Connect button section (lines 91-99):

**Before:**
```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <Button className="w-full" disabled>
      Connect Monday.com
    </Button>
  </TooltipTrigger>
  <TooltipContent>Coming soon</TooltipContent>
</Tooltip>
```

**After:**
```typescript
<Button
  onClick={connectMonday}
  disabled={isConnecting}
  className="w-full bg-[#0073EA] hover:bg-[#0060c2]"
>
  {isConnecting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Connecting...
    </>
  ) : (
    'Connect Monday.com'
  )}
</Button>
```

---

### OAuth Flow Summary

```text
1. User clicks "Connect Monday.com"
2. useMondayOAuth opens popup → Monday.com OAuth page
3. User authorizes the app
4. Monday.com redirects to Edge Function with code
5. Edge Function exchanges code for token, saves to DB
6. Edge Function redirects popup to /integrations?success=true
7. Popup closes, page reloads
8. useEffect detects ?success=true, shows toast
9. useIntegration refetches, shows "Connected" status
```

---

### Notes

- The `useIntegration` hook already exports `refetch` - no changes needed
- Edge Function is already deployed at the specified URL
- User ID is passed as `state` parameter for security
- Monday.com brand color `#0073EA` used for the Connect button

