import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Lock, LogOut, Loader2, AlertCircle, LayoutDashboard, Search, X, ChevronUp, ChevronDown, LayoutGrid, List, BarChart3, Columns3, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import mondayeaseLogo from "@/assets/mondayease_logo.png";
import type { ClientAuthResponse, ClientDashboardData } from "@/types";
import { clientItemsToTasks } from "@/lib/clientTaskAdapter";
import { TaskCard } from "@/components/member/TaskCard";
import { TaskListView } from "@/components/member/TaskListView";
import { TaskChartsView } from "@/components/member/TaskChartsView";
import { TaskKanbanView } from "@/components/member/TaskKanbanView";
import { TaskTimelineView } from "@/components/member/TaskTimelineView";

const SUPABASE_FUNCTIONS_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1";

type ClientViewMode = "table" | "grid" | "list" | "charts" | "kanban" | "timeline";

// Status color fallback map for consistent coloring
const STATUS_COLORS: Record<string, string> = {
  "Done": "#00CA72",
  "Working on it": "#FDAB3D",
  "Stuck": "#E2445C",
  "On Hold": "#579BFC",
  "Not Started": "#C4C4C4",
  "Pending": "#A25DDC",
  "Active": "#00CA72",
  "Sold": "#00CA72",
  "Rented": "#579BFC",
  "Draft": "#C4C4C4",
  "Under Contract": "#FDAB3D",
  "Off Market": "#E2445C",
  "For Sale": "#00CA72",
  "For Rent": "#579BFC",
};

// Type for a single board in the dashboard
type ClientBoard = ClientDashboardData["boards"][number];

// Safely extract boards from dashboard data
function extractBoards(data: ClientDashboardData | null): ClientBoard[] {
  if (!data) return [];
  if (!Array.isArray(data.boards)) return [];
  return data.boards;
}

export default function ClientDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [clientInfo, setClientInfo] = useState<ClientAuthResponse["client"] | null>(null);
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Search, sort, and view mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ClientViewMode>("table");

  const storageKey = `mondayease_client_${slug}`;

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem(storageKey);
      if (token) {
        try {
          await fetchDashboardData(token);
          setIsAuthenticated(true);
        } catch (err) {
          localStorage.removeItem(storageKey);
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsAuthenticating(true);

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/client-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Invalid password");
      }

      localStorage.setItem(storageKey, data.token);
      setClientInfo(data.client);
      setIsAuthenticated(true);
      await fetchDashboardData(data.token);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchDashboardData = async (token: string) => {
    setLoadingData(true);

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-client-dashboard`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        throw new Error("Session expired");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load dashboard");
      }

      const sanitizedData: ClientDashboardData = {
        ...data,
        companyName: data.companyName || "",
        boards: Array.isArray(data.boards) ? data.boards : [],
      };

      setDashboardData(sanitizedData);
      setClientInfo({
        id: "",
        companyName: sanitizedData.companyName,
        contactName: "",
        slug: slug || "",
      });
    } catch (err: any) {
      if (err.message === "Session expired") {
        localStorage.removeItem(storageKey);
        setIsAuthenticated(false);
        toast.error("Your session has expired. Please log in again.");
      }
      throw err;
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(storageKey);
    setIsAuthenticated(false);
    setDashboardData(null);
    setClientInfo(null);
    setPassword("");
    toast.success("Logged out successfully");
  };

  // Search filter function
  const getFilteredItems = (items: ClientDashboardData["boards"][number]["items"]) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => {
      if (item.name.toLowerCase().includes(query)) return true;
      return Object.values(item.column_values).some(cv => 
        cv?.text && cv.text.toLowerCase().includes(query)
      );
    });
  };

  // Sort function
  const getSortedItems = (items: ClientDashboardData["boards"][number]["items"]) => {
    if (!sortColumn) return items;
    
    return [...items].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      
      if (sortColumn === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        const aCol = a.column_values[sortColumn];
        const bCol = b.column_values[sortColumn];
        
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
  };

  // Sort toggle handler
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

  // Reset search and sort on tab change
  const handleTabChange = () => {
    setSearchQuery("");
    setSortColumn(null);
    setSortDirection("asc");
  };

  const getStatusBadge = (value: any, type: string) => {
    if (type !== "status" && type !== "color") return null;

    const text = value?.text || value?.label || "";
    if (!text) return null;

    const color = value?.label_style?.color || STATUS_COLORS[text] || "#C4C4C4";

    return (
      <span
        style={{
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}4D`,
        }}
        className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold min-w-[70px] whitespace-nowrap"
      >
        {text}
      </span>
    );
  };

  const renderCellValue = (value: any, type: string) => {
    if (value === undefined || value === null) {
      return <span className="text-muted-foreground">—</span>;
    }

    const statusBadge = getStatusBadge(value, type);
    if (statusBadge) return statusBadge;

    const text = value.text || value.label || "";
    if (!text) return <span className="text-muted-foreground">—</span>;

    return <span className="text-foreground/80 text-sm">{text}</span>;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password entry state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <img
                src={mondayeaseLogo}
                alt="MondayEase"
                className="h-10 mx-auto mb-4"
              />
              <CardTitle className="text-xl">Access Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Enter your password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      disabled={isAuthenticating}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isAuthenticating || !password}
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accessing...
                    </>
                  ) : (
                    "Access Dashboard"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <footer className="py-4 text-center text-sm text-muted-foreground">
          Powered by MondayEase
        </footer>
      </div>
    );
  }

  // Safely extract boards with fallback
  const boards = extractBoards(dashboardData);
  const hasBoards = boards.length > 0;

  // Dashboard state
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">
              {clientInfo?.companyName || dashboardData?.companyName || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Powered by MondayEase
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loadingData ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : !hasBoards ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Boards Available</h3>
              <p className="text-muted-foreground">
                No board data is currently available for your account.
              </p>
            </CardContent>
          </Card>
        ) : boards.length === 1 ? (
          <BoardTable
            board={boards[0]}
            renderCellValue={renderCellValue}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            handleSort={handleSort}
            getFilteredItems={getFilteredItems}
            getSortedItems={getSortedItems}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        ) : (
          <Tabs
            defaultValue={boards[0]?.boardId ?? "default"}
            className="w-full"
            onValueChange={handleTabChange}
          >
            <div className="border-b border-border mb-6">
              <TabsList className="bg-transparent h-auto p-0 space-x-6">
                {boards.map((board) => (
                  <TabsTrigger
                    key={board?.boardId ?? Math.random()}
                    value={board?.boardId ?? ""}
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none 
                               border-b-2 border-transparent data-[state=active]:border-primary 
                               rounded-none px-0 pb-3 pt-0
                               text-muted-foreground hover:text-foreground data-[state=active]:text-foreground 
                               data-[state=active]:font-semibold font-medium text-sm"
                  >
                    {board?.boardName ?? "Untitled Board"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {boards.map((board) => (
              <TabsContent key={board?.boardId ?? Math.random()} value={board?.boardId ?? ""}>
                <BoardTable
                  board={board}
                  renderCellValue={renderCellValue}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  handleSort={handleSort}
                  getFilteredItems={getFilteredItems}
                  getSortedItems={getSortedItems}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground border-t sm:hidden">
        Powered by MondayEase
      </footer>
    </div>
  );
}

// Board table component with defensive null checks
interface BoardTableProps {
  board: ClientBoard | null | undefined;
  renderCellValue: (value: any, type: string) => React.ReactNode;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  handleSort: (columnId: string) => void;
  getFilteredItems: (items: ClientDashboardData["boards"][number]["items"]) => ClientDashboardData["boards"][number]["items"];
  getSortedItems: (items: ClientDashboardData["boards"][number]["items"]) => ClientDashboardData["boards"][number]["items"];
  viewMode: ClientViewMode;
  setViewMode: (mode: ClientViewMode) => void;
}

function BoardTable({
  board,
  renderCellValue,
  searchQuery,
  setSearchQuery,
  sortColumn,
  sortDirection,
  handleSort,
  getFilteredItems,
  getSortedItems,
  viewMode,
  setViewMode,
}: BoardTableProps) {
  const columns = board?.columns ?? [];
  const items = board?.items ?? [];
  const boardName = board?.boardName ?? "Untitled Board";
  const hasNameColumn = columns.some((col) => col.id === "name");

  const filteredItems = getFilteredItems(items);
  const sortedItems = getSortedItems(filteredItems);

  // Convert to MondayTask format for alternate views
  const tasksForViews = useMemo(
    () => board ? clientItemsToTasks(sortedItems, board) : [],
    [sortedItems, board]
  );

  // Extract columns for list view
  const allColumns = useMemo(() => {
    return columns.map((c) => ({ id: c.id, title: c.title, type: c.type }));
  }, [columns]);

  if (!board) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">Board data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  // View mode toggle
  const ViewToggle = () => (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(v) => v && setViewMode(v as ClientViewMode)}
      className="border rounded-md"
    >
      <ToggleGroupItem value="table" aria-label="Table view" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid" aria-label="Grid view" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="charts" aria-label="Charts view" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <BarChart3 className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="kanban" aria-label="Kanban view" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <Columns3 className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="timeline" aria-label="Timeline view" size="sm" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
        <CalendarDays className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );

  // Search bar with view toggle
  const SearchBar = () => (
    <div className="px-4 pb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
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
        {searchQuery && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Showing {sortedItems.length} of {items.length}
          </span>
        )}
        <div className="sm:ml-auto">
          <ViewToggle />
        </div>
      </div>
    </div>
  );

  // Empty state
  if (!items.length) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No items to display</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state after search
  if (!sortedItems.length) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">{boardName}</CardTitle>
        </CardHeader>
        <SearchBar />
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? "No items match your search" : "No items to display"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Non-table views use member components
  if (viewMode !== "table") {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">{boardName}</CardTitle>
        </CardHeader>
        <SearchBar />
        <CardContent>
          {viewMode === "grid" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tasksForViews.map((task) => (
                <TaskCard key={task.id} task={task} showBoardName={false} />
              ))}
            </div>
          )}
          {viewMode === "list" && (
            <TaskListView
              tasks={tasksForViews}
              showBoardName={false}
              allColumns={allColumns}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
          {viewMode === "charts" && (
            <TaskChartsView tasks={tasksForViews} />
          )}
          {viewMode === "kanban" && (
            <TaskKanbanView tasks={tasksForViews} showBoardName={false} />
          )}
          {viewMode === "timeline" && (
            <TaskTimelineView tasks={tasksForViews} showBoardName={false} />
          )}
        </CardContent>
      </Card>
    );
  }

  // Table view (original)
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{boardName}</CardTitle>
      </CardHeader>
      <SearchBar />
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b">
                {!hasNameColumn && (
                  <TableHead
                    className="font-semibold text-muted-foreground uppercase text-xs tracking-wider py-3 px-4 cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Item
                      {sortColumn === "name" && (
                        sortDirection === "asc"
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col?.id ?? Math.random()}
                    className="font-semibold text-muted-foreground uppercase text-xs tracking-wider py-3 px-4 cursor-pointer hover:bg-muted/80 select-none"
                    onClick={() => handleSort(col.id)}
                  >
                    <div className="flex items-center gap-1">
                      {col?.title ?? ""}
                      {sortColumn === col.id && (
                        sortDirection === "asc"
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item, index) => (
                <TableRow
                  key={item?.id ?? Math.random()}
                  className={`border-b hover:bg-muted/30 transition-colors
                    ${index % 2 === 1 ? "bg-muted/20" : "bg-background"}`}
                >
                  {!hasNameColumn && (
                    <TableCell className="font-medium py-3 px-4">
                      {item?.name ?? "—"}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col?.id ?? Math.random()}
                      className={`py-3 px-4 ${col.id === "name" ? "font-medium" : ""}`}
                    >
                      {col.id === "name"
                        ? item?.name ?? "—"
                        : renderCellValue(item?.column_values?.[col?.id], col?.type ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
