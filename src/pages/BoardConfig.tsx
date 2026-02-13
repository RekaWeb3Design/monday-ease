import { useState, useMemo } from "react";
import { Plus, Loader2, AlertCircle, LayoutGrid, ChevronRight, ChevronDown, Info, Unplug } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useIntegration } from "@/hooks/useIntegration";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoardConfigCard } from "@/components/boards/BoardConfigCard";
import { InactiveBoardCard } from "@/components/boards/InactiveBoardCard";
import { AddBoardDialog } from "@/components/boards/AddBoardDialog";
import { EditBoardDialog } from "@/components/boards/EditBoardDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BoardConfigWithAccess, UserIntegration } from "@/types";

function integrationDisplayName(integration: UserIntegration): string {
  return integration.account_name || integration.workspace_name || integration.monday_account_id;
}

export default function BoardConfig() {
  const { memberRole } = useAuth();
  const { allConfigs, isLoading, deleteConfig, refetch } = useBoardConfigs();
  const { members } = useOrganizationMembers();
  const { integrations } = useIntegration();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BoardConfigWithAccess | null>(null);
  const [disconnectedExpanded, setDisconnectedExpanded] = useState(false);

  const connectedAccountIds = useMemo(() => {
    return new Set(
      integrations
        .filter(i => i.status === "connected")
        .map(i => i.monday_account_id)
    );
  }, [integrations]);

  const disconnectedAccountIds = useMemo(() => {
    return new Set(
      integrations
        .filter(i => i.status === "disconnected")
        .map(i => i.monday_account_id)
    );
  }, [integrations]);

  const { connectedGroups, inactiveBoards, groupedInactiveBoards } = useMemo(() => {
    const connected: BoardConfigWithAccess[] = [];
    const inactive: BoardConfigWithAccess[] = [];

    for (const config of allConfigs) {
      const accountId = config.monday_account_id;
      if (accountId && connectedAccountIds.has(accountId)) {
        connected.push(config);
      } else {
        inactive.push(config);
      }
    }

    // Group connected boards by account, preserving integration order
    const groups: { integration: UserIntegration; configs: BoardConfigWithAccess[] }[] = [];
    const connectedIntegrations = integrations.filter(i => i.status === "connected");

    for (const integration of connectedIntegrations) {
      const accountConfigs = connected.filter(
        c => c.monday_account_id === integration.monday_account_id
      );
      groups.push({ integration, configs: accountConfigs });
    }

    // Group inactive boards by account
    const inactiveGroups: Record<string, BoardConfigWithAccess[]> = {};
    for (const config of inactive) {
      const key = config.monday_account_id || "unknown";
      if (!inactiveGroups[key]) inactiveGroups[key] = [];
      inactiveGroups[key].push(config);
    }

    return {
      connectedGroups: groups,
      inactiveBoards: inactive,
      groupedInactiveBoards: inactiveGroups,
    };
  }, [allConfigs, connectedAccountIds, disconnectedAccountIds, integrations]);

  const connectedIntegrations = useMemo(
    () => integrations.filter(i => i.status === "connected"),
    [integrations]
  );

  if (memberRole !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Only organization owners can configure boards.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Board Configuration</h1>
          <p className="text-muted-foreground">
            Configure Monday.com boards and member access
          </p>
        </div>
        {connectedIntegrations.length > 0 && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Board
          </Button>
        )}
      </div>

      {/* Connected Account Sections */}
      {connectedGroups.length === 0 && allConfigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No boards configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              {connectedIntegrations.length === 0
                ? "Connect a Monday.com account first, then add boards."
                : "Add your first Monday.com board to get started."}
            </p>
            {connectedIntegrations.length > 0 && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Board
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {connectedGroups.map(({ integration, configs }) => (
            <div key={integration.id} className="space-y-4">
              {/* Account section header */}
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                <h3 className="text-base font-semibold text-foreground">
                  {integrationDisplayName(integration)}
                </h3>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Connected
                </Badge>
              </div>

              {configs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                    No boards configured for this account yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {configs.map((config) => (
                    <BoardConfigCard
                      key={config.id}
                      config={config}
                      members={members}
                      onEdit={() => setEditingConfig(config)}
                      onDelete={() => deleteConfig(config.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disconnected / Orphaned Boards Section */}
      {inactiveBoards.length > 0 && (
        <Collapsible open={disconnectedExpanded} onOpenChange={setDisconnectedExpanded}>
          <div className="flex items-center gap-2 pt-4 border-t">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                {disconnectedExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="text-muted-foreground">
                  Boards from Disconnected Accounts ({inactiveBoards.length})
                </span>
              </Button>
            </CollapsibleTrigger>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    These boards belong to Monday.com accounts that are disconnected or removed.
                    Reconnect the account to sync data again.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CollapsibleContent>
            <div className="space-y-6 mt-4">
              {Object.entries(groupedInactiveBoards).map(([accountId, configsGroup]) => (
                <div key={accountId} className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Unplug className="h-4 w-4" />
                    {configsGroup[0]?.workspace_name || `Account: ${accountId}`}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {configsGroup.map(config => (
                      <InactiveBoardCard
                        key={config.id}
                        config={config}
                        onDelete={() => deleteConfig(config.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <AddBoardDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={refetch}
        connectedIntegrations={connectedIntegrations}
      />

      {editingConfig && (
        <EditBoardDialog
          open={!!editingConfig}
          onOpenChange={(open) => !open && setEditingConfig(null)}
          config={editingConfig}
          onSuccess={() => {
            setEditingConfig(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
