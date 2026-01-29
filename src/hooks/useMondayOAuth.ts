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
