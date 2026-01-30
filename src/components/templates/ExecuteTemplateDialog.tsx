import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
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
import type { WorkflowTemplate, ExecutionResult } from "@/types";

interface ExecuteTemplateDialogProps {
  template: WorkflowTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type DialogState = "form" | "executing" | "success" | "error";

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
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

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
      setDialogState("form");
      setExecutionResult(null);
      setErrorMessage("");
    }
  }, [open]);

  const handleExecute = async () => {
    if (!template || !selectedBoardId) return;

    setDialogState("executing");
    setErrorMessage("");

    const inputParams = {
      board_id: selectedBoardId,
      task_name: taskName || undefined,
    };

    const result = await createExecution(template.id, inputParams);

    if (result && result.success) {
      setExecutionResult(result);
      setDialogState("success");
      onSuccess();
    } else {
      setErrorMessage(result?.error || "An unknown error occurred");
      setDialogState("error");
    }
  };

  const handleRunAnother = () => {
    setSelectedBoardId("");
    setTaskName("");
    setDialogState("form");
    setExecutionResult(null);
    setErrorMessage("");
  };

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Success state
  if (dialogState === "success" && executionResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Workflow Executed!</h3>
            <p className="text-muted-foreground mb-4">
              Completed in {formatExecutionTime(executionResult.execution_time_ms)}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleRunAnother}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Run Another
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (dialogState === "error") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Execution Failed</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {errorMessage}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleRunAnother}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Executing state
  if (dialogState === "executing") {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Executing Workflow...</h3>
            <p className="text-muted-foreground">
              Please wait while we process your request
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Form state (default)
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
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!selectedBoardId}
          >
            Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
