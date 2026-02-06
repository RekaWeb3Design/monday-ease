import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Lock, LogOut, Loader2, AlertCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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

const SUPABASE_FUNCTIONS_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1";

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
          // Token expired or invalid
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

      // Store token and client info
      localStorage.setItem(storageKey, data.token);
      setClientInfo(data.client);
      setIsAuthenticated(true);

      // Fetch dashboard data
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

      // Ensure boards is always an array
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

  const getStatusBadge = (value: any, type: string) => {
    if (type !== "status" && type !== "color") return null;

    const text = value?.text || value?.label || "";
    if (!text) return null;

    const bgColor = value?.label_style?.color || STATUS_COLORS[text] || "#C4C4C4";

    return (
      <span
        className="inline-flex items-center justify-center text-white text-xs font-semibold rounded-full py-1 px-3"
        style={{
          backgroundColor: bgColor,
          minWidth: "70px",
          textShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      >
        {text}
      </span>
    );
  };

  const renderCellValue = (value: any, type: string) => {
    if (value === undefined || value === null) {
      return <span className="text-gray-300">—</span>;
    }

    // Handle status/color columns
    const statusBadge = getStatusBadge(value, type);
    if (statusBadge) return statusBadge;

    // Handle text
    const text = value.text || value.label || "";
    if (!text) return <span className="text-gray-300">—</span>;

    return <span className="text-gray-700 text-sm">{text}</span>;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Password entry state - shown when NOT authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Centered content */}
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

        {/* Footer */}
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
          // Single board - no tabs needed
          <BoardTable board={boards[0]} renderCellValue={renderCellValue} />
        ) : (
          // Multiple boards - show tabs with custom styling
          <Tabs defaultValue={boards[0]?.boardId ?? "default"} className="w-full">
            <div className="border-b border-gray-200 mb-6">
              <TabsList className="bg-transparent h-auto p-0 space-x-6">
                {boards.map((board) => (
                  <TabsTrigger
                    key={board?.boardId ?? Math.random()}
                    value={board?.boardId ?? ""}
                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none 
                               border-b-2 border-transparent data-[state=active]:border-primary 
                               rounded-none px-0 pb-3 pt-0
                               text-gray-500 hover:text-gray-700 data-[state=active]:text-gray-900 
                               data-[state=active]:font-semibold font-medium text-sm"
                  >
                    {board?.boardName ?? "Untitled Board"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {boards.map((board) => (
              <TabsContent key={board?.boardId ?? Math.random()} value={board?.boardId ?? ""}>
                <BoardTable board={board} renderCellValue={renderCellValue} />
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
}

function BoardTable({ board, renderCellValue }: BoardTableProps) {
  // Early return if board is malformed
  if (!board) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">Board data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  // Safe extraction with fallbacks
  const columns = board.columns ?? [];
  const items = board.items ?? [];
  const boardName = board.boardName ?? "Untitled Board";

  // Check if "name" is in visible columns (from board config)
  const hasNameColumn = columns.some((col) => col.id === "name");

  if (!items.length) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No items to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-800">{boardName}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-100">
                {/* Only show Item column if "name" is NOT in visible columns */}
                {!hasNameColumn && (
                  <TableHead className="font-semibold text-gray-600 uppercase text-xs tracking-wider py-3 px-4">
                    Item
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col?.id ?? Math.random()}
                    className="font-semibold text-gray-600 uppercase text-xs tracking-wider py-3 px-4"
                  >
                    {col?.title ?? ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={item?.id ?? Math.random()}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${index % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}
                >
                  {/* Only show Item cell if "name" is NOT in visible columns */}
                  {!hasNameColumn && (
                    <TableCell className="font-medium text-gray-900 py-3 px-4">
                      {item?.name ?? "—"}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={col?.id ?? Math.random()}
                      className={`py-3 px-4 ${col.id === "name" ? "font-medium text-gray-900" : ""}`}
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
