import { useState } from "react";
import { Plus, LayoutGrid, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewCard } from "@/components/board-views/ViewCard";
import { CreateViewDialog } from "@/components/board-views/CreateViewDialog";
import { useCustomBoardViews } from "@/hooks/useCustomBoardViews";
import type { CustomBoardView, ViewColumn, ViewSettings } from "@/types";

export default function BoardViews() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<CustomBoardView | null>(null);

  const { views, isLoading, createView, updateView, deleteView } = useCustomBoardViews();

  const handleCreateSubmit = async (data: {
    name: string;
    description?: string;
    icon: string;
    monday_board_id: string;
    monday_board_name: string;
    selected_columns: ViewColumn[];
    settings: ViewSettings;
  }) => {
    if (editingView) {
      await updateView(editingView.id, data);
    } else {
      await createView(data);
    }
    setEditingView(null);
  };

  const handleEdit = (view: CustomBoardView) => {
    setEditingView(view);
    setCreateDialogOpen(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateView(id, { is_active: isActive });
  };

  const handleDelete = async (id: string) => {
    await deleteView(id);
  };

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setEditingView(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Board Views</h1>
          <p className="text-muted-foreground">
            Create custom views to display Monday.com data
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create View
        </Button>
      </div>

      {/* Views grid */}
      {views.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <LayoutGrid className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-semibold">No views yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4 text-center max-w-sm">
            Create custom board views to display specific columns from your Monday.com boards
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First View
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {views.map((view) => (
            <ViewCard
              key={view.id}
              view={view}
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <CreateViewDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleCreateSubmit}
        editingView={editingView}
      />
    </div>
  );
}
