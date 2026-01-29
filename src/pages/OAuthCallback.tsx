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
