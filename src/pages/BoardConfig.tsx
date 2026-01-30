import { useState } from "react";
import { Plus, Loader2, AlertCircle, LayoutGrid } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BoardConfigCard } from "@/components/boards/BoardConfigCard";
import { AddBoardDialog } from "@/components/boards/AddBoardDialog";

export default function BoardConfig() {
  const { memberRole } = useAuth();
  const { configs, isLoading, deleteConfig, refetch } = useBoardConfigs();
  const { members } = useOrganizationMembers();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

      <AddBoardDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
