import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMondayBoards } from "@/hooks/useMondayBoards";
import { useWorkflowExecutions } from "@/hooks/useWorkflowExecutions";
import type { WorkflowTemplate } from "@/types";

interface ExecuteTemplateDialogProps {
  template: WorkflowTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExecuteTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: ExecuteTemplateDialogProps) {
  const { boards, isLoading: boardsLoading, fetchBoards } = useMondayBoards();
  const { createExecution } = useWorkflowExecutions();

  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch boards when dialog opens
  useEffect(() => {
    if (open && boards.length === 0) {
      fetchBoards();
    }
  }, [open, boards.length, fetchBoards]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedBoardId("");
      setTaskName("");
      setIsExecuting(false);
    }
  }, [open]);

  const handleExecute = async () => {
    if (!template || !selectedBoardId) return;

    setIsExecuting(true);

    const inputParams = {
      board_id: selectedBoardId,
      task_name: taskName || undefined,
    };

    const success = await createExecution(template.id, inputParams);

    setIsExecuting(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run: {template?.name}</DialogTitle>
          <DialogDescription>
            Configure the workflow parameters below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="board">Board *</Label>
            <Select
              value={selectedBoardId}
              onValueChange={setSelectedBoardId}
              disabled={boardsLoading}
            >
              <SelectTrigger id="board">
                <SelectValue
                  placeholder={
                    boardsLoading ? "Loading boards..." : "Select a board..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskName">Task Name (optional)</Label>
            <Input
              id="taskName"
              placeholder="Enter a task name..."
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!selectedBoardId || isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              "Execute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
