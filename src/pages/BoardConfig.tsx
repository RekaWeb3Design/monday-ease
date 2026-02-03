import { useState, useMemo } from "react";
import { Plus, Loader2, AlertCircle, LayoutGrid, ChevronRight, ChevronDown, Info, Building2, Link } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useIntegration } from "@/hooks/useIntegration";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BoardConfigCard } from "@/components/boards/BoardConfigCard";
import { InactiveBoardCard } from "@/components/boards/InactiveBoardCard";
import { AddBoardDialog } from "@/components/boards/AddBoardDialog";
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

export default function BoardConfig() {
  const { memberRole } = useAuth();
  const { configs, inactiveConfigs, isLoading, deleteConfig, refetch } = useBoardConfigs();
  const { members } = useOrganizationMembers();
  const { integration } = useIntegration();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  // Group inactive configs by monday_account_id
  const groupedInactiveConfigs = useMemo(() => {
    const groups: Record<string, typeof inactiveConfigs> = {};
    inactiveConfigs.forEach(config => {
      const accountId = config.monday_account_id || 'unknown';
      if (!groups[accountId]) {
        groups[accountId] = [];
      }
      groups[accountId].push(config);
    });
    return groups;
  }, [inactiveConfigs]);

  // Owner-only protection
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
          {/* Connected workspace indicator */}
          {integration?.workspace_name && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Link className="h-4 w-4 text-[#01cb72]" />
              <span>Connected to:</span>
              <span className="font-medium text-foreground">
                {integration.workspace_name}
              </span>
            </div>
          )}
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Board
        </Button>
      </div>

      {/* Empty State or Grid */}
      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No boards configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first Monday.com board to get started.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <BoardConfigCard
              key={config.id}
              config={config}
              members={members}
              onEdit={() => {
                // TODO: Implement edit dialog
                console.log("Edit config:", config.id);
              }}
              onDelete={() => deleteConfig(config.id)}
            />
          ))}
        </div>
      )}

      {/* Inactive Boards Section */}
      {inactiveConfigs.length > 0 && (
        <Collapsible open={inactiveExpanded} onOpenChange={setInactiveExpanded}>
          <div className="flex items-center gap-2 pt-4 border-t">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                {inactiveExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="text-muted-foreground">
                  Boards from Other Accounts ({inactiveConfigs.length})
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
                    These boards were configured with a different Monday.com account.
                    Switch accounts to manage them.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CollapsibleContent>
            <div className="space-y-6 mt-4">
              {Object.entries(groupedInactiveConfigs).map(([accountId, configsGroup]) => (
                <div key={accountId} className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {/* Show workspace name if available, fall back to account ID */}
                    {configsGroup[0]?.workspace_name || `Account: ${accountId}`}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {configsGroup.map(config => (
                      <InactiveBoardCard key={config.id} config={config} />
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
      />
    </div>
  );
}
