import { useEffect } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useIntegration } from "@/hooks/useIntegration";
import { useMondayOAuth } from "@/hooks/useMondayOAuth";
import { useDisconnectIntegration } from "@/hooks/useDisconnectIntegration";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import mondayLogo from "@/assets/monday-logo.png";

function SlackIcon({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-muted ${className}`} />
  );
}

function NotionIcon({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-muted ${className}`} />
  );
}

export default function Integrations() {
  const { integration, isLoading, isConnected, refetch } = useIntegration();
  const { connectMonday, isConnecting } = useMondayOAuth();
  const { disconnect, isDisconnecting } = useDisconnectIntegration();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleDisconnect = async () => {
    const success = await disconnect('monday');
    if (success) {
      refetch();
    }
  };

  // Handle OAuth callback results from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast({
        title: "Success!",
        description: "Monday.com connected successfully",
      });
      setSearchParams({});
      refetch();
    }

    if (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect Monday.com: ${error.replace(/_/g, ' ')}`,
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetch]);

  const formattedDate = integration?.connected_at
    ? format(new Date(integration.connected_at), "MMM d, yyyy")
    : null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your tools to unlock automation features
        </p>
      </div>

      {/* Main Integration: Monday.com */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Connected Services</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-12 w-12" />
                <Skeleton className="h-6 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : isConnected ? (
          // Connected state - single card
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <img src={mondayLogo} alt="Monday.com" className="h-12 w-12 shrink-0 object-contain" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Monday.com</CardTitle>
                    <Badge className="bg-primary text-primary-foreground">
                      Connected
                    </Badge>
                  </div>
                  <CardDescription>
                    Connect your Monday.com account to sync boards and automate workflows
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integration?.workspace_name && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Workspace:</span> {integration.workspace_name}
                    </p>
                  )}
                  {formattedDate && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Connected:</span> {formattedDate}
                    </p>
                  )}
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Not connected - 2-step flow
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Install App */}
            <Card>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <img src={mondayLogo} alt="Monday.com" className="h-12 w-12 shrink-0 object-contain" />
                <div className="flex-1 space-y-1">
                  <CardTitle className="text-base">Step 1: Install MondayEase App</CardTitle>
                  <CardDescription>
                    First, install the MondayEase app on your Monday.com workspace. This allows us to securely access your boards.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full border-[#0073EA] text-[#0073EA] hover:bg-[#0073EA]/10"
                  onClick={() => window.open('https://auth.monday.com/oauth2/authorize?client_id=6f701c9989acf31a7af8a9c497016ce6&response_type=install', '_blank', 'noopener,noreferrer')}
                >
                  Install on Monday.com
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already installed?{' '}
                  <button 
                    type="button"
                    className="text-primary hover:underline cursor-pointer font-medium"
                    onClick={() => document.getElementById('step-2-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  >
                    Skip to Step 2
                  </button>
                </p>
              </CardContent>
            </Card>

            {/* Step 2: Connect Account */}
            <Card id="step-2-card">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <img src={mondayLogo} alt="Monday.com" className="h-12 w-12 shrink-0 object-contain" />
                <div className="flex-1 space-y-1">
                  <CardTitle className="text-base">Step 2: Connect Your Account</CardTitle>
                  <CardDescription>
                    After installing, authorize MondayEase to access your boards.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={connectMonday}
                  disabled={isConnecting}
                  className="w-full bg-[#0073EA] hover:bg-[#0060c2] text-white"
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Future Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-muted-foreground mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Slack */}
          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <SlackIcon className="h-12 w-12 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Slack</CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <CardDescription>
                  Get notifications and updates in your Slack channels
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          {/* Notion */}
          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <NotionIcon className="h-12 w-12 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Notion</CardTitle>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <CardDescription>
                  Sync documentation and notes with Notion
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
