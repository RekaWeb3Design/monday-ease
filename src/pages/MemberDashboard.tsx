import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberTasks } from "@/hooks/useMemberTasks";
import { TaskStats } from "@/components/member/TaskStats";
import { TaskCard } from "@/components/member/TaskCard";
import { TaskListView } from "@/components/member/TaskListView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ClipboardList, LayoutList, LayoutGrid, List, Search, X, ChevronUp, ChevronDown } from "lucide-react";

export default function MemberDashboard() {
  const { profile } = useAuth();
  const { tasks, isLoading, error, refetch } = useMemberTasks();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  // Extract all unique columns from filtered tasks
  const allColumns = useMemo(() => {
    const cols: { id: string; title: string; type: string }[] = [];
    filteredTasks.forEach(task => {
      task.column_values.forEach(col => {
        if (!cols.find(c => c.id === col.id)) {
          cols.push({ id: col.id, title: col.title, type: col.type });
        }
      });
    });
    return cols;
  }, [filteredTasks]);

  // Search filter
  const searchedTasks = useMemo(() => {
    if (!searchQuery.trim()) return filteredTasks;
    const query = searchQuery.toLowerCase().trim();
    return filteredTasks.filter(task => {
      if (task.name.toLowerCase().includes(query)) return true;
      return task.column_values.some(cv => 
        cv.text && cv.text.toLowerCase().includes(query)
      );
    });
  }, [filteredTasks, searchQuery]);

  // Sort logic
  const sortedTasks = useMemo(() => {
    if (!sortColumn) return searchedTasks;
    
    return [...searchedTasks].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      if (sortColumn === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortColumn === "board") {
        aVal = a.board_name.toLowerCase();
        bVal = b.board_name.toLowerCase();
      } else {
        const aCol = a.column_values.find(cv => cv.id === sortColumn);
        const bCol = b.column_values.find(cv => cv.id === sortColumn);
        
        if (aCol?.type === "numbers" || aCol?.type === "numeric") {
          aVal = parseFloat(aCol?.text || "0") || 0;
          bVal = parseFloat(bCol?.text || "0") || 0;
        } else {
          aVal = (aCol?.text || "").toLowerCase();
          bVal = (bCol?.text || "").toLowerCase();
        }
      }
      
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchedTasks, sortColumn, sortDirection]);

  // Handle tab change - reset search & sort
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSortColumn(null);
    setSortDirection("asc");
  };

  // Handle sort toggle for list view headers
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

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
            className="border rounded-md"
          >
            <ToggleGroupItem 
              value="grid" 
              aria-label="Grid view" 
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="list" 
              aria-label="List view" 
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
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
        <Tabs value={activeTab} onValueChange={handleTabChange}>
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

      {/* Stats row - uses sorted (search-filtered) tasks */}
      <TaskStats tasks={sortedTasks} />

      {/* Search & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Result count (only when searching) */}
        {searchQuery && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Showing {sortedTasks.length} of {filteredTasks.length} tasks
          </span>
        )}
        
        {/* Sort controls (only in grid view) */}
        {viewMode === "grid" && (
          <div className="flex items-center gap-1">
            <Select 
              value={sortColumn || "none"} 
              onValueChange={(val) => {
                if (val === "none") {
                  setSortColumn(null);
                } else {
                  setSortColumn(val);
                  if (!sortColumn) setSortDirection("asc");
                }
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default order</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                {allColumns.map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {sortColumn && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
                className="h-9 w-9"
              >
                {sortDirection === "asc" ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Task view - uses sorted tasks */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              showBoardName={activeTab === "all"} 
            />
          ))}
        </div>
      ) : (
        <TaskListView 
          tasks={sortedTasks} 
          showBoardName={activeTab === "all"}
          allColumns={allColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      )}
    </div>
  );
}
