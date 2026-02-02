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
      scopes: 'me:read boards:read boards:write',
    });

    const authUrl = `${MONDAY_OAUTH_URL}?${params.toString()}`;

    // Direct redirect instead of popup
    window.location.href = authUrl;
  };

  return { connectMonday, isConnecting };
}
