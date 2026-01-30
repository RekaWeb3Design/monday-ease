import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkflowExecutions } from "@/hooks/useWorkflowExecutions";
import { useAuth } from "@/hooks/useAuth";

function getStatusIcon(status: string) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-accent-foreground animate-spin" />;
    case "pending":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">Success</Badge>;
    case "failed":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs">Failed</Badge>;
    case "running":
      return <Badge className="bg-accent text-accent-foreground text-xs">Running</Badge>;
    case "pending":
      return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export function RecentActivity() {
  const { user } = useAuth();
  const { executions, isLoading } = useWorkflowExecutions();

  // Filter to only show current user's executions, limit to 5
  const userExecutions = executions
    .filter((exec) => exec.user_id === user?.id)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (userExecutions.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
          <div className="rounded-full bg-muted p-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <div className="space-y-2">
        {userExecutions.map((exec) => (
          <div
            key={exec.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            {getStatusIcon(exec.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {exec.workflow_templates?.name || "Unknown Workflow"}
              </p>
              <p className="text-xs text-muted-foreground">
                {exec.started_at
                  ? `${formatDistanceToNow(new Date(exec.started_at))} ago`
                  : "Just now"}
              </p>
            </div>
            {getStatusBadge(exec.status)}
          </div>
        ))}
      </div>
    </div>
  );
}
