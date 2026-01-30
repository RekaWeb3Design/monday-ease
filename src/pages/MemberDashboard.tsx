import { useAuth } from "@/hooks/useAuth";
import { useMemberTasks } from "@/hooks/useMemberTasks";
import { TaskStats } from "@/components/member/TaskStats";
import { TaskCard } from "@/components/member/TaskCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ClipboardList } from "lucide-react";

export default function MemberDashboard() {
  const { profile } = useAuth();
  const { tasks, isLoading, error, refetch } = useMemberTasks();

  const displayName = profile?.full_name?.split(" ")[0] || "there";

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your tasks...</p>
      </div>
    );
  }

  // Error state
  if (error && tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName}!
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-lg border border-dashed p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <ClipboardList className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Unable to load tasks</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {error}
            </p>
          </div>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName}!
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-lg border border-dashed p-8 text-center">
          <div className="rounded-full bg-muted p-3">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">No tasks assigned to you yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Once your team owner assigns you to tasks in Monday.com boards, 
              they'll appear here.
            </p>
          </div>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Tasks loaded successfully
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName}! Here are your assigned tasks.
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <TaskStats tasks={tasks} />

      {/* Task grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
