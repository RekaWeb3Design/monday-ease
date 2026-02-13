import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2, RefreshCw, Unplug } from "lucide-react";
import { useIntegration } from "@/hooks/useIntegration";
import { useMondayOAuth } from "@/hooks/useMondayOAuth";
import { useDisconnectIntegration } from "@/hooks/useDisconnectIntegration";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import mondayLogo from "@/assets/monday-logo.png";
import type { UserIntegration } from "@/types";

function getDisplayName(integration: UserIntegration): string {
  return integration.account_name || integration.workspace_name || integration.monday_account_id;
}

export default function Integrations() {
  const { integrations, isLoading, refetch } = useIntegration();
  const { connectMonday, isConnecting } = useMondayOAuth();
  const { disconnectById, deleteIntegration, isDisconnecting } = useDisconnectIntegration();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Dialog state
  const [disconnectTarget, setDisconnectTarget] = useState<UserIntegration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserIntegration | null>(null);

  // Handle OAuth callback results from URL params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast({
        title: "Success!",
        description: "Monday.com account connected successfully",
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

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    const success = await disconnectById(disconnectTarget.id);
    setDisconnectTarget(null);
    if (success) {
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteIntegration(deleteTarget.id);
    setDeleteTarget(null);
    if (success) {
      refetch();
    }
  };

  const hasConnections = integrations.length > 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your tools to unlock automation features
        </p>
      </div>

      {/* Monday.com Connections */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={mondayLogo} alt="Monday.com" className="h-8 w-8 shrink-0 object-contain" />
            <h2 className="text-lg font-semibold text-foreground">Monday.com Connections</h2>
          </div>
          {hasConnections && (
            <Button
              onClick={connectMonday}
              disabled={isConnecting}
              size="sm"
              className="bg-[#0073EA] hover:bg-[#0060c2] text-white"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Connection
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card className="max-w-2xl">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ) : !hasConnections ? (
          /* Empty State */
          <Card className="max-w-2xl">
            <CardContent className="p-8 text-center space-y-4">
              <img src={mondayLogo} alt="Monday.com" className="h-16 w-16 mx-auto object-contain opacity-50" />
              <div>
                <p className="text-foreground font-medium">No Monday.com accounts connected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your first account to start configuring boards.
                </p>
              </div>
              <Button
                onClick={connectMonday}
                disabled={isConnecting}
                className="bg-[#0073EA] hover:bg-[#0060c2] text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Monday.com Account'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Connection List */
          <div className="space-y-3 max-w-2xl">
            {integrations.map((integration) => {
              const isConnected = integration.status === "connected";
              const displayName = getDisplayName(integration);
              const dateLabel = isConnected ? "Connected" : "Disconnected";
              const dateValue = integration.connected_at
                ? format(new Date(integration.connected_at), "MMM d, yyyy")
                : null;

              return (
                <Card key={integration.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Status + Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                            isConnected ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Account ID: {integration.monday_account_id}
                          </p>
                          {dateValue && (
                            <p className="text-xs text-muted-foreground">
                              {dateLabel}: {dateValue}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDisconnectTarget(integration)}
                            disabled={isDisconnecting}
                          >
                            <Unplug className="mr-1.5 h-3.5 w-3.5" />
                            Disconnect
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={connectMonday}
                              disabled={isConnecting}
                            >
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              Reconnect
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              onClick={() => setDeleteTarget(integration)}
                              disabled={isDisconnecting}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Future Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-muted-foreground mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
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

          <Card className="opacity-60">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
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

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={!!disconnectTarget}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget ? getDisplayName(disconnectTarget) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this Monday.com account?
              Board configurations will be preserved but data won't sync until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget ? getDisplayName(deleteTarget) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this connection. Board configurations linked to this
              account will be preserved but will appear as disconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
