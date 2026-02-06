import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Lock, LogOut, Loader2, AlertCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

      setDashboardData(data);
      setClientInfo({
        id: "",
        companyName: data.companyName,
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

    // Map common status colors
    const colorMap: Record<string, string> = {
      "Done": "hsl(var(--monday-green))",
      "Working on it": "hsl(var(--monday-yellow))",
      "Stuck": "hsl(var(--monday-red))",
      "Not Started": "hsl(var(--muted))",
    };

    const bgColor = value?.label_style?.color || colorMap[text] || "hsl(var(--muted))";

    return (
      <Badge
        className="text-white"
        style={{ backgroundColor: bgColor }}
      >
        {text}
      </Badge>
    );
  };

  const renderCellValue = (value: any, type: string) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    // Handle status/color columns
    const statusBadge = getStatusBadge(value, type);
    if (statusBadge) return statusBadge;

    // Handle text
    const text = value.text || value.label || "";
    if (!text) return <span className="text-muted-foreground">-</span>;

    return <span>{text}</span>;
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

  // Dashboard state
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">
              {clientInfo?.companyName || dashboardData?.companyName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="hidden sm:flex">
              Powered by MondayEase
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {loadingData ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : !dashboardData?.boards?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Boards Available</h3>
              <p className="text-muted-foreground">
                No board data is currently available for your account.
              </p>
            </CardContent>
          </Card>
        ) : dashboardData.boards.length === 1 ? (
          // Single board - no tabs needed
          <BoardTable board={dashboardData.boards[0]} renderCellValue={renderCellValue} />
        ) : (
          // Multiple boards - show tabs
          <Tabs defaultValue={dashboardData.boards[0].boardId} className="w-full">
            <TabsList className="mb-4">
              {dashboardData.boards.map((board) => (
                <TabsTrigger key={board.boardId} value={board.boardId}>
                  {board.boardName}
                </TabsTrigger>
              ))}
            </TabsList>
            {dashboardData.boards.map((board) => (
              <TabsContent key={board.boardId} value={board.boardId}>
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

// Board table component
interface BoardTableProps {
  board: ClientDashboardData["boards"][0];
  renderCellValue: (value: any, type: string) => React.ReactNode;
}

function BoardTable({ board, renderCellValue }: BoardTableProps) {
  if (!board.items?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No items to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{board.boardName}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Item</TableHead>
                {board.columns.map((col) => (
                  <TableHead key={col.id} className="font-semibold">
                    {col.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {board.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {board.columns.map((col) => (
                    <TableCell key={col.id}>
                      {renderCellValue(item.column_values[col.id], col.type)}
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
