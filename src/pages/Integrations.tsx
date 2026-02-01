import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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

function StepBadge({ step, disabled }: { step: number; disabled?: boolean }) {
  return (
    <div className={`
      flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold shrink-0
      ${disabled 
        ? 'bg-muted text-muted-foreground' 
        : 'bg-[#0073EA] text-white'}
    `}>
      {step}
    </div>
  );
}

export default function Integrations() {
  const { integration, isLoading, isConnected, refetch } = useIntegration();
  const { connectMonday, isConnecting } = useMondayOAuth();
  const { disconnect, isDisconnecting } = useDisconnectIntegration();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [installComplete, setInstallComplete] = useState(false);

  const handleDisconnect = async () => {
    const success = await disconnect('monday');
    if (success) {
      refetch();
    }
  };

  const handleSwitchAccount = async () => {
    const success = await disconnect('monday');
    if (success) {
      setInstallComplete(false);
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
          <Card className="max-w-2xl">
            <CardHeader>
              <Skeleton className="h-12 w-12" />
              <Skeleton className="h-6 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ) : isConnected ? (
          // Connected state - single card with switch account option
          <Card className="max-w-2xl">
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
                  Your workspace is connected to MondayEase
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <Separator />
              
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors w-full text-center"
                onClick={handleSwitchAccount}
                disabled={isDisconnecting}
              >
                Connect a different Monday.com account
              </button>
            </CardContent>
          </Card>
        ) : (
          // Not connected - guided step-by-step flow in single card
          <Card className="max-w-2xl">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <img src={mondayLogo} alt="Monday.com" className="h-12 w-12 shrink-0 object-contain" />
              <div className="flex-1 space-y-1">
                <CardTitle>Monday.com Integration</CardTitle>
                <CardDescription>
                  Connect your Monday.com workspace to MondayEase
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <StepBadge step={1} />
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold">Step 1: Install MondayEase App</h3>
                    <p className="text-sm text-muted-foreground">
                      Install the MondayEase app on your Monday.com workspace to allow secure access to your boards.
                    </p>
                    <Button
                      variant="outline"
                      className="border-[#0073EA] text-[#0073EA] hover:bg-[#0073EA]/10"
                      onClick={() => window.open('https://auth.monday.com/oauth2/authorize?client_id=6f701c9989acf31a7af8a9c497016ce6&response_type=install', '_blank', 'noopener,noreferrer')}
                    >
                      Install on Monday.com
                    </Button>
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox 
                        id="install-complete" 
                        checked={installComplete}
                        onCheckedChange={(checked) => setInstallComplete(checked === true)}
                      />
                      <label 
                        htmlFor="install-complete" 
                        className="text-sm cursor-pointer select-none"
                      >
                        I have completed the installation
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 2 */}
              <div className={`space-y-4 transition-all duration-300 ${!installComplete ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <StepBadge step={2} disabled={!installComplete} />
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold">Step 2: Connect Your Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Authorize MondayEase to access your Monday.com boards.
                    </p>
                    <Button
                      onClick={connectMonday}
                      disabled={!installComplete || isConnecting}
                      className="bg-[#0073EA] hover:bg-[#0060c2] text-white disabled:opacity-50"
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
