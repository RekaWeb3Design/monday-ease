import { useState, useEffect } from "react";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMondayBoards } from "@/hooks/useMondayBoards";
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import type { MondayBoard, MondayColumn, OrganizationMember } from "@/types";

interface AddBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

export function AddBoardDialog({ open, onOpenChange, onSuccess }: AddBoardDialogProps) {
  const { boards, isLoading: boardsLoading, fetchBoards } = useMondayBoards();
  const { createConfig } = useBoardConfigs();
  const { members } = useOrganizationMembers();

  // Step state
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Selected board
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<MondayBoard | null>(null);

  // Step 2: Column configuration
  const [filterColumnId, setFilterColumnId] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Step 3: Member mappings
  const [memberMappings, setMemberMappings] = useState<Record<string, string>>({});

  // Fetch boards when dialog opens
  useEffect(() => {
    if (open && boards.length === 0) {
      fetchBoards();
    }
  }, [open, boards.length, fetchBoards]);

  // Update selected board when selection changes
  useEffect(() => {
    if (selectedBoardId) {
      const board = boards.find((b) => b.id === selectedBoardId);
      setSelectedBoard(board || null);
    } else {
      setSelectedBoard(null);
    }
  }, [selectedBoardId, boards]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedBoardId("");
      setSelectedBoard(null);
      setFilterColumnId("");
      setVisibleColumns([]);
      setMemberMappings({});
    }
  }, [open]);

  const handleVisibleColumnToggle = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleMemberMappingChange = (memberId: string, value: string) => {
    setMemberMappings((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBoard) return;

    setIsSubmitting(true);

    const filterColumn = selectedBoard.columns.find((c) => c.id === filterColumnId);

    const success = await createConfig({
      monday_board_id: selectedBoard.id,
      board_name: selectedBoard.name,
      filter_column_id: filterColumnId === 'none' ? null : filterColumnId || null,
      filter_column_name: filterColumn?.title || null,
      visible_columns: visibleColumns,
      memberMappings: Object.entries(memberMappings)
        .filter(([_, value]) => value.trim() !== "")
        .map(([member_id, filter_value]) => ({ member_id, filter_value })),
    });

    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      onSuccess();
    }
  };

  const canProceedStep1 = !!selectedBoardId;
  const canProceedStep2 = true; // Column config is optional
  const canSubmit = !!selectedBoard;

  // Filter members to show (exclude owner for mapping since they have full access)
  const mappableMembers = members.filter((m) => m.role !== "owner");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Board Configuration</DialogTitle>
          <DialogDescription>
            Step {step} of 3:{" "}
            {step === 1
              ? "Select a Monday.com board"
              : step === 2
              ? "Configure columns"
              : "Map members to filter values"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                s === step
                  ? "bg-primary"
                  : s < step
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* Step 1: Select Board */}
          {step === 1 && (
            <div className="space-y-4">
              {boardsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : boards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No boards found. Make sure Monday.com is connected.
                  </p>
                  <Button variant="outline" onClick={fetchBoards}>
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select Board</Label>
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
                              ({board.board_kind})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBoard && (
                    <p className="text-sm text-muted-foreground">
                      {selectedBoard.columns.length} columns available
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure Columns */}
          {step === 2 && selectedBoard && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Filter Column (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Members will only see rows where this column matches their assigned value.
                </p>
                <Select value={filterColumnId} onValueChange={setFilterColumnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (show all rows)</SelectItem>
                    {selectedBoard.columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.title} ({col.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visible Columns (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Select which columns members can see. Leave empty to show all.
                </p>
                <ScrollArea className="h-[180px] rounded-md border p-3">
                  <div className="space-y-2">
                    {selectedBoard.columns.map((col) => (
                      <div key={col.id} className="flex items-center gap-2">
                        <Checkbox
                          id={col.id}
                          checked={visibleColumns.includes(col.id)}
                          onCheckedChange={() => handleVisibleColumnToggle(col.id)}
                        />
                        <label
                          htmlFor={col.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {col.title}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({col.type})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 3: Map Members */}
          {step === 3 && (
            <div className="space-y-4">
              {mappableMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No team members to configure. Invite members first.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter the filter value each member should see. Leave blank to skip.
                  </p>
                  <ScrollArea className="h-[240px] rounded-md border p-3">
                    <div className="space-y-3">
                      {mappableMembers.map((member) => (
                        <div key={member.id} className="space-y-1">
                          <Label className="text-sm font-normal">
                            {member.display_name || member.email}
                          </Label>
                          <Input
                            placeholder="Filter value (e.g., member's name)"
                            value={memberMappings[member.id] || ""}
                            onChange={(e) =>
                              handleMemberMappingChange(member.id, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 && !canProceedStep1}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
