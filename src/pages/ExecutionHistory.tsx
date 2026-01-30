import { formatDistanceToNow } from "date-fns";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { useWorkflowExecutions } from "@/hooks/useWorkflowExecutions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Success</Badge>;
    case "failed":
      return <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Failed</Badge>;
    case "running":
      return <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">Running</Badge>;
    case "pending":
      return <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ExecutionHistory() {
  const { executions, isLoading, refetch } = useWorkflowExecutions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Execution History</h1>
          <p className="text-muted-foreground">
            Track your workflow execution results
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">No executions yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Run a workflow template to see execution history here.
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell className="font-medium">
                    {exec.workflow_templates?.name || "Unknown Template"}
                  </TableCell>
                  <TableCell>{getStatusBadge(exec.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {exec.started_at
                      ? `${formatDistanceToNow(new Date(exec.started_at))} ago`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(exec.execution_time_ms)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
