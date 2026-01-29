

## Fix OAuth Popup Behavior (Frontend Only)

### Overview
Update the frontend to properly handle the OAuth popup flow using `postMessage` communication instead of polling, enabling automatic popup closure after authorization.

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/OAuthCallback.tsx` | Create | Minimal page to close popup and notify parent |
| `src/App.tsx` | Update | Add route for `/oauth-callback` |
| `src/hooks/useMondayOAuth.ts` | Update | Replace polling with `postMessage` listener |

---

### Implementation Details

#### 1. Create `src/pages/OAuthCallback.tsx`

```tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        { type: 'oauth-callback', success: success === 'true', error },
        window.location.origin
      );
      window.close();
    } else {
      // Fallback: redirect to integrations if opened directly
      window.location.href = `/integrations?success=${success}&error=${error || ''}`;
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Completing authorization...</p>
    </div>
  );
};

export default OAuthCallback;
```

#### 2. Update `src/App.tsx`

Add import and route for the OAuthCallback page:

```tsx
import OAuthCallback from "./pages/OAuthCallback";

// Add before the catch-all route:
<Route path="/oauth-callback" element={<OAuthCallback />} />
```

#### 3. Update `src/hooks/useMondayOAuth.ts`

Replace the `setInterval` polling with `postMessage` listener:

- Add `useEffect` hook with `window.addEventListener('message', handler)`
- Handle `oauth-callback` message type
- On success: show success toast, reset connecting state
- On error: show error toast, reset connecting state
- Clean up listener and close popup reference on unmount
- Remove the polling logic entirely

```tsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const MONDAY_CLIENT_ID = '6f701c9989acf31a7af8a9c497016ce6';
const MONDAY_OAUTH_URL = 'https://auth.monday.com/oauth2/authorize';
const REDIRECT_URI = 'https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/monday-oauth-callback';

export function useMondayOAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'oauth-callback') {
        setIsConnecting(false);
        popupRef.current = null;
        
        if (event.data.success) {
          toast({
            title: "Success",
            description: "Monday.com connected successfully!",
          });
          window.location.reload(); // Refresh to update integration status
        } else {
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect Monday.com",
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

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

    // Open popup window centered on screen
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    popupRef.current = window.open(
      authUrl,
      'monday-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );
  };

  return { connectMonday, isConnecting };
}
```

---

### Flow Summary

1. User clicks "Connect Monday.com"
2. Popup opens to Monday.com OAuth
3. User authorizes → redirects to Edge Function
4. Edge Function exchanges code → redirects to `/oauth-callback?success=true`
5. OAuthCallback page sends `postMessage` to parent and closes
6. Parent window receives message, shows toast, refreshes to update status

