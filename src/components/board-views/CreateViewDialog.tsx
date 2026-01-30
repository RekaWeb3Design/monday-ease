import { useState, useEffect } from "react";
import { Check, Loader2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPicker } from "./IconPicker";
import { useMondayBoards } from "@/hooks/useMondayBoards";
import type { ViewColumn, ViewSettings, MondayColumn, CustomBoardView } from "@/types";
import { cn } from "@/lib/utils";

interface CreateViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    icon: string;
    monday_board_id: string;
    monday_board_name: string;
    selected_columns: ViewColumn[];
    settings: ViewSettings;
  }) => Promise<void>;
  editingView?: CustomBoardView | null;
}

const DEFAULT_SETTINGS: ViewSettings = {
  show_item_name: true,
  row_height: 'default',
  enable_search: true,
  enable_filters: true,
  default_sort_column: null,
  default_sort_order: 'asc',
};

export function CreateViewDialog({
  open,
  onOpenChange,
  onSubmit,
  editingView,
}: CreateViewDialogProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("table");

  // Step 2: Board selection
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedBoardName, setSelectedBoardName] = useState("");
  const [boardColumns, setBoardColumns] = useState<MondayColumn[]>([]);

  // Step 3: Column configuration
  const [selectedColumns, setSelectedColumns] = useState<ViewColumn[]>([]);

  // Step 4: Display settings
  const [settings, setSettings] = useState<ViewSettings>(DEFAULT_SETTINGS);

  const { boards, isLoading: boardsLoading, fetchBoards } = useMondayBoards();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editingView) {
        // Populate form for editing
        setName(editingView.name);
        setDescription(editingView.description || "");
        setIcon(editingView.icon);
        setSelectedBoardId(editingView.monday_board_id);
        setSelectedBoardName(editingView.monday_board_name || "");
        setSelectedColumns(editingView.selected_columns);
        setSettings(editingView.settings);
        setStep(1);
      } else {
        // Reset for new view
        setName("");
        setDescription("");
        setIcon("table");
        setSelectedBoardId("");
        setSelectedBoardName("");
        setBoardColumns([]);
        setSelectedColumns([]);
        setSettings(DEFAULT_SETTINGS);
        setStep(1);
      }
      fetchBoards();
    }
  }, [open, editingView, fetchBoards]);

  // Load columns when board is selected
  useEffect(() => {
    if (selectedBoardId && boards.length > 0) {
      const board = boards.find((b) => b.id === selectedBoardId);
      if (board) {
        setSelectedBoardName(board.name);
        setBoardColumns(board.columns || []);
      }
    }
  }, [selectedBoardId, boards]);

  const handleColumnToggle = (column: MondayColumn, checked: boolean) => {
    if (checked) {
      setSelectedColumns((prev) => [
        ...prev,
        { id: column.id, title: column.title, type: column.type, width: 150 },
      ]);
    } else {
      setSelectedColumns((prev) => prev.filter((c) => c.id !== column.id));
    }
  };

  const handleColumnWidthChange = (columnId: string, width: number) => {
    setSelectedColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, width } : c))
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description: description || undefined,
        icon,
        monday_board_id: selectedBoardId,
        monday_board_name: selectedBoardName,
        selected_columns: selectedColumns,
        settings,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return selectedBoardId.length > 0;
      case 3:
        return selectedColumns.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">View Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Weekly Tasks, Project Status"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this view"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Monday.com Board *</Label>
              {boardsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : boards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No boards found.</p>
                  <p className="text-sm mt-1">Connect to Monday.com first.</p>
                </div>
              ) : (
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        <div className="flex items-center gap-2">
                          <span>{board.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({board.columns?.length || 0} columns)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedBoardId && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">{selectedBoardName}</p>
                <p className="text-muted-foreground">
                  {boardColumns.length} columns available
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Columns to Display *</Label>
              <p className="text-sm text-muted-foreground">
                Choose which columns to show in this view
              </p>
            </div>
            <ScrollArea className="h-[300px] rounded-md border p-3">
              <div className="space-y-2">
                {boardColumns.map((column) => {
                  const isSelected = selectedColumns.some((c) => c.id === column.id);
                  const selectedCol = selectedColumns.find((c) => c.id === column.id);

                  return (
                    <div
                      key={column.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md transition-colors",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        id={column.id}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleColumnToggle(column, checked as boolean)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={column.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {column.title}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Type: {column.type}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Width:</Label>
                          <Input
                            type="number"
                            value={selectedCol?.width || 150}
                            onChange={(e) =>
                              handleColumnWidthChange(
                                column.id,
                                parseInt(e.target.value) || 150
                              )
                            }
                            className="w-16 h-7 text-xs"
                            min={50}
                            max={500}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <p className="text-sm text-muted-foreground">
              {selectedColumns.length} column{selectedColumns.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Item Name Column</Label>
                <p className="text-sm text-muted-foreground">
                  Display the item name as the first column
                </p>
              </div>
              <Switch
                checked={settings.show_item_name}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, show_item_name: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Row Height</Label>
              <Select
                value={settings.row_height}
                onValueChange={(value: 'compact' | 'default' | 'comfortable') =>
                  setSettings({ ...settings, row_height: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Search</Label>
                <p className="text-sm text-muted-foreground">
                  Show search bar above the table
                </p>
              </div>
              <Switch
                checked={settings.enable_search}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_search: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Filters</Label>
                <p className="text-sm text-muted-foreground">
                  Allow filtering by column values
                </p>
              </div>
              <Switch
                checked={settings.enable_filters}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_filters: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Default Sort Column</Label>
              <Select
                value={settings.default_sort_column || "none"}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    default_sort_column: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="name">Item Name</SelectItem>
                  {selectedColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Sort Order</Label>
              <Select
                value={settings.default_sort_order}
                onValueChange={(value: 'asc' | 'desc') =>
                  setSettings({ ...settings, default_sort_order: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending (A-Z)</SelectItem>
                  <SelectItem value="desc">Descending (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingView ? "Edit View" : "Create Board View"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4:{" "}
            {step === 1 && "Basic Information"}
            {step === 2 && "Select Board"}
            {step === 3 && "Configure Columns"}
            {step === 4 && "Display Settings"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 py-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="py-4">{renderStep()}</div>

        <DialogFooter className="flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingView ? "Save Changes" : "Create View"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
