import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberTasks } from "@/hooks/useMemberTasks";
import { TaskStats } from "@/components/member/TaskStats";
import { TaskCard } from "@/components/member/TaskCard";
import { TaskListView } from "@/components/member/TaskListView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, RefreshCw, ClipboardList, LayoutList, LayoutGrid, List } from "lucide-react";

export default function MemberDashboard() {
  const { profile } = useAuth();
  const { tasks, isLoading, error, refetch } = useMemberTasks();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const displayName = profile?.full_name || "there";

  // Extract unique boards from tasks
  const boards = useMemo(() => {
    const boardMap = new Map<string, string>();
    tasks.forEach(task => {
      if (!boardMap.has(task.board_id)) {
        boardMap.set(task.board_id, task.board_name);
      }
    });
    return Array.from(boardMap.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filter tasks based on active tab
  const filteredTasks = useMemo(() => {
    if (activeTab === "all") return tasks;
    return tasks.filter(task => task.board_id === activeTab);
  }, [tasks, activeTab]);

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
        <div className="flex items-center gap-2">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as "grid" | "list")}
          >
            <ToggleGroupItem value="grid" aria-label="Grid view" size="sm">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" size="sm">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      {boards.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutList className="mr-1.5 h-4 w-4" />
              All Tasks ({tasks.length})
            </TabsTrigger>
            {boards.map((board) => (
              <TabsTrigger 
                key={board.id} 
                value={board.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {board.name} ({tasks.filter(t => t.board_id === board.id).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Stats row - uses filtered tasks */}
      <TaskStats tasks={filteredTasks} />

      {/* Task view - uses filtered tasks */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              showBoardName={activeTab === "all"} 
            />
          ))}
        </div>
      ) : (
        <TaskListView 
          tasks={filteredTasks} 
          showBoardName={activeTab === "all"} 
        />
      )}
    </div>
  );
}
